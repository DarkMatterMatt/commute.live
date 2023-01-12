import { type JSONSerializable, sum } from "@commutelive/common";
import { parseEnum, RollingAverage } from "~/helpers";
import { getLogger } from "~/log";
import { CongestionLevel, OccupancyStatus, type Position, type StopTimeUpdate, type TripDescriptor, TripDescriptor$ScheduleRelationship, type TripUpdate, type TripUpdate$StopTimeEvent, TripUpdate$StopTimeUpdate$ScheduleRelationship, type VehicleDescriptor, type VehiclePosition, VehicleStopStatus } from "~/types";
import { queryApi } from "./api.js";
import type { FeedEntity as FeedEntityV1, FeedMessage as FeedMessageV1, Position as PositionV1, TripDescriptor as TripDescriptorV1, TripUpdate_StopTimeEvent as TripUpdate_StopTimeEventV1, TripUpdate_StopTimeUpdate as TripUpdate_StopTimeUpdateV1, TripUpdate as TripUpdateV1, VehicleDescriptor as VehicleDescriptorV1, VehiclePosition as VehiclePositionV1 } from "./gtfs-realtime.proto.js";
import type { FeedEntity as FeedEntityV2, FeedMessage as FeedMessageV2, Position as PositionV2, TripDescriptor as TripDescriptorV2, TripUpdate_StopTimeEvent as TripUpdate_StopTimeEventV2, TripUpdate_StopTimeUpdate as TripUpdate_StopTimeUpdateV2, TripUpdate as TripUpdateV2, VehicleDescriptor as VehicleDescriptorV2, VehiclePosition as VehiclePositionV2 } from "./gtfs-realtime_v2.proto.js";

const log = getLogger("AUSSYD/realtime/poll");

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

let realtimeApiUrls: [string, (buf: Uint8Array) => FeedMessageV1 | FeedMessageV2][];
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

async function processUrl(
    url: string,
    decode: (buf: Uint8Array) => FeedMessageV1 | FeedMessageV2,
): Promise<number> {
    try {
        const updates = await queryApiAndDecode(url, decode);
        return sum(updates.map(u => onMessage(u) ? 1 : 0));
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
        const updated = sum(await Promise.all(realtimeApiUrls.map(([url, decode]) => processUrl(url, decode))));
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
    realtimeApiUrls_: [string, (buf: Uint8Array) => FeedMessageV1 | FeedMessageV2][],
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
function onMessage(data: FeedEntityV1 | FeedEntityV2): boolean {
    // NOTE: AT sometimes incorrectly uses camelCase keys, string timestamps, and string enums

    const { id: _id, trip_update, vehicle, alert: _alert } = data;

    if (trip_update != null) {
        const tu = fixTripUpdate(trip_update); // result is null if tu.trip is null.
        if (tu == null) {
            return false;
        }
        const added = addTripUpdate(tu);
        if (added && trip_update.timestamp != null) {
            recentTripUpdatesAverageAge.add(Date.now() - (trip_update.timestamp * 1000));
        }
        return added;
    }

    if (vehicle != null) {
        const vp = fixVehiclePosition(vehicle);
        const added = addVehicleUpdate(vp);
        if (added && vehicle.timestamp != null) {
            recentVehiclePositionsAverageAge.add(Date.now() - (vehicle.timestamp * 1000));
        }
        return added;
    }

    return false;
}

function fixPosition(p: PositionV1 | PositionV2): Position {
    const { bearing, latitude, longitude, odometer, speed } = p;

    const output: Position = {
        latitude,
        longitude,
    };
    if (bearing != null && bearing !== 0) output.bearing = (bearing + 360) % 360;
    if (odometer != null) output.odometer = odometer;
    if (speed != null) output.speed = speed;
    return output;
}

function fixStopTimeEvent(ste: TripUpdate_StopTimeEventV1 | TripUpdate_StopTimeEventV2): TripUpdate$StopTimeEvent {
    const { delay, time, uncertainty } = ste;

    const output: TripUpdate$StopTimeEvent = {};
    if (delay != null) output.delay = delay;
    if (time != null) output.time = time;
    if (uncertainty != null) output.uncertainty = uncertainty;
    return output;
}

function fixStopTimeUpdate(stu: TripUpdate_StopTimeUpdateV1 | TripUpdate_StopTimeUpdateV2): StopTimeUpdate {
    const { arrival, departure, schedule_relationship, stop_id, stop_sequence } = stu;

    const output: StopTimeUpdate = {};
    if (arrival != null) output.arrival = fixStopTimeEvent(arrival);
    if (departure != null) output.departure = fixStopTimeEvent(departure);
    if (schedule_relationship != null) {
        output.schedule_relationship = parseEnum(
            TripUpdate$StopTimeUpdate$ScheduleRelationship, schedule_relationship);
    }
    if (stop_id != null) output.stop_id = stop_id;
    if (stop_sequence != null) output.stop_sequence = stop_sequence;
    return output;
}

function fixTrip(t: TripDescriptorV1 | TripDescriptorV2): TripDescriptor {
    const { direction_id, route_id, schedule_relationship, start_date, start_time, trip_id } = t;

    const output: TripDescriptor = {};
    if (direction_id != null) output.direction_id = direction_id;
    if (route_id != null) output.route_id = route_id;
    if (schedule_relationship != null) {
        try {
            output.schedule_relationship = parseEnum(TripDescriptor$ScheduleRelationship, schedule_relationship);
        }
        catch { /* ignore */ }
    }
    if (start_date != null) output.start_date = start_date;
    if (start_time != null) output.start_time = start_time;
    if (trip_id != null) output.trip_id = trip_id;
    return output;
}

export function fixTripUpdate(tu: TripUpdateV1 | TripUpdateV2): null | TripUpdate {
    const { delay, stop_time_update, timestamp, trip, vehicle } = tu;

    if (trip == null) {
        return null;
    }

    const output: TripUpdate = {
        stop_time_update: stop_time_update.map(fixStopTimeUpdate),
        trip: fixTrip(trip),
    };
    if (delay != null) output.delay = delay;
    if (timestamp != null) output.timestamp = timestamp;
    if (vehicle != null) output.vehicle = fixVehicleDescriptor(vehicle);
    return output;
}

function fixVehicleDescriptor(vd: VehicleDescriptorV1 | VehicleDescriptorV2): VehicleDescriptor {
    const { id, label, license_plate } = vd;

    const output: VehicleDescriptor = {};
    if (id != null) output.id = id;
    if (label != null) output.label = label;
    if (license_plate != null) output.license_plate = license_plate;
    return output;
}

export function fixVehiclePosition(vp: VehiclePositionV1 | VehiclePositionV2): VehiclePosition {
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
    if (congestion_level != null) output.congestion_level = parseEnum(CongestionLevel, congestion_level);
    if (current_status != null) output.current_status = parseEnum(VehicleStopStatus, current_status);
    if (current_stop_sequence != null) output.current_stop_sequence = current_stop_sequence;
    if (occupancy_status != null) output.occupancy_status = parseEnum(OccupancyStatus, occupancy_status);
    if (position != null) output.position = fixPosition(position);
    if (stop_id != null) output.stop_id = stop_id;
    if (timestamp != null) output.timestamp = timestamp;
    if (trip != null) output.trip = fixTrip(trip);
    if (vehicle != null) output.vehicle = fixVehicleDescriptor(vehicle);
    return output;
}
