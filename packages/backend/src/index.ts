import { join } from "node:path";
import { clearInterval, setInterval } from "node:timers";
import type { Id } from "@commutelive/common";
import Graceful from "node-graceful";
import { availableRegions, checkForRealtimeUpdates, checkForStaticUpdates, getRegion, initialize as initializeRegions, mapRegionsSync, regions } from "~/datasources/";
import env from "~/env.js";
import { TimedMap } from "~/helpers/";
import { getLogger } from "~/log.js";
import { publishTripUpdate, publishVehiclePosition, startServer } from "~/server/";
import type { DataSource, TripDescriptor, TripUpdate, VehiclePosition } from "~/types/";

const LOG_TRIP_NOT_FOUND_FOR_TRIP_UPDATE = true;

// Disabled due to excessive output (mostly ferries & trains).
// Some are missing labels, and some coordinates are nonsensical.
const LOG_TRIP_NOT_FOUND_FOR_VEHICLE_UPDATE = false;

const knownMissingTripIds = new TimedMap<string, void>({ defaultTtl: 24 * 60 * 60 * 1000 });

const log = getLogger("root");

process.on("unhandledRejection", err => {
    log.error("unhandledRejection", err);
});

process.on("uncaughtException", err => {
    log.error("uncaughtException", err);
});

async function getTripIdForTrip(ds: DataSource, trip?: TripDescriptor): Promise<string | null> {
    let tripId = trip?.trip_id;
    if (tripId == null) {
        const routeId = trip?.route_id;
        const directionId = trip?.direction_id;
        const startTime = trip?.start_time;
        if (routeId != null && directionId != null && startTime != null) {
            tripId = await ds.getTripIdByTripDetails(routeId, directionId, startTime);
        }
    }
    return tripId ?? null;
}

async function getIdForTrip(
    ds: DataSource,
    update: TripUpdate | VehiclePosition,
    logIfTripNotFound: boolean,
): Promise<Id | null> {
    const tripId = await getTripIdForTrip(ds, update.trip);
    if (tripId == null) {
        if (logIfTripNotFound) {
            log.warn("Could not find trip for trip update/vehicle position.", ds.code, update);
        }
        return null;
    }

    try {
        return await ds.getIdByTripId(tripId);
    }
    catch (err) {
        const key = `${ds.code}\0${tripId}`;
        if (!knownMissingTripIds.has(key)) {
            knownMissingTripIds.set(key);
            log.warn("Could not find identifier for trip update/vehicle position with trip id.", ds.code, tripId);
        }
        return null;
    }
}

(async () => {
    log.info("Initializing regions.");
    const cacheDir = env.CACHE_DIR;
    await initializeRegions(join(cacheDir, "regions"));

    log.info("Looking for static updates.");
    await checkForStaticUpdates();
    const staticUpdateInterval = setInterval(() => checkForStaticUpdates(), 30 * 60 * 1000);
    Graceful.on("exit", () => clearInterval(staticUpdateInterval));

    log.info("Looking for realtime updates.");
    await checkForRealtimeUpdates();
    const realtimeUpdateInterval = setInterval(() => checkForRealtimeUpdates(), 10 * 1000);
    Graceful.on("exit", () => clearInterval(realtimeUpdateInterval));

    log.info("Starting web server.");
    const regionsList = [...regions.values()];
    await startServer({
        availableRegions,
        getRegion,
        regions: regionsList,
        initializeWebSocketRouteOpts: {
            cacheDir: join(cacheDir, "websockets"),
            regions: regionsList,
        },
        initializeGetRouteOpts: {
            cacheDir: join(cacheDir, "api"),
            regions: regionsList,
        },
    });

    log.info("Connecting realtime regional events to web server.");
    let results = await mapRegionsSync(ds => {
        ds.registerTripUpdateListener(async update => {
            const id = await getIdForTrip(ds, update, LOG_TRIP_NOT_FOUND_FOR_TRIP_UPDATE);
            if (id != null) {
                publishTripUpdate(id, update);
            }
        });
    });
    for (const result of results) {
        if (result.status === "rejected") {
            log.error("Failed to register trip update listener.", result.reason);
        }
    }

    results = await mapRegionsSync(ds => {
        ds.registerVehicleUpdateListener(async update => {
            const id = await getIdForTrip(ds, update, LOG_TRIP_NOT_FOUND_FOR_VEHICLE_UPDATE);
            if (id != null) {
                publishVehiclePosition(id, update);
            }
        });
    });
    for (const result of results) {
        if (result.status === "rejected") {
            log.error("Failed to register vehicle update listener.", result.reason);
        }
    }

    if (env.FETCH_URL_WHEN_LOADED != null) {
        log.info("Signalling that we are ready for action!");
        await fetch(env.FETCH_URL_WHEN_LOADED);
    }
})();
