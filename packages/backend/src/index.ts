import { clearInterval, setInterval } from "node:timers";
import Graceful from "node-graceful";
import { availableRegions, checkForRealtimeUpdates, checkForStaticUpdates, getRegion, initialize, mapRegionsSync } from "~/datasources/";
import type { DataSource, TripDescriptor } from "~/types/";
import { publishTripUpdate, publishVehiclePosition, startServer } from "./server/";
import { getLogger } from "~/log.js";

const LOG_TRIP_NOT_FOUND_FOR_TRIP_UPDATE = true;

// Disabled due to excessive output (mostly ferries & trains).
// Some are missing labels, and some coordinates are nonsensical.
const LOG_TRIP_NOT_FOUND_FOR_VEHICLE_UPDATE = false;

const log = getLogger("root");

process.on("unhandledRejection", err => {
    log.error("unhandledRejection", err);
});

process.on("uncaughtException", err => {
    log.error("uncaughtException", err);
});

async function getShortNameForTrip(ds: DataSource, trip?: TripDescriptor): Promise<string | null> {
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

(async () => {
    log.info("Initializing regions.");
    await initialize("cache");

    log.info("Looking for static updates.");
    await checkForStaticUpdates();
    const staticUpdateInterval = setInterval(() => checkForStaticUpdates(), 30 * 60 * 1000);
    Graceful.on("exit", () => clearInterval(staticUpdateInterval));

    log.info("Looking for realtime updates.");
    await checkForRealtimeUpdates();
    const realtimeUpdateInterval = setInterval(() => checkForRealtimeUpdates(), 10 * 1000);
    Graceful.on("exit", () => clearInterval(realtimeUpdateInterval));

    log.info("Starting web server.");
    await startServer({
        availableRegions,
        getRegion,
    });

    log.info("Connecting realtime regional events to web server.");
    mapRegionsSync(ds => {
        ds.registerTripUpdateListener(async update => {
            const tripId = await getShortNameForTrip(ds, update.trip);
            if (tripId == null) {
                if (LOG_TRIP_NOT_FOUND_FOR_TRIP_UPDATE) {
                    log.warn("Could not find trip for trip update.", update);
                }
                return;
            }
            const shortName = await ds.getShortNameByTripId(tripId);
            publishTripUpdate(ds.code, shortName, update);
        });
    });
    mapRegionsSync(ds => {
        ds.registerVehicleUpdateListener(async update => {
            const tripId = await getShortNameForTrip(ds, update.trip);
            if (tripId == null) {
                if (LOG_TRIP_NOT_FOUND_FOR_VEHICLE_UPDATE) {
                    log.warn("Could not find trip for vehicle update.", update);
                }
                return;
            }
            const shortName = await ds.getShortNameByTripId(tripId);
            publishVehiclePosition(ds.code, shortName, update);
        });
    });
})();
