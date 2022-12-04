import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path, { join } from "node:path";
import fetch from "node-fetch";
import env from "~/env";
import { getDatabase } from "./static";
import { getRouteIdsByShortNames, getTripIdsByShortNames } from "./static_queries";

const ROUTES_URL = "https://api.at.govt.nz/v2/gtfs/routes";

const TRIPS_URL = "https://api.at.govt.nz/v2/gtfs/trips";

let oldTripIdToNewTripId = new Map<string, string>();
let oldRouteIdToNewRouteId = new Map<string, string>();

let cacheDir: string;

function cache(fname: string): string {
    return path.join(cacheDir, fname);
}

async function getLastUpdate(fname: string): Promise<null | Date> {
    try {
        const dateStr = await readFile(fname, { encoding: "utf8" });
        return new Date(dateStr);
    }
    catch (err) {
        return null;
    }
}

async function fetchWithCache(url: string, lastUpdateFname: string, cacheFname: string): Promise<[boolean, string]> {
    const res = await fetch(url, {
        headers: {
            "Ocp-Apim-Subscription-Key": env.AUCKLAND_TRANSPORT_KEY,
            "If-Modified-Since": (await getLastUpdate(lastUpdateFname) ?? new Date(0)).toUTCString(),
        },
    });
    if (res.status === 304) {
        return [false, await readFile(cacheFname, { encoding: "utf8" })];
    }
    if (res.status !== 200) {
        throw new Error(`Unexpected status code ${res.status} from ${url}`);
    }
    const text = await res.text();
    const lastModifiedStr = res.headers.get("Last-Modified");
    const lastModified = lastModifiedStr ? new Date(lastModifiedStr) : new Date();

    await Promise.all([
        writeFile(cacheFname, text),
        writeFile(lastUpdateFname, lastModified.toISOString()),
    ]);
    return [true, text];
}

export async function initialize(cacheDir_: string): Promise<void> {
    cacheDir = join(cacheDir_, "convertOldIds");
    mkdirSync(cacheDir, { recursive: true });
    await checkForUpdate();
}

export async function checkForUpdate(): Promise<boolean> {
    const [routesUpdated, routesText] = await fetchWithCache(
        ROUTES_URL, cache("routesLastUpdate.txt"), cache("routesLastData.json"));
    const [tripsUpdated, tripsText] = await fetchWithCache(
        TRIPS_URL, cache("tripsLastUpdate.txt"), cache("tripsLastData.json"));

    if (!routesUpdated && !tripsUpdated) {
        return false;
    }
    await performUpdate(routesText, tripsText);
    return true;
}

export async function performUpdate(routesRes: string, tripsRes: string): Promise<void> {
    const routesJson = JSON.parse(routesRes) as {
        response: {
            route_id: string;
            route_short_name: string;
        }[];
    };

    const tripsJson = JSON.parse(tripsRes) as {
        response: {
            route_id: string;
            trip_id: string;
        }[];
    };

    const routeIdToShortName = new Map(routesJson.response.map(r => [r.route_id, r.route_short_name]));
    const shortNameToNewRouteId = await getRouteIdsByShortNames(getDatabase(), [...routeIdToShortName.values()]);
    const shortNameToNewTripId = await getTripIdsByShortNames(getDatabase(), [...routeIdToShortName.values()]);

    const oldRouteIdToNewRouteId_ = new Map<string, string>();
    for (const [routeId, shortName] of routeIdToShortName) {
        const newRouteId = shortNameToNewRouteId.get(shortName);
        if (newRouteId != null && newRouteId.length > 0) {
            oldRouteIdToNewRouteId_.set(routeId, newRouteId[0]);
        }
    }
    oldRouteIdToNewRouteId = oldRouteIdToNewRouteId_;

    const oldTripIdToNewTripId_ = new Map<string, string>();
    for (const { trip_id, route_id } of tripsJson.response) {
        const shortName = routeIdToShortName.get(route_id);
        if (shortName != null) {
            const newTripId = shortNameToNewTripId.get(shortName);
            if (newTripId != null && newTripId.length > 0) {
                oldTripIdToNewTripId.set(trip_id, newTripId[0]);
            }
        }
    }
    oldTripIdToNewTripId = oldTripIdToNewTripId_;
}

export function getNewRouteIdFromOldRouteId(tripId: string): string | undefined {
    return oldRouteIdToNewRouteId.get(tripId);
}

export function getNewTripIdFromOldTripId(tripId: string): string | undefined {
    return oldTripIdToNewTripId.get(tripId);
}
