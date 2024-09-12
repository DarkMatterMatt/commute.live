import type { JSONSerializable } from "@commutelive/common";
import { MultiPersistentWebSocket, parseEnum, RollingAverageByTime } from "~/helpers/";
import { getLogger } from "~/log";
import type { FeedEntity, Position, StopTimeUpdate, TripDescriptor, TripUpdate, TripUpdate$StopTimeEvent, VehicleDescriptor, VehiclePosition } from "~/types";
import { CongestionLevel, OccupancyStatus, TripDescriptor$ScheduleRelationship, TripUpdate$StopTimeUpdate$ScheduleRelationship, VehicleStopStatus } from "~/types/";

/**
 * Restart delay for first WebSocket error is 200ms, for the third error it is 8s, etc.
 */
const RESTART_DELAY = [200, 3000, 8000, 20_000, 40_000, 60_000, 90_000, 120_000];

const log = getLogger("NZLAKL/realtime/ws");

let mpws: MultiPersistentWebSocket;
const consecutiveErrors: number[] = [];

let addTripUpdate: (tripUpdate: TripUpdate) => boolean;

let addVehicleUpdate: (vehicleUpdate: VehiclePosition) => boolean;

const recentTripUpdatesAverageAge = new RollingAverageByTime(2 * 60 * 1000);

const recentVehiclePositionsAverageAge = new RollingAverageByTime(2 * 60 * 1000);

export async function getStatus(): Promise<JSONSerializable> {
    return {
        readyState: getReadyState(),
        lastReceiveTime: mpws.getLastReceive(),
        consecutiveErrors,
        recentTripUpdatesAverageAge: recentTripUpdatesAverageAge.getAverage(),
        recentVehiclePositionsAverageAge: recentVehiclePositionsAverageAge.getAverage(),
    };
}

export function getReadyState(): number {
    return mpws.readyState;
}

/**
 * The WebSocket closed (we should probably restart it).
 */
function onClose(wsIdx: number, code: number, reason: string): undefined | number {
    log.debug(`WebSocket[${wsIdx}] closed.`, `Code ${code}, restarting in 500ms`, reason);
    return 500;
}

/**
 * An error occurred and the WebSocket will be restarted.
 */
function onError(wsIdx: number, err: Error): undefined | number {
    consecutiveErrors[wsIdx]++;
    const delay = RESTART_DELAY[Math.min(consecutiveErrors[wsIdx], RESTART_DELAY.length - 1)];

    const errToLog = err.message.includes("Unexpected server response") ? err.message : err;
    log.warn(`WebSocket[${wsIdx}] errored.`,
        `${consecutiveErrors[wsIdx]} consecutive errors, restarting in ${delay}ms.`, errToLog);
    return delay;
}

/**
 * Received a message.
 */
function onMessage(wsIdx: number, data_: string): void {
    // NOTE: AT's WebSocket incorrectly uses camelCase keys, string timestamps, and string enums
    const data: FeedEntity & Record<string, any> = JSON.parse(data_);

    const { id: _id, vehicle, alert: _alert } = data;
    const trip_update = data.trip_update ?? data.tripUpdate;

    if (trip_update != null) {
        const tu = fixTripUpdate(trip_update);
        if (addTripUpdate(tu) && tu.timestamp != null) {
            recentTripUpdatesAverageAge.add(Date.now() - (tu.timestamp * 1000));
        }
        return;
    }

    if (vehicle != null) {
        const vp = fixVehiclePosition(vehicle);
        if (addVehicleUpdate(vp) && vp.timestamp != null) {
            recentVehiclePositionsAverageAge.add(Date.now() - (vp.timestamp * 1000));
        }
        return;
    }
}

/**
 * A new WebSocket connection was opened.
 */
function onOpen(wsIdx: number): void {
    // reset number of errors
    log.verbose(`WebSocket[${wsIdx}] opened successfully after ${consecutiveErrors[wsIdx]} consecutive errors.`);
    consecutiveErrors[wsIdx] = 0;

    mpws.send(wsIdx, JSON.stringify({
        // appears to be a stripped-down GraphQL API
        filters: { },
        query: "{ id vehicle tripUpdate trip_update alert }",
    }));
}

export async function initialize(
    url: string,
    addTripUpdate_: (tripUpdate: TripUpdate) => boolean,
    addVehicleUpdate_: (vehicleUpdate: VehiclePosition) => boolean,
): Promise<void> {
    addTripUpdate = addTripUpdate_;
    addVehicleUpdate = addVehicleUpdate_;

    const concurrentConnections = 2;
    consecutiveErrors.length = concurrentConnections;
    consecutiveErrors.fill(0);

    mpws = new MultiPersistentWebSocket({
        allConnectionsSilentThreshold: 30 * 60 * 1000,
        concurrentConnections,
        lagThreshold: 6000,
        logger: getLogger(`${log.label}:MultiPersistentWebSocket`),
        onClose,
        onError,
        onMessage,
        onOpen,
        stallThreshold: 5000, // restart if server doesn't send us anything for 5 seconds
        startDelayBetweenConnections: 5000,
        url: wsIdx => `${url}#${wsIdx}`,
    });
}

export async function terminate(): Promise<void> {
    mpws.terminate();
}

function fixPosition(p: Position & Record<string, any>): Position {
    const { bearing, latitude, longitude, odometer, speed } = p;

    const output: Position = {
        latitude,
        longitude,
    };
    if (bearing != null) output.bearing = (ensureNumber(bearing) + 360) % 360;
    if (odometer != null) output.odometer = ensureNumber(odometer);
    if (speed != null) output.speed = ensureNumber(speed);
    return output;
}

function fixStopTimeEvent(ste: TripUpdate$StopTimeEvent & Record<string, any>): TripUpdate$StopTimeEvent {
    const { delay, time, uncertainty } = ste;

    const output: TripUpdate$StopTimeEvent = {};
    if (delay != null) output.delay = ensureNumber(delay);
    if (time != null) output.time = ensureNumber(time);
    if (uncertainty != null) output.uncertainty = ensureNumber(uncertainty);
    return output;
}

function fixStopTimeUpdate(stu: StopTimeUpdate & Record<string, any>): StopTimeUpdate {
    const { arrival, departure } = stu;
    const schedule_relationship = stu.schedule_relationship ?? stu.scheduleRelationship;
    const stop_id = stu.stop_id ?? stu.stopId;
    const stop_sequence = stu.stop_sequence ?? stu.stopSequence;

    const output: StopTimeUpdate = {};
    if (arrival != null) output.arrival = fixStopTimeEvent(arrival);
    if (departure != null) output.departure = fixStopTimeEvent(departure);
    if (schedule_relationship != null) {
        output.schedule_relationship = parseEnum(
            TripUpdate$StopTimeUpdate$ScheduleRelationship, schedule_relationship);
    }
    if (stop_id != null) output.stop_id = stop_id;
    if (stop_sequence != null) output.stop_sequence = ensureNumber(stop_sequence);
    return output;
}

function ensureNumber(t: string | number): number {
    if (typeof t === "string") {
        return Number.parseInt(t);
    }
    return t;
}

function fixTrip(t: TripDescriptor & Record<string, any>): TripDescriptor {
    const direction_id = t.direction_id ?? t.directionId;
    const route_id = t.route_id ?? t.routeId;
    const schedule_relationship = t.schedule_relationship ?? t.scheduleRelationship;
    const start_date = t.start_date ?? t.startDate;
    const start_time = t.start_time ?? t.startTime;
    const trip_id = t.trip_id ?? t.tripId;

    const output: TripDescriptor = {};
    if (direction_id != null) output.direction_id = direction_id;
    if (route_id != null) output.route_id = route_id;
    if (schedule_relationship != null) {
        output.schedule_relationship = parseEnum(TripDescriptor$ScheduleRelationship, schedule_relationship);
    }
    if (start_date != null) output.start_date = start_date;
    if (start_time != null) output.start_time = start_time;
    if (trip_id != null) output.trip_id = trip_id;
    return output;
}

export function fixTripUpdate(tu: TripUpdate & Record<string, any>): TripUpdate {
    const { delay, timestamp, trip, vehicle } = tu;
    let stop_time_update = tu.stop_time_update ?? tu.stopTimeUpdate ?? [];

    if (typeof stop_time_update === "object" && !Array.isArray(stop_time_update)) {
        stop_time_update = [stop_time_update];
    }

    const output: TripUpdate = {
        stop_time_update: stop_time_update.map(fixStopTimeUpdate),
        trip: fixTrip(trip),
    };
    if (delay != null) output.delay = ensureNumber(delay);
    if (timestamp != null) output.timestamp = ensureNumber(timestamp);
    if (vehicle != null) output.vehicle = fixVehicleDescriptor(vehicle);
    return output;
}

function fixVehicleDescriptor(vd: VehicleDescriptor & Record<string, any>): VehicleDescriptor {
    const { id, label } = vd;
    const license_plate = vd.license_plate ?? vd.licensePlate;

    const output: VehicleDescriptor = {};
    if (id != null) output.id = id;
    if (label != null) output.label = label;
    if (license_plate != null) output.license_plate = license_plate;
    return output;
}

export function fixVehiclePosition(vp: VehiclePosition & Record<string, any>): VehiclePosition {
    const { position, timestamp, trip, vehicle } = vp;
    const congestion_level = vp.congestion_level ?? vp.congestionLevel;
    const current_status = vp.current_status ?? vp.currentStatus;
    const current_stop_sequence = vp.current_stop_sequence ?? vp.currentStopSequence;
    const occupancy_status = vp.occupancy_status ?? vp.occupancyStatus;
    const stop_id = vp.stop_id ?? vp.stopId;

    const output: VehiclePosition = {};
    if (congestion_level != null) output.congestion_level = parseEnum(CongestionLevel, congestion_level);
    if (current_status != null) output.current_status = parseEnum(VehicleStopStatus, current_status);
    if (current_stop_sequence != null) output.current_stop_sequence = current_stop_sequence;
    if (occupancy_status != null) output.occupancy_status = parseEnum(OccupancyStatus, occupancy_status);
    if (position != null) output.position = fixPosition(position);
    if (stop_id != null) output.stop_id = stop_id;
    if (timestamp != null) output.timestamp = ensureNumber(timestamp);
    if (trip != null) output.trip = fixTrip(trip);
    if (vehicle != null) output.vehicle = fixVehicleDescriptor(vehicle);
    return output;
}
