import type { TripUpdate, TripUpdateListener, VehiclePosition, VehicleUpdateListener } from "~/types";
import { TimedMap } from "~/helpers/";
import { initialize as initializeWebSocket } from "./realtime_websocket.js";
import { getDatabase } from "./static.js";

const MINUTE = 60 * 1000;

/**
 * Trip updates older than two minutes will be ignored.
 */
const KEEP_TRIP_UPDATES_FOR = 2 * MINUTE;

/**
 * Vehicle updates older than two minutes will be ignored.
 */
const KEEP_VEHICLE_UPDATES_FOR = 2 * MINUTE;

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

export async function checkForRealtimeUpdate(): Promise<boolean> {
    throw new Error("Function not implemented.");
}

export function addTripUpdate(tripUpdate: TripUpdate) {
    const tripId = tripUpdate.trip.trip_id;
    if (tripId == null) {
        // missing required information
        return;
    }

    const lastTripUpdate = tripUpdates.get(tripId);
    if (lastTripUpdate?.timestamp != null && tripUpdate?.timestamp != null
            && lastTripUpdate.timestamp >= tripUpdate.timestamp) {
        // already have newer information
        return;
    }

    // valid for two minutes
    const ttl = tripUpdate.timestamp
        ? (tripUpdate.timestamp * 1000) + KEEP_TRIP_UPDATES_FOR - Date.now()
        : KEEP_TRIP_UPDATES_FOR;
    if (ttl <= 0) {
        // old data
        return;
    }

    tripUpdates.set(tripId, tripUpdate, ttl);
    tripUpdateListeners.forEach(l => l(tripUpdate));
}

export function addVehicleUpdate(vehicleUpdate: VehiclePosition) {
    const vehicleId = vehicleUpdate.vehicle?.id;
    if (vehicleId == null) {
        // missing required information
        return;
    }

    const lastVehicleUpdate = vehicleUpdates.get(vehicleId);
    if (lastVehicleUpdate?.timestamp != null && vehicleUpdate?.timestamp != null
            && lastVehicleUpdate.timestamp >= vehicleUpdate.timestamp) {
        // already have newer information
        return;
    }

    // valid for two minutes
    const ttl = vehicleUpdate.timestamp
        ? (vehicleUpdate.timestamp * 1000) + KEEP_TRIP_UPDATES_FOR - Date.now()
        : KEEP_TRIP_UPDATES_FOR;
    if (ttl <= 0) {
        // old data
        return;
    }

    vehicleUpdates.set(vehicleId, vehicleUpdate, ttl);
    vehicleUpdateListeners.forEach(l => l(vehicleUpdate));
}

export async function getTripUpdates(shortName?: string): Promise<ReadonlyMap<string, TripUpdate>> {
    if (shortName == null) {
        return tripUpdates;
    }

    const routeIds = await getDatabase().all(`
        SELECT route_id
        FROM routes
        WHERE route_short_name=$shortName
    `, {
        $shortName: shortName,
    });

    // following SQL statement will break if there are more than 999 routeIds,
    // error will be `SQLITE_ERROR: too many SQL variables`
    const tripIds = routeIds.length === 0 ? [] : await getDatabase().all(`
        SELECT trip_id
        FROM trips
        INNER JOIN routes ON trips.trip_id=routes.trip_id
        WHERE route_id IN ${routeIds.map(_ => "?").join(",")}
    `, routeIds);

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

export async function getVehicleUpdates(shortName?: string): Promise<ReadonlyMap<string, VehiclePosition>> {
    if (shortName == null) {
        return vehicleUpdates;
    }

    const routeIds = await getDatabase().all(`
        SELECT route_id
        FROM routes
        WHERE route_short_name=$shortName
    `, {
        $shortName: shortName,
    });

    // following SQL statement will break if there are more than 999 routeIds,
    // error will be `SQLITE_ERROR: too many SQL variables`
    const tripIds = routeIds.length === 0 ? [] : await getDatabase().all(`
        SELECT trip_id
        FROM trips
        INNER JOIN routes ON trips.trip_id=routes.trip_id
        WHERE route_id IN ${routeIds.map(_ => "?").join(",")}
    `, routeIds);

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

export async function initializeRealtime(_cacheDir: string, wsUrl: string) {
    await initializeWebSocket(wsUrl, addTripUpdate, addVehicleUpdate);
}
