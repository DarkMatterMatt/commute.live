import { setInterval } from "node:timers";
import { type Id, TimedMap } from "@commutelive/common";
import type { TripUpdate, TripUpdateListener, VehiclePosition, VehicleUpdateListener } from "~/types";
import { VEHICLES } from "./static";

/**
* Map of realtime trip updates, keyed by `trip_id`.
*/
const tripUpdates = new TimedMap<string, TripUpdate & { routeId: Id }>({ defaultTtl: 30 * 1000 });

/**
* Set of functions to be executed when a trip update is received.
*/
const tripUpdateListeners = new Set<TripUpdateListener>();

/**
 * Map of realtime vehicle updates, keyed by `vehicle_id`.
 */
const vehicleUpdates = new TimedMap<string, VehiclePosition & { routeId: Id }>({ defaultTtl: 30 * 1000 });

/**
 * Set of functions to be executed when a vehicle update is received.
 */
const vehicleUpdateListeners = new Set<VehicleUpdateListener>();

export function registerTripUpdateListener(listener: TripUpdateListener): void {
    tripUpdateListeners.add(listener);
}

export function registerVehicleUpdateListener(listener: VehicleUpdateListener): void {
    vehicleUpdateListeners.add(listener);
}

export async function getVehicleUpdates(id?: Id | undefined): Promise<ReadonlyMap<string, VehiclePosition>> {
    if (id == null) {
        return vehicleUpdates;
    }
    return new Map([...vehicleUpdates].filter(([, { routeId }]) => routeId === id));
}

export async function getTripUpdates(id?: Id | undefined): Promise<ReadonlyMap<string, TripUpdate>> {
    if (id == null) {
        return tripUpdates;
    }
    return new Map([...tripUpdates].filter(([, { routeId }]) => routeId === id));
}

function refreshVehicles() {
    for (const [routeId, vehicles] of VEHICLES) {
        for (const vehicle of vehicles) {
            const vehicleId = vehicle.vehicle?.id;
            if (vehicleId == null) {
                throw new Error("Vehicle ID is missing");
            }

            const timestamp = Math.floor(Date.now() / 1000);
            vehicleUpdates.set(vehicleId, { ...vehicle, routeId, timestamp });
            vehicleUpdateListeners.forEach(l => l({ ...vehicle, timestamp }));
        }
    }
}

export async function initialize(): Promise<void> {
    refreshVehicles();
    setInterval(refreshVehicles, 15 * 1000);
}
