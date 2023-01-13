import type { DataSource } from "~/types";
import { FeedMessage as FeedMessageV1 } from "./gtfs-realtime.proto.js";
import { FeedMessage as FeedMessageV2 } from "./gtfs-realtime_v2.proto.js";
import { makeId, regionCode } from "./id.js";
import { checkForRealtimeUpdate, getStatus as getRealtimeStatus, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import type { NSWSource, NSWSourceOpts } from "./realtime_polling.js";
import { checkForStaticUpdate, getDatabase, getStatus as getStaticStatus, initializeStatic } from "./static.js";
import { getIdByTripId, getRoutesSummary, getRouteSummary, getShapes, getTripIdByTripDetails } from "./static_queries.js";

const BASE_URL = "https://api.transport.nsw.gov.au";
const GTFS_URL = `${BASE_URL}/v1/publictransport/timetables/complete/gtfs`;

const decodeV1 = FeedMessageV1.decode;
const decodeV2 = FeedMessageV2.decode;

function makeOpts(hasBearing: boolean, hasDirectionId: boolean): NSWSourceOpts {
    return {
        hasBearing,
        hasDirectionId,
    };
}

const REALTIME_API_URLS: NSWSource[] = [
    [`${BASE_URL}/v1/gtfs/vehiclepos/buses`, decodeV1, makeOpts(true, false)],
    [`${BASE_URL}/v1/gtfs/vehiclepos/ferries/sydneyferries`, decodeV1, makeOpts(true, false)],
    [`${BASE_URL}/v1/gtfs/vehiclepos/lightrail/innerwest`, decodeV1, makeOpts(true, false)],
    [`${BASE_URL}/v1/gtfs/vehiclepos/lightrail/newcastle`, decodeV1, makeOpts(true, false)],
    [`${BASE_URL}/v1/gtfs/vehiclepos/lightrail/cbdandsoutheast`, decodeV1, makeOpts(true, true)],
    [`${BASE_URL}/v1/gtfs/vehiclepos/nswtrains`, decodeV1, makeOpts(true, false)],
    [`${BASE_URL}/v1/gtfs/vehiclepos/metro`, decodeV1, makeOpts(true, false)],
    [`${BASE_URL}/v2/gtfs/vehiclepos/sydneytrains`, decodeV2, makeOpts(false, false)],
];

export const AUS_SYD: DataSource = {
    code: regionCode,

    location: { lat: -33.8869, lng: 151.1866 },

    country: "Australia",

    region: "New South Wales",

    // eslint-disable-next-line max-len
    attributionHTML: 'Transit information from <a href="https://opendata.transport.nsw.gov.au/">Transport for NSW</a> / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY</a>',

    defaultZoom: 13,

    defaultRouteIds: [makeId(700, "333"), makeId(2, "T8"), makeId(4, "F8")],

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
