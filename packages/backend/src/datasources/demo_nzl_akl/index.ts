import type { DataSource } from "~/types";
import { makeId, regionCode } from "./id.js";
import { getTripUpdates, getVehicleUpdates, initialize, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime.js";
import { getIdByTripId, getRoutesSummary, getRouteSummary, getShapes } from "./static.js";

export const DEMO_NZL_AKL: DataSource = {
    hidden: true,

    code: regionCode,

    location: { lat: -36.8484, lng: 174.7633 }, // !!MM todo

    country: "New Zealand",

    region: "Auckland",

    // eslint-disable-next-line max-len
    attributionHTML: 'Fake transit information derived from <a href="https://at.govt.nz/about-us/at-data-sources/">Auckland Transport</a> / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY</a>',

    defaultZoom: 12.5,

    defaultRouteIds: [makeId("25B"), makeId("70")],

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
