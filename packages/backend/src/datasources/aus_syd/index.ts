import type { DataSource, RegionCode } from "~/types";
import { FeedMessage as FeedMessageV1 } from "./gtfs-realtime.proto.js";
import { FeedMessage as FeedMessageV2 } from "./gtfs-realtime_v2.proto.js";
import { checkForRealtimeUpdate, getStatus as getRealtimeStatus, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, getDatabase, getStatus as getStaticStatus, initializeStatic } from "./static.js";
import { getLongNamesByShortName, getRoutesSummary, getRouteTypeByShortName, getShapesByShortName, getShortNameByTripId, getShortNames, getTripIdByTripDetails, hasShortName } from "./static_queries.js";

const GTFS_URL = "https://api.transport.nsw.gov.au/v1/publictransport/timetables/complete/gtfs";

const REALTIME_API_URLS: [string, (buf: Uint8Array) => FeedMessageV1 | FeedMessageV2][] = [
    ["https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/buses", FeedMessageV1.decode],
    ["https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/ferries/sydneyferries", FeedMessageV1.decode],
    ["https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/lightrail/innerwest", FeedMessageV1.decode],
    ["https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/lightrail/newcastle", FeedMessageV1.decode],
    ["https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/lightrail/cbdandsoutheast", FeedMessageV1.decode],
    ["https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/nswtrains", FeedMessageV1.decode],
    ["https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/metro", FeedMessageV1.decode],
    ["https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains", FeedMessageV2.decode],
];

const regionCode: RegionCode = "AUS_SYD";

export const AUS_SYD: DataSource = {
    code: regionCode,

    checkForRealtimeUpdate,

    checkForStaticUpdate,

    getLongNamesByShortName: shortName =>
        getLongNamesByShortName(getDatabase(), shortName),

    getRouteTypeByShortName: shortName =>
        getRouteTypeByShortName(getDatabase(), shortName),

    getRoutesSummary: () =>
        getRoutesSummary(getDatabase()),

    getShapesByShortName: shortName =>
        getShapesByShortName(getDatabase(), shortName),

    getShortNameByTripId: tripId =>
        getShortNameByTripId(getDatabase(), tripId),

    getShortNames: () =>
        getShortNames(getDatabase()),

    getStatus: async () => ({
        realtime: await getRealtimeStatus(),
        static: await getStaticStatus(),
    }),

    getTripIdByTripDetails: (routeId, directionId, startTime) =>
        getTripIdByTripDetails(getDatabase(), routeId, directionId, startTime),

    getTripUpdates: shortName =>
        getTripUpdates(getDatabase(), shortName),

    getVehicleUpdates: shortName =>
        getVehicleUpdates(getDatabase(), shortName),

    hasShortName: shortName =>
        hasShortName(getDatabase(), shortName),

    initialize: async cacheDir => {
        await Promise.all([
            initializeRealtime(cacheDir, REALTIME_API_URLS),
            initializeStatic(cacheDir, GTFS_URL),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
