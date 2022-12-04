import env from "~/env.js";
import type { DataSource, RegionCode } from "~/types";
import { checkForUpdate as checkForConvertUpdate, initialize as initializeConvert } from "./convertOldToNewIds.js";
import { checkForRealtimeUpdate, getStatus as getRealtimeStatus, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, getDatabase, getStatus as getStaticStatus, initializeStatic } from "./static.js";
import { getLongNamesByShortName, getRoutesSummary, getRouteTypeByShortName, getShapesByShortName, getShortNameByTripId, getShortNames, getTripIdByTripDetails, hasShortName } from "./static_queries.js";

const AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY = env.AUCKLAND_TRANSPORT_KEY;

const GTFS_URL = "https://gtfs.at.govt.nz/gtfs.zip";

const REALTIME_API_URL = "https://api.at.govt.nz/v2/public/realtime";

const WS_URL = "wss://mobile.at.govt.nz/mobile/streaming/v1"
    + `?subscription_key=${AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY}`;

const regionCode: RegionCode = "NZL_AKL";

export const NZL_AKL: DataSource = {
    code: regionCode,

    checkForRealtimeUpdate,

    checkForStaticUpdate: async () => {
        const updated = await checkForStaticUpdate();
        const convertUpdated = await checkForConvertUpdate();
        return updated || convertUpdated;
    },

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
        await Promise.allSettled([
            initializeRealtime(cacheDir, WS_URL, REALTIME_API_URL),
            initializeStatic(cacheDir, GTFS_URL),
        ]);
        // This relies on the static data being initialized first
        await initializeConvert(cacheDir);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
