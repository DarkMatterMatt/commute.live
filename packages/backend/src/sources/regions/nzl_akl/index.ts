import type { RegionCode, DataSource } from "~/types";
import { checkForRealtimeUpdate, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, initializeStatic } from "./static.js";
import { getLongNameByShortName, getShapesByShortName, getShortNameByTripId, getTripIdByTripDetails } from "./static_queries.js";

const AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY = "";

const GTFS_URL = "https://cdn01.at.govt.nz/data/gtfs.zip";

const WS_URL = "wss://mobile.at.govt.nz/streaming/realtime/locations"
    + `?subscription_key=${AUCKLAND_TRANSPORT_SUBSCRIPTION_KEY}`;

const regionCode: RegionCode = "NZL_AKL";

export const NZL_AKL: DataSource = {
    code: regionCode,

    checkForRealtimeUpdate,

    checkForStaticUpdate,

    getLongNameByShortName,

    getShapesByShortName,

    getShortNameByTripId,

    getTripIdByTripDetails,

    getTripUpdates,

    getVehicleUpdates,

    initialize: async cacheDir => {
        await Promise.allSettled([
            initializeRealtime(cacheDir, WS_URL),
            initializeStatic(cacheDir, GTFS_URL),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
