import type { LatLng } from "~/geo";
import type { Id } from "./id";

export interface LiveVehicle {
    status: "success",
    /** Websocket JSON route, not the vehicle's transit route */
    route: "live/vehicle",

    id: Id;
    directionId?: number;
    /** JavaScript timestamp (milliseconds since Epoch) */
    lastUpdated?: number;
    /** Unprocessed reported GPS location */
    position?: LatLng;
    /** Unprocessed reported vehicle bearing */
    bearing?: number;
    vehicleId?: string;
    occupancyStatus?: number;
}
