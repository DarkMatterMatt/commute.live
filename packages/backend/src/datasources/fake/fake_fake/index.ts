import type { DataSource } from "~/types";
import { makeId, regionCode } from "./id";
import { getTripUpdates, getVehicleUpdates, initialize, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime";
import { getIdByTripId, getRoutesSummary, getRouteSummary, getShapes } from "./static";

export const FAKE_FAKE: DataSource = {
    code: regionCode,

    location: { lat: -36.8484, lng: 174.7633 },

    country: "New Zealand",

    region: "Auckland",

    attributionHTML: "<b>Fake</b> transit information",

    defaultZoom: 12.5,

    defaultRouteIds: [makeId("F1"), makeId("B1")],

    checkForRealtimeUpdate: async () => false,

    checkForStaticUpdate: async () => false,

    getIdByTripId,

    getRouteSummary,

    getRoutesSummary,

    getShapes,

    getStatus: async () => ({
        active: true,
    }),

    getTripIdByTripDetails: async () => {
        throw new Error("Not implemented");
    },

    getTripUpdates,

    getVehicleUpdates,

    initialize,

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
