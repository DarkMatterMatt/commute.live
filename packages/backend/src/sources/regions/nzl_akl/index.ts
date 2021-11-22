import type { RegionCode, DataSource } from "~/types";
import { checkForRealtimeUpdate, getVehicles, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, getDatabase, getShapeByShortName, getShortName, getTripId, initializeStatic } from "./static.js";

const regionCode: RegionCode = "NZL_AKL";

export const NZL_AKL: DataSource = {
    code: regionCode,

    checkForRealtimeUpdate,

    checkForStaticUpdate,

    getDatabase,

    getShapeByShortName,

    getShortName,

    getTripId,

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
