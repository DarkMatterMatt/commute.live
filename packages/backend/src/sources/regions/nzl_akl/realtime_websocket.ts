import type WebSocket from "ws";
import type { FeedEntity, TripDescriptor, TripUpdate, StopTimeUpdate, VehicleDescriptor, VehiclePosition } from "~/types";
import { CongestionLevel, OccupancyStatus, TripDescriptor$ScheduleRelationship, TripUpdate$StopTimeUpdate$ScheduleRelationship, VehicleStopStatus } from "~/types/";
import PersistentWebSocket from "~/PersistentWebSocket.js";
import { parseEnum } from "~/helpers/";

let pws: PersistentWebSocket;

let addTripUpdate: (tripUpdate: TripUpdate) => void;

let addVehicleUpdate: (vehicleUpdate: VehiclePosition) => void;

/**
 * The WebSocket closed (we should probably restart it).
 */
function onClose(code: number, reason: Buffer): undefined | number {
    return;
}

/**
 * An error occurred and the WebSocket will be restarted.
 */
function onError(err: Error): undefined | number {
    return;
}

/**
 * Received a message.
 */
function onMessage(_ws: WebSocket, data_: string): void {
    // NOTE: AT's WebSocket incorrectly uses camelCase keys and string timestamps
    const data: FeedEntity & Record<string, any> = JSON.parse(data_);

    // trip_update
    data.trip_update ??= data.tripUpdate;
    if (data.trip_update != null) {
        const tu: TripUpdate & Record<string, any> = data.trip_update;

        // delay doesn't need to be changed

        // stop_time_update
        tu.stop_time_update ??= tu.stopTimeUpdate;
        tu.stop_time_update.forEach((stu: StopTimeUpdate & Record<string, any>) => {
            // arrival, fix timestamp
            if (typeof stu.arrival?.time === "string") {
                stu.arrival.time = Number.parseInt(stu.arrival.time);
            }
            // departure, fix timestamp
            if (typeof stu.departure?.time === "string") {
                stu.departure.time = Number.parseInt(stu.departure.time);
            }

            // stop_time_update.schedule_relationship
            stu.schedule_relationship ??= stu.scheduleRelationship;
            if (stu.schedule_relationship != null) {
                parseEnum(TripUpdate$StopTimeUpdate$ScheduleRelationship, stu.schedule_relationship);
            }

            stu.stop_id ??= stu.stopId;
            stu.stop_sequence ??= stu.stopSequence;
        });

        // timestamp
        if (typeof tu.timestamp === "string") {
            tu.timestamp = Number.parseInt(tu.timestamp);
        }

        // trip
        const t: TripDescriptor & Record<string, any> = data.trip;
        t.direction_id ??= t.directionId;
        t.route_id ??= t.routeId;
        t.start_date ??= t.startDate;
        t.start_time ??= t.startTime;
        t.trip_id ??= t.tripId;

        // trip.schedule_relationship
        t.schedule_relationship ??= t.scheduleRelationship;
        if (t.schedule_relationship != null) {
            parseEnum(TripDescriptor$ScheduleRelationship, t.schedule_relationship);
        }

        // vehicle
        if (tu.vehicle != null) {
            const v: VehicleDescriptor & Record<string, any> = tu.vehicle;

            // id & label don't need changes

            // license_plate
            v.license_plate ??= v.licensePlate;
        }

        addTripUpdate(tu);
    }
    else if (data.vehicle != null) {
        // vehicle
        const vp: VehiclePosition & Record<string, any> = data.vehicle;

        // congestion_level
        vp.congestion_level ??= vp.congestionLevel;
        if (vp.congestion_level != null) {
            vp.congestion_level = parseEnum(CongestionLevel, vp.congestion_level);
        }

        // current_status
        vp.current_status ??= vp.currentStatus;
        if (vp.current_status != null) {
            vp.current_status = parseEnum(VehicleStopStatus, vp.current_status);
        }

        // current_stop_sequence
        vp.current_stop_sequence ??= vp.currentStopSequence;

        // occupancy_status
        vp.occupancy_status ??= vp.occupancyStatus;
        if (vp.occupancy_status != null) {
            vp.occupancy_status = parseEnum(OccupancyStatus, vp.occupancy_status);
        }

        // position doesn't need to be changed

        // stop_id
        vp.stop_id ??= vp.stopId;

        // timestamp
        if (typeof vp.timestamp === "string") {
            vp.timestamp = Number.parseInt(vp.timestamp);
        }

        // trip
        if (vp.trip != null) {
            const t: TripDescriptor & Record<string, any> = vp.trip;
            t.direction_id ??= t.directionId;
            t.route_id ??= t.routeId;
            t.start_date ??= t.startDate;
            t.start_time ??= t.startTime;
            t.trip_id ??= t.tripId;

            // trip.schedule_relationship
            t.schedule_relationship ??= t.scheduleRelationship;
            if (t.schedule_relationship != null) {
                t.schedule_relationship = parseEnum(TripDescriptor$ScheduleRelationship, t.schedule_relationship);
            }
        }

        // vehicle
        if (vp.vehicle != null) {
            const v: VehicleDescriptor & Record<string, any> = data.vehicle;

            // id & label don't need changes

            // license_plate
            v.license_plate ??= v.licensePlate;
        }

        addVehicleUpdate(vp);
    }
}

/**
 * A new WebSocket connection was opened.
 */
function onOpen(ws: WebSocket): void {
    ws.send(JSON.stringify({
        // appears to be a stripped-down GraphQL API
        filters: { $or: { vehicle: true, tripUpdate: true, trip_update: true } },
        query: "{ id vehicle tripUpdate, trip_update }",
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
