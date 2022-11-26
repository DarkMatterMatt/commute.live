import type WebSocket from "ws";
import type { FeedEntity, TripDescriptor, TripUpdate, StopTimeUpdate, VehicleDescriptor, VehiclePosition, TripUpdate$StopTimeEvent, Position, JSONSerializable } from "~/types";
import { CongestionLevel, OccupancyStatus, TripDescriptor$ScheduleRelationship, TripUpdate$StopTimeUpdate$ScheduleRelationship, VehicleStopStatus } from "~/types/";
import { parseEnum, PersistentWebSocket } from "~/helpers/";
import { getLogger } from "~/log.js";

/**
 * Restart delay for first WebSocket error is 200ms, for the third error it is 8s, etc.
 */
const RESTART_DELAY = [0.2, 3, 8, 20, 40, 60, 90, 120];

const log = getLogger("NZLAKL/realtime");

let pws: PersistentWebSocket;
let consecutiveErrors = 0;

let addTripUpdate: (tripUpdate: TripUpdate) => void;

let addVehicleUpdate: (vehicleUpdate: VehiclePosition) => void;

export async function getStatus(): Promise<JSONSerializable> {
    return {
        readyState: pws.readyState,
        lastReceiveTime: pws.getLastReceive(),
        consecutiveErrors,
    };
}

/**
 * The WebSocket closed (we should probably restart it).
 */
function onClose(code: number, reason: string): undefined | number {
    log.debug("WebSocket closed with code.", code, reason);
    return;
}

/**
 * An error occurred and the WebSocket will be restarted.
 */
function onError(err: Error): undefined | number {
    const delay = RESTART_DELAY[Math.min(consecutiveErrors++, RESTART_DELAY.length - 1)];
    log.warn("WebSocket errored.", `#${consecutiveErrors}: ${delay}s.`, err);
    return 1000 * delay;
}

/**
 * Received a message.
 */
function onMessage(_ws: WebSocket, data_: string): void {
    // NOTE: AT's WebSocket incorrectly uses camelCase keys, string timestamps, and string enums
    const data: FeedEntity & Record<string, any> = JSON.parse(data_);

    const { id: _id, vehicle, alert: _alert } = data;
    const trip_update = data.trip_update ?? data.tripUpdate;

    if (trip_update != null) {
        addTripUpdate(fixTripUpdate(trip_update));
        return;
    }

    if (vehicle != null) {
        addVehicleUpdate(fixVehiclePosition(vehicle));
        return;
    }
}

/**
 * A new WebSocket connection was opened.
 */
function onOpen(ws: WebSocket): void {
    // reset number of errors
    if (consecutiveErrors > 1) {
        log.verbose(`WebSocket opened successfully after ${consecutiveErrors} consecutive errors.`);
    }
    consecutiveErrors = 0;

    ws.send(JSON.stringify({
        // appears to be a stripped-down GraphQL API
        filters: { },
        query: "{ id vehicle tripUpdate trip_update alert }",
    }));
}

export async function initialize(
    url: string,
    addTripUpdate_: (tripUpdate: TripUpdate) => void,
    addVehicleUpdate_: (vehicleUpdate: VehiclePosition) => void,
): Promise<void> {
    addTripUpdate = addTripUpdate_;
    addVehicleUpdate = addVehicleUpdate_;

    pws = new PersistentWebSocket({
        onClose,
        onError,
        onMessage,
        onOpen,
        url,
        stallThreshold: 3000, // restart if server doesn't send us anything for 3 seconds
    });
}

export async function terminate(): Promise<void> {
    pws.terminate();
}

function fixPosition(p: Position & Record<string, any>): Position {
    const { bearing, latitude, longitude, odometer, speed } = p;

    const output: Position = {
        latitude,
        longitude,
    };
    if (bearing != null) output.bearing = bearing;
    if (odometer != null) output.odometer = odometer;
    if (speed != null) output.speed = speed;
    return output;
}

function fixStopTimeEvent(ste: TripUpdate$StopTimeEvent & Record<string, any>): TripUpdate$StopTimeEvent {
    const { delay, time, uncertainty } = ste;

    const output: TripUpdate$StopTimeEvent = {};
    if (delay != null) output.delay = delay;
    if (time != null) output.time = fixTimestamp(time);
    if (uncertainty != null) output.uncertainty = uncertainty;
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
    if (stop_sequence != null) output.stop_sequence = stop_sequence;
    return output;
}

function fixTimestamp(t: string | number): number {
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

function fixTripUpdate(tu: TripUpdate & Record<string, any>): TripUpdate {
    const { delay, timestamp, trip, vehicle } = tu;
    const stop_time_update = tu.stop_time_update ?? tu.stopTimeUpdate ?? [];

    const output: TripUpdate = {
        stop_time_update: stop_time_update.map(fixStopTimeUpdate),
        trip: fixTrip(trip),
    };
    if (delay != null) output.delay = delay;
    if (timestamp != null) output.timestamp = fixTimestamp(timestamp);
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

function fixVehiclePosition(vp: VehiclePosition & Record<string, any>): VehiclePosition {
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
    if (timestamp != null) output.timestamp = fixTimestamp(timestamp);
    if (trip != null) output.trip = fixTrip(trip);
    if (vehicle != null) output.vehicle = fixVehicleDescriptor(vehicle);
    return output;
}
