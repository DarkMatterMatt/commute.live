import { LatLng, VehiclePosition } from "~/types";

export interface LiveVehicle {
    status: "success",
    /** Websocket JSON route, not the vehicle's transit route */
    route: "live/vehicle",

    region: string;
    shortName: string;
    routeId?: string;
    directionId?: number;
    lastUpdatedUnix?: number;
    /** JavaScript timestamp (milliseconds since Epoch) */
    lastUpdated?: number;
    /** Unprocessed reported GPS location */
    position?: LatLng;
    /** Unprocessed reported vehicle bearing */
    bearing?: number;
    vehicleId?: string;
    occupancyStatus?: number;

    /** Closest position on route to reported position */
    snapPosition?: LatLng;
    /** Distance (meters) between reported position and calculated position */
    snapDeviation?: number;
    /** Direction of route at snapPosition. 0 to 360 degrees, clockwise from North */
    snapBearing?: number;
}

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
