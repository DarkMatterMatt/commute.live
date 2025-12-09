export type { Database as SqlDatabase } from "better-sqlite3";

export * from "./gtfs-realtime";
export * from "./gtfs-static";

export {
    type TranslatedString$Translation as Translation,
    type TripUpdate$StopTimeEvent as StopTimeEvent,
    type TripUpdate$StopTimeUpdate as StopTimeUpdate,
    VehiclePosition$CongestionLevel as CongestionLevel,
    VehiclePosition$OccupancyStatus as OccupancyStatus,
    VehiclePosition$VehicleStopStatus as VehicleStopStatus,
} from "./gtfs-realtime";
