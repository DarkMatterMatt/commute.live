import type { VehicleUpdate, TripUpdate } from "gtfs-types";
import type { VehicleUpdateListener, TripUpdateListener } from "~/types";
import TimedMap from "~/TimedMap.js";

const MINUTE = 60 * 1000;

/**
 * Map of realtime trip updates, keyed by `trip_id`.
 */
const tripUpdates = new TimedMap<string, TripUpdate>({ defaultTtl: 2 * MINUTE });

/**
 * Map of realtime vehicle updates, keyed by `vehicle_id`.
 */
const vehicleUpdates = new TimedMap<string, VehicleUpdate>({ defaultTtl: 2 * MINUTE });

const tripUpdateListeners = new Set<TripUpdateListener>();
const vehicleUpdateListeners = new Set<VehicleUpdateListener>();

export async function checkForRealtimeUpdate(): Promise<boolean> {
    throw new Error("Function not implemented.");
}

export function addTripUpdate(tripUpdate: TripUpdate) {
    const tripId = tripUpdate.trip.trip_id;
    const lastTripUpdate = tripUpdates.get(tripId);
    if (lastTripUpdate != null && lastTripUpdate.timestamp >= tripUpdate.timestamp) {
        // already have newer information
        return;
    }

    // valid for two minutes
    const ttl = (tripUpdate.timestamp * 1000) + (2 * MINUTE) - Date.now();
    if (ttl <= 0) {
        // old data
        return;
    }

    tripUpdates.set(tripId, tripUpdate, ttl);
    tripUpdateListeners.forEach(l => l(tripUpdate));
}

export function addVehicleUpdate(vehicleUpdate: VehicleUpdate) {
    const vehicleId = vehicleUpdate.vehicle.id;
    const lastVehicleUpdate = vehicleUpdates.get(vehicleId);
    if (lastVehicleUpdate != null && lastVehicleUpdate.timestamp >= vehicleUpdate.timestamp) {
        // already have newer information
        return;
    }

    // valid for two minutes
    const ttl = (vehicleUpdate.timestamp * 1000) + (2 * MINUTE) - Date.now();
    if (ttl <= 0) {
        // old data
        return;
    }

    vehicleUpdates.set(vehicleId, vehicleUpdate, ttl);
    vehicleUpdateListeners.forEach(l => l(vehicleUpdate));
}

export async function getTripUpdates(): Promise<ReadonlyMap<string, TripUpdate>> {
    return tripUpdates;
}

export async function getVehicleUpdates(): Promise<ReadonlyMap<string, VehicleUpdate>> {
    return vehicleUpdates;
}

export function registerTripUpdateListener(listener: TripUpdateListener): void {
    tripUpdateListeners.add(listener);
}

export function registerVehicleUpdateListener(listener: VehicleUpdateListener): void {
    vehicleUpdateListeners.add(listener);
}

export async function initializeRealtime(_cacheDir: string) {
    //
}
