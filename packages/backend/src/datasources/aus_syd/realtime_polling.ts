import { type JSONSerializable, type Primitive, sum, timedMemo } from "@commutelive/common";
import { parseEnum, RollingAverage } from "~/helpers";
import { getLogger } from "~/log";
import { CongestionLevel, OccupancyStatus, type Position, type StopTimeUpdate, type TripDescriptor, TripDescriptor$ScheduleRelationship, type TripUpdate, type TripUpdate$StopTimeEvent, TripUpdate$StopTimeUpdate$ScheduleRelationship, type VehicleDescriptor, type VehiclePosition, VehicleStopStatus } from "~/types";
import { queryApi } from "./api";
import type { FeedEntity as FeedEntityV1, FeedMessage as FeedMessageV1, Position as PositionV1, TripDescriptor as TripDescriptorV1, TripUpdate_StopTimeEvent as TripUpdate_StopTimeEventV1, TripUpdate_StopTimeUpdate as TripUpdate_StopTimeUpdateV1, TripUpdate as TripUpdateV1, VehicleDescriptor as VehicleDescriptorV1, VehiclePosition as VehiclePositionV1 } from "./gtfs-realtime.proto";
import type { FeedEntity as FeedEntityV2, FeedMessage as FeedMessageV2, Position as PositionV2, TripDescriptor as TripDescriptorV2, TripUpdate_StopTimeEvent as TripUpdate_StopTimeEventV2, TripUpdate_StopTimeUpdate as TripUpdate_StopTimeUpdateV2, TripUpdate as TripUpdateV2, VehicleDescriptor as VehicleDescriptorV2, VehiclePosition as VehiclePositionV2 } from "./gtfs-realtime_v2.proto";
import { getDatabase } from "./static";
import { getDirectionIdByTripId } from "./static_queries";

const log = getLogger("AUSSYD/realtime/poll");

type Booleaned_<T> = {
    [K in keyof T]: T[K] extends any[]
        ? T[K] extends Primitive[]
            ? boolean
            : false | Booleaned_<NonNullable<T[K][number]>>
        : T[K] extends Primitive
            ? boolean
            : false | Booleaned_<NonNullable<T[K]>>
};
export type Booleaned<T> = Booleaned_<NonNullable<T>>;

export interface NSWSourceOpts {
    hasBearing: boolean;
    hasDirectionId: boolean;
}

export type NSWSource = {
    url: string,
    decode: (buf: Uint8Array) => FeedMessageV1,
    keep: Booleaned<FeedEntityV1>,
} | {
    url: string,
    decode: (buf: Uint8Array) => FeedMessageV2,
    keep: Booleaned<FeedEntityV2>,
};

let addTripUpdate: (tripUpdate: TripUpdate) => boolean;

let addVehicleUpdate: (vehicleUpdate: VehiclePosition) => boolean;

const recentTripUpdatesAverageAge = new RollingAverage({
    windowType: "time",
    windowSize: 2 * 60 * 1000,
});

const recentVehiclePositionsAverageAge = new RollingAverage({
    windowType: "time",
    windowSize: 2 * 60 * 1000,
});

let realtimeApiUrls: NSWSource[];
let updateInProgress = false;
let lastSuccessfulUpdate = 0;

function shouldPoll(): boolean {
    return true;
}

export async function getStatus(): Promise<JSONSerializable> {
    return {
        lastSuccessfulUpdate,
        shouldPoll: shouldPoll(),
        recentTripUpdatesAverageAge: recentTripUpdatesAverageAge.getAverage(),
        recentVehiclePositionsAverageAge: recentVehiclePositionsAverageAge.getAverage(),
    };
}

const memoGetDirectionIdByTripId = timedMemo((tripId: string) => {
    try {
        return getDirectionIdByTripId(getDatabase(), tripId);
    }
    catch (err) {
        if (err instanceof Error && err.message.startsWith("Could not find trip")) {
            return null;
        }
        throw err;
    }
}, 24 * 60 * 1000);

async function queryApiAndDecode(
    url: string,
    decode: (buf: Uint8Array) => FeedMessageV1 | FeedMessageV2,
): Promise<FeedEntityV1[] | FeedEntityV2[]> {
    const res = await queryApi(url);
    if (res.status !== 200) {
        throw new Error(`Got status ${res.status} from ${url}`);
    }
    return decode(new Uint8Array(await res.arrayBuffer())).entity;
}

async function processUrl({ url, decode, keep }: NSWSource): Promise<number> {
    try {
        const updates = await queryApiAndDecode(url, decode);
        return sum(updates.map(u => onMessage(u, keep) ? 1 : 0));
    }
    catch (err) {
        if (err instanceof Error && err.message.startsWith("Got status 503")) {
            // we (sadly) expect to receive 503 errors
            log.warn("Error looking for realtime updates", err.message);
        }
        else {
            log.error("Error looking for realtime updates", url, err);
        }
        return 0;
    }
}

export async function checkForRealtimeUpdate(): Promise<boolean> {
    if (!shouldPoll()) {
        return false;
    }
    if (updateInProgress) {
        return false;
    }
    if (lastSuccessfulUpdate > Date.now() - (12 * 1000)) {
        // don't poll more than once every 12 seconds
        return false;
    }
    updateInProgress = true;

    try {
        const updated = sum(await Promise.all(realtimeApiUrls.map(processUrl)));
        if (updated === 0) {
            return false;
        }

        // received updates
        lastSuccessfulUpdate = Date.now();
        return true;
    }
    finally {
        updateInProgress = false;
    }
}

export async function initialize(
    realtimeApiUrls_: NSWSource[],
    addTripUpdate_: (tripUpdate: TripUpdate) => boolean,
    addVehicleUpdate_: (vehicleUpdate: VehiclePosition) => boolean,
): Promise<void> {
    realtimeApiUrls = realtimeApiUrls_;
    addTripUpdate = addTripUpdate_;
    addVehicleUpdate = addVehicleUpdate_;
}

/**
 * Received a message.
 */
function onMessage(
    data: FeedEntityV1 | FeedEntityV2,
    keep: Booleaned<FeedEntityV1 | FeedEntityV2>,
): boolean {
    // NOTE: NSW sometimes provides incorrect bearing & directionIds

    const { id: _id, trip_update, vehicle, alert: _alert } = data;

    if (keep.trip_update && trip_update != null) {
        const tu = fixTripUpdate(trip_update, keep.trip_update); // result is null if tu.trip is null.
        if (tu == null) {
            return false;
        }
        const added = addTripUpdate(tu);
        if (added && trip_update.timestamp != null) {
            recentTripUpdatesAverageAge.add(Date.now() - (trip_update.timestamp * 1000));
        }
        return added;
    }

    if (keep.vehicle && vehicle != null) {
        const vp = fixVehiclePosition(vehicle, keep.vehicle);
        const added = addVehicleUpdate(vp);
        if (added && vehicle.timestamp != null) {
            recentVehiclePositionsAverageAge.add(Date.now() - (vehicle.timestamp * 1000));
        }
        return added;
    }

    return false;
}

function fixPosition(
    p: PositionV1 | PositionV2,
    keep: Booleaned<PositionV1 | PositionV2>,
): Position {
    const { bearing, latitude, longitude, odometer, speed } = p;

    const output: Position = {
        latitude,
        longitude,
    };
    if (keep.bearing && bearing != null) output.bearing = (bearing + 360) % 360;
    if (keep.odometer && odometer != null) output.odometer = odometer;
    if (keep.speed && speed != null) output.speed = speed;
    return output;
}

function fixStopTimeEvent(
    ste: TripUpdate_StopTimeEventV1 | TripUpdate_StopTimeEventV2,
    keep: Booleaned<TripUpdate_StopTimeEventV1 | TripUpdate_StopTimeEventV2>,
): TripUpdate$StopTimeEvent {
    const { delay, time, uncertainty } = ste;

    const output: TripUpdate$StopTimeEvent = {};
    if (keep.delay && delay != null) output.delay = delay;
    if (keep.time && time != null) output.time = time;
    if (keep.uncertainty && uncertainty != null) output.uncertainty = uncertainty;
    return output;
}

function fixStopTimeUpdate(
    stu: TripUpdate_StopTimeUpdateV1 | TripUpdate_StopTimeUpdateV2,
    keep: Booleaned<TripUpdate_StopTimeUpdateV1 | TripUpdate_StopTimeUpdateV2>,
): StopTimeUpdate {
    const { arrival, departure, schedule_relationship, stop_id, stop_sequence } = stu;

    const output: StopTimeUpdate = {};
    if (keep.arrival && arrival != null) output.arrival = fixStopTimeEvent(arrival, keep.arrival);
    if (keep.departure && departure != null) output.departure = fixStopTimeEvent(departure, keep.departure);
    if (keep.schedule_relationship && schedule_relationship != null) {
        output.schedule_relationship = parseEnum(TripUpdate$StopTimeUpdate$ScheduleRelationship, schedule_relationship);
    }
    if (keep.stop_id && stop_id != null) output.stop_id = stop_id;
    if (keep.stop_sequence && stop_sequence != null) output.stop_sequence = stop_sequence;
    return output;
}

function fixTrip(
    t: TripDescriptorV1 | TripDescriptorV2,
    keep: Booleaned<TripDescriptorV1 | TripDescriptorV2>,
): TripDescriptor {
    const { direction_id, route_id, schedule_relationship, start_date, start_time, trip_id } = t;

    const output: TripDescriptor = {};
    if (keep.direction_id && direction_id != null) {
        output.direction_id = direction_id;
    }
    else if (keep.trip_id && trip_id != null) {
        const result = memoGetDirectionIdByTripId(trip_id);
        if (result != null) output.direction_id = result;
    }
    if (keep.route_id && route_id != null) output.route_id = route_id;
    if (keep.schedule_relationship && schedule_relationship != null) {
        try {
            output.schedule_relationship = parseEnum(TripDescriptor$ScheduleRelationship, schedule_relationship);
        }
        catch { /* ignore */ }
    }
    if (keep.start_date && start_date != null) output.start_date = start_date;
    if (keep.start_time && start_time != null) output.start_time = start_time;
    if (keep.trip_id && trip_id != null) output.trip_id = trip_id;
    return output;
}

export function fixTripUpdate(
    tu: TripUpdateV1 | TripUpdateV2,
    keep: Booleaned<TripUpdateV1 | TripUpdateV2>,
): null | TripUpdate {
    const { delay, stop_time_update, timestamp, trip, vehicle } = tu;

    if (!keep.trip || trip == null) {
        return null;
    }

    const keepStopTimeUpdate = keep.stop_time_update;
    const output: TripUpdate = {
        stop_time_update: keepStopTimeUpdate
            ? stop_time_update.map(stu => fixStopTimeUpdate(stu, keepStopTimeUpdate))
            : [],
        trip: fixTrip(trip, keep.trip),
    };
    if (keep.delay && delay != null) output.delay = delay;
    if (keep.timestamp&&timestamp != null) output.timestamp = timestamp;
    if (keep.vehicle && vehicle != null) output.vehicle = fixVehicleDescriptor(vehicle, keep.vehicle);
    return output;
}

function fixVehicleDescriptor(
    vd: VehicleDescriptorV1 | VehicleDescriptorV2,
    keep: Booleaned<VehicleDescriptorV1 | VehicleDescriptorV2>,
): VehicleDescriptor {
    const { id, label, license_plate } = vd;

    const output: VehicleDescriptor = {};
    if (keep.id && id  != null) output.id = id;
    if (keep.label && label != null) output.label = label;
    if (keep.license_plate && license_plate != null) output.license_plate = license_plate;
    return output;
}

export function fixVehiclePosition(
    vp: VehiclePositionV1 | VehiclePositionV2,
    keep: Booleaned<VehiclePositionV1 | VehiclePositionV2>,
): VehiclePosition {
    const {
        congestion_level,
        current_status,
        current_stop_sequence,
        occupancy_status,
        position,
        stop_id,
        timestamp,
        trip,
        vehicle,
    } = vp;

    const output: VehiclePosition = {};
    if (keep.congestion_level && congestion_level != null) {
        output.congestion_level = parseEnum(CongestionLevel, congestion_level);
    }
    if (keep.current_status && current_status != null) {
        output.current_status = parseEnum(VehicleStopStatus, current_status);
    }
    if (keep.current_stop_sequence && current_stop_sequence != null) {
        output.current_stop_sequence = current_stop_sequence;
    }
    if (keep.occupancy_status && occupancy_status != null) {
        output.occupancy_status = parseEnum(OccupancyStatus, occupancy_status);
    }
    if (keep.position && position != null) output.position = fixPosition(position, keep.position);
    if (keep.stop_id && stop_id != null) output.stop_id = stop_id;
    if (keep.timestamp && timestamp != null) output.timestamp = timestamp;
    if (keep.trip && trip != null) output.trip = fixTrip(trip, keep.trip);
    if (keep.vehicle && vehicle != null) output.vehicle = fixVehicleDescriptor(vehicle, keep.vehicle);
    return output;
}
