import type { RegionCode, DataSource } from "~/types";
import { checkForRealtimeUpdate, getVehicles, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, getDatabase, initializeStatic } from "./static.js";
import { getLongNameByShortName, getShapesByShortName, getShortNameByTripId, getTripIdByTripDetails } from "./static_queries.js";

const regionCode: RegionCode = "NZL_AKL";

export const NZL_AKL: DataSource = {
    code: regionCode,

    checkForRealtimeUpdate,

    checkForStaticUpdate,

    getDatabase,

    getLongNameByShortName,

    getShapesByShortName,

    getShortNameByTripId,

    getTripIdByTripDetails,

    getVehicles,

    initialize: async cacheDir => {
        await Promise.allSettled([
            initializeRealtime(cacheDir),
            initializeStatic(cacheDir),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
