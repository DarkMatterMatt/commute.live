import env from "~/env";
import type { DataSource } from "~/types";
import { makeId, regionCode } from "./id";
import { checkForRealtimeUpdate, getStatus as getRealtimeStatus, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime";
import { checkForStaticUpdate, getDatabase, getStatus as getStaticStatus, initializeStatic } from "./static";
import { getIdByTripId, getRoutesSummary, getRouteSummary, getShapes, getTripIdByTripDetails } from "./static_queries";

const AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY = env.AUCKLAND_TRANSPORT_KEY;

const GTFS_URL = "https://gtfs.at.govt.nz/gtfs.zip";

const REALTIME_API_URL = "https://api.at.govt.nz/realtime/legacy";

const WS_URL = "wss://mobile.at.govt.nz/mobile/streaming/v1"
    + `?subscription_key=${AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY}`;

export const NZL_AKL: DataSource = {
    code: regionCode,

    location: { lat: -36.8484, lng: 174.7633 },

    country: "New Zealand",

    region: "Auckland",

    // eslint-disable-next-line max-len
    attributionHTML: 'Transit information from <a href="https://at.govt.nz/about-us/at-data-sources/">Auckland Transport</a> / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY</a>',

    defaultZoom: 13,

    defaultRouteIds: [makeId("25B"), makeId("70")],

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
            initializeRealtime(cacheDir, WS_URL, REALTIME_API_URL),
            initializeStatic(cacheDir, GTFS_URL),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
