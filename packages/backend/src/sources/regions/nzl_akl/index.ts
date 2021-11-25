import type { RegionCode, DataSource } from "~/types";
import { checkForRealtimeUpdate, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, initializeStatic } from "./static.js";
import { getLongNameByShortName, getShapesByShortName, getShortNameByTripId, getTripIdByTripDetails } from "./static_queries.js";

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
            initializeRealtime(cacheDir),
            initializeStatic(cacheDir),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
