import type { DataSource } from "~/types";
import { makeId, regionCode } from "./id";
import { checkForRealtimeUpdate, getStatus as getRealtimeStatus, getTripUpdates, getVehicleUpdates, initializeRealtime, registerTripUpdateListener, registerVehicleUpdateListener } from "./realtime";
import type { NSWSource } from "./realtime_polling";
import { buses, ferries_sydneyferries, lightrail_cbdandsoutheast, lightrail_innerwest, lightrail_newcastle, metro, nswtrains, sydneytrains } from "./sources/";
import { checkForStaticUpdate, getDatabase, getStatus as getStaticStatus, initializeStatic } from "./static";
import { getIdByTripId, getRoutesSummary, getRouteSummary, getShapes, getTripIdByTripDetails } from "./static_queries";

const GTFS_URL = "https://api.transport.nsw.gov.au/v1/publictransport/timetables/complete/gtfs";

const REALTIME_API_URLS: NSWSource[] = [
    buses,
    ferries_sydneyferries,
    lightrail_cbdandsoutheast,
    lightrail_innerwest,
    lightrail_newcastle,
    metro,
    nswtrains,
    sydneytrains,
];

export const AUS_SYD: DataSource = {
    code: regionCode,

    location: { lat: -33.8869, lng: 151.1866 },

    country: "Australia",

    region: "New South Wales",

    // eslint-disable-next-line max-len
    attributionHTML: 'Transit information from <a href="https://opendata.transport.nsw.gov.au/">Transport for NSW</a> / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY</a>',

    defaultZoom: 13,

    defaultRouteIds: [makeId(700, "333"), makeId(2, "T8"), makeId(4, "F8")],

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
            initializeRealtime(cacheDir, REALTIME_API_URLS),
            initializeStatic(cacheDir, GTFS_URL),
        ]);
    },

    registerTripUpdateListener,

    registerVehicleUpdateListener,
};
