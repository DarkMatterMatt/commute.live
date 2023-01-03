import type { DataSource } from "~/types";
import { FeedMessage as FeedMessageV1 } from "./gtfs-realtime.proto.js";
import { FeedMessage as FeedMessageV2 } from "./gtfs-realtime_v2.proto.js";
import { regionCode } from "./id.js";
import { checkForRealtimeUpdate, getStatus as getRealtimeStatus, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, getDatabase, getStatus as getStaticStatus, initializeStatic } from "./static.js";
import { getIdByTripId, getRoutesSummary, getRouteSummary, getShapes, getTripIdByTripDetails } from "./static_queries.js";

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

export const AUS_SYD: DataSource = {
    code: regionCode,

    location: { lat: -33.9049, lng: 151.0839 },

    country: "Australia",

    region: "New South Wales",

    // eslint-disable-next-line max-len
    attributionHTML: '<a href="https://opendata.transport.nsw.gov.au/">Transit information</a> from Transport for NSW / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY</a>',

    checkForRealtimeUpdate,

    checkForStaticUpdate,

    getIdByTripId: tripId =>
        getIdByTripId(getDatabase(), tripId),

    getRouteSummary: id =>
        getRouteSummary(getDatabase(), id),

    getRoutesSummary: () =>
        getRoutesSummary(getDatabase()),

    getShapes: id =>
        getShapes(getDatabase(), id),

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

    initialize: async cacheDir => {
        await Promise.all([
            initializeRealtime(cacheDir, REALTIME_API_URLS),
            initializeStatic(cacheDir, GTFS_URL),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
