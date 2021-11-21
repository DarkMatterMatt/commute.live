import type { RegionCode, DataSource } from "~/types";
import { getVehicles, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { checkForStaticUpdate, getShapesByShortName, getShortName, getTripId } from "./static.js";

const regionCode: RegionCode = "NZL_AKL";

export const NZL_AKL: DataSource = {
    code: regionCode,

    checkForStaticUpdate,

    getShapesByShortName,

    getShortName,

    getTripId,

    getVehicles,

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
