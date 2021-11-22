import type { VehicleUpdate, TripUpdate } from "gtfs-types";

export async function checkForRealtimeUpdate(): Promise<boolean> {
    throw new Error("Function not implemented.");
}

export function getVehicles(): VehicleUpdate[] {
    throw new Error("Function not implemented.");
}

export function registerTripUpdateListener(listener: (update: TripUpdate) => void): void {
    throw new Error("Function not implemented.");
}

export function registerVehicleUpdateListener(listener: (update: VehicleUpdate) => void): void {
    throw new Error("Function not implemented.");
}

export async function initializeRealtime(cacheDir: string) {
    //
}
