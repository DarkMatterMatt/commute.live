import type { LatLng } from "~/geo";
import type { Id } from "./id";

export interface LiveVehicle {
    status: "success",
    /** Websocket JSON route, not the vehicle's transit route */
    route: "live/vehicle",

    id: Id;
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
