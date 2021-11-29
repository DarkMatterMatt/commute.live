export * from "./gtfs-realtime.js";

/* eslint-disable @typescript-eslint/no-unused-vars */
import * as RT from "./gtfs-realtime.js";
export import Translation = RT.TranslatedString$Translation;
export import StopTimeEvent = RT.TripUpdate$StopTimeEvent;
export import StopTimeUpdate = RT.TripUpdate$StopTimeUpdate;
export import CongestionLevel = RT.VehiclePosition$CongestionLevel;
export import OccupancyStatus = RT.VehiclePosition$OccupancyStatus;
export import VehicleStopStatus = RT.VehiclePosition$VehicleStopStatus;
