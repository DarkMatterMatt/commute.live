import type { Id, JSONSerializable } from "@commutelive/common";
import { TimedMap } from "~/helpers/";
import { getLogger } from "~/log.js";
import type { SqlDatabase, TripUpdate, TripUpdateListener, VehiclePosition, VehicleUpdateListener } from "~/types";
import type { FeedMessage as FeedMessageV1 } from "./gtfs-realtime.proto.js";
import type { FeedMessage as FeedMessageV2 } from "./gtfs-realtime_v2.proto.js";
import { checkForRealtimeUpdate as checkForRealtimeUpdatePolling, getStatus as getPollingStatus, initialize as initializePolling } from "./realtime_polling.js";
import { getRouteIds, getTripIds } from "./static_queries.js";

const MINUTE = 60 * 1000;

/**
 * Trip updates older than two minutes will be ignored.
 */
const KEEP_TRIP_UPDATES_FOR = 2 * MINUTE;

/**
 * Vehicle updates older than two minutes will be ignored.
 */
const KEEP_VEHICLE_UPDATES_FOR = 2 * MINUTE;

const log = getLogger("NZLAKL/realtime");

/**
 * Map of realtime trip updates, keyed by `trip_id`.
 */
const tripUpdates = new TimedMap<string, TripUpdate>({ defaultTtl: KEEP_TRIP_UPDATES_FOR });

/**
 * Map of realtime vehicle updates, keyed by `vehicle_id`.
 */
const vehicleUpdates = new TimedMap<string, VehiclePosition>({ defaultTtl: KEEP_VEHICLE_UPDATES_FOR });

/**
 * Set of functions to be executed when a trip update is received.
 */
const tripUpdateListeners = new Set<TripUpdateListener>();

/**
 * Set of functions to be executed when a vehicle update is received.
 */
const vehicleUpdateListeners = new Set<VehicleUpdateListener>();

export async function getStatus(): Promise<JSONSerializable> {
    return {
        numberOfRecentTripUpdates: tripUpdates.size,
        numberOfRecentVehicleUpdates: vehicleUpdates.size,
        polling: await getPollingStatus(),
    };
}

export async function checkForRealtimeUpdate(): Promise<boolean> {
    return checkForRealtimeUpdatePolling();
}

export function addTripUpdate(tripUpdate: TripUpdate): boolean {
    const tripId = tripUpdate.trip.trip_id;
    if (tripId == null) {
        // missing required information
        return false;
    }

    const lastTripUpdate = tripUpdates.get(tripId);
    if (lastTripUpdate?.timestamp != null && tripUpdate?.timestamp != null
            && lastTripUpdate.timestamp >= tripUpdate.timestamp) {
        // already have newer information
        return false;
    }

    // valid for two minutes
    const ttl = tripUpdate.timestamp
        ? (tripUpdate.timestamp * 1000) + KEEP_TRIP_UPDATES_FOR - Date.now()
        : KEEP_TRIP_UPDATES_FOR;
    if (ttl <= 0) {
        // old data
        return false;
    }

    tripUpdates.set(tripId, tripUpdate, ttl);
    tripUpdateListeners.forEach(l => l(tripUpdate));
    return true;
}

export function addVehicleUpdate(vehicleUpdate: VehiclePosition): boolean {
    const vehicleId = vehicleUpdate.vehicle?.id;
    if (vehicleId == null || vehicleUpdate.trip == null) {
        // missing required information
        return false;
    }

    const lastVehicleUpdate = vehicleUpdates.get(vehicleId);
    if (lastVehicleUpdate?.timestamp != null && vehicleUpdate?.timestamp != null
            && lastVehicleUpdate.timestamp >= vehicleUpdate.timestamp) {
        // already have newer information
        return false;
    }

    // valid for two minutes
    const ttl = vehicleUpdate.timestamp
        ? (vehicleUpdate.timestamp * 1000) + KEEP_TRIP_UPDATES_FOR - Date.now()
        : KEEP_TRIP_UPDATES_FOR;
    if (ttl <= 0) {
        // old data
        return false;
    }

    vehicleUpdates.set(vehicleId, vehicleUpdate, ttl);
    vehicleUpdateListeners.forEach(l => l(vehicleUpdate));
    return true;
}

export async function getTripUpdates(
    db: SqlDatabase,
    id?: Id,
): Promise<ReadonlyMap<string, TripUpdate>> {
    if (id == null) {
        return tripUpdates;
    }

    const routeIds = await getRouteIds(db, id);
    if (routeIds.length === 0) {
        log.warn(`No route identifiers found for identifier ${id}`);
    }

    const tripIds = await getTripIds(db, id);
    if (tripIds.length === 0) {
        log.warn(`No trip identifiers found for identifier ${id}`);
    }

    return new Map([...tripUpdates.entries()]
        .filter(e => {
            const { route_id, trip_id } = e[1].trip;
            if (route_id && routeIds.includes(route_id)) {
                return true;
            }
            if (trip_id && tripIds.includes(trip_id)) {
                return true;
            }
            return false;
        }),
    );
}

export async function getVehicleUpdates(
    db: SqlDatabase,
    id?: Id,
): Promise<ReadonlyMap<string, VehiclePosition>> {
    if (id == null) {
        return vehicleUpdates;
    }

    const routeIds = await getRouteIds(db, id);
    if (routeIds.length === 0) {
        log.warn(`No route identifiers found for identifier ${id}`);
    }

    const tripIds = await getTripIds(db, id);
    if (tripIds.length === 0) {
        log.warn(`No trip identifiers found for identifier ${id}`);
    }

    return new Map([...vehicleUpdates.entries()]
        .filter(e => {
            const { route_id, trip_id } = e[1].trip ?? {};
            if (route_id && routeIds.includes(route_id)) {
                return true;
            }
            if (trip_id && tripIds.includes(trip_id)) {
                return true;
            }
            return false;
        }),
    );
}

export function registerTripUpdateListener(listener: TripUpdateListener): void {
    tripUpdateListeners.add(listener);
}

export function registerVehicleUpdateListener(listener: VehicleUpdateListener): void {
    vehicleUpdateListeners.add(listener);
}

export async function initializeRealtime(
    _cacheDir: string,
    realtimeApiUrls: [string, (buf: Uint8Array) => FeedMessageV1 | FeedMessageV2][],
) {
    await initializePolling(realtimeApiUrls, addTripUpdate, addVehicleUpdate);
}
