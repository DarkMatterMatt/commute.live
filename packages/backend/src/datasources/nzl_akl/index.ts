import type { RegionCode, DataSource } from "~/types";
import env from "~/env.js";
import { checkForRealtimeUpdate, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, getDatabase, initializeStatic } from "./static.js";
import { getLongNamesByShortName, getRouteTypeByShortName, getRoutesSummary, getShapesByShortName, getShortNameByTripId, getShortNames, getTripIdByTripDetails, hasShortName } from "./static_queries.js";

const AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY = env.AUCKLAND_TRANSPORT_KEY;

const GTFS_URL = "https://cdn01.at.govt.nz/data/gtfs.zip";

const WS_URL = "wss://mobile.at.govt.nz/streaming/realtime/locations"
    + `?subscription_key=${AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY}`;

const regionCode: RegionCode = "NZL_AKL";

export const NZL_AKL: DataSource = {
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

    getTripIdByTripDetails: (routeId, directionId, startTime) =>
        getTripIdByTripDetails(getDatabase(), routeId, directionId, startTime),

    getTripUpdates: shortName =>
        getTripUpdates(getDatabase(), shortName),

    getVehicleUpdates: shortName =>
        getVehicleUpdates(getDatabase(), shortName),

    hasShortName: shortName =>
        hasShortName(getDatabase(), shortName),

    initialize: async cacheDir => {
        await Promise.allSettled([
            initializeRealtime(cacheDir, WS_URL),
            initializeStatic(cacheDir, GTFS_URL),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
