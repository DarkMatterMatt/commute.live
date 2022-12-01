import type { LiveVehicle } from "@commutelive/common";
import type { VehiclePosition } from "~/types";

export function convertVehiclePosition(region: string, shortName: string, vp: VehiclePosition): LiveVehicle {
    const { occupancy_status, position, timestamp, trip, vehicle } = vp;
    const { bearing, latitude: lat, longitude: lng } = position || {};

    const routeId = trip?.route_id;
    const directionId = trip?.direction_id;
    const vehicleId = vehicle?.id;

    const result: LiveVehicle = {
        status: "success",
        route: "live/vehicle",
        region,
        shortName,
        routeId,
        directionId,
        lastUpdatedUnix: timestamp,
        lastUpdated: timestamp && timestamp * 1000,
        position: (lat != null && lng != null) ? { lat, lng } : undefined,
        bearing,
        vehicleId,
        occupancyStatus: occupancy_status,
    };
    return Object.fromEntries(Object.entries(result).filter(([, v]) => v != null)) as LiveVehicle;
}
