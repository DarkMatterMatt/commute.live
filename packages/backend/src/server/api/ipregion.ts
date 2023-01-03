import { createWriteStream, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { type RegionResult } from "@commutelive/common";
import maxmind, { type CityResponse, type Reader } from "maxmind";
import fetch from "node-fetch";
import { defaultProjection, sleep } from "~/helpers/";
import { getLogger } from "~/log.js";
import { GetRouteGenerator } from "./GetRoute.js";

const URL = "https://download.db-ip.com/free/dbip-city-lite-{{YEAR}}-{{MONTH}}.mmdb.gz";

const log = getLogger("server/api/ipregion");

let ipDb: null | Reader<CityResponse> = null;

function getDb() {
    if (ipDb == null) {
        throw new Error("IP Geo database not loaded.");
    }
    return ipDb;
}

function getYearAndMonth(date?: Date) {
    date ??= new Date();
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    return { year, month };
}

function getLastYearAndMonth() {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - 1);
    return getYearAndMonth(date);
}

async function downloadDatabase(url: string, outputFname: string) {
    const res = await fetch(url);
    if (res.status !== 200 || res.body == null) {
        throw new Error(`Failed downloading IP Geo database from URL: ${url}`);
    }
    await pipeline(res.body, createGunzip(), createWriteStream(outputFname));
}

function getFname(cacheDir: string, year: number, month: number) {
    const yearStr = year.toString();
    const monthStr = month.toString().padStart(2, "0");
    return join(cacheDir, `dbip-city-lite-${yearStr}-${monthStr}.mmdb`);
}

/**
 * Delete previous database.
 */
async function cleanUp(cacheDir: string, oldYear: number, oldMonth: number): Promise<void> {
    log.debug("Cleaning up old data.");

    // TODO: surely this can be done better than using sleep()
    // assume that in 30 secs nobody will be using the old data
    await sleep(30 * 1000);

    const fname = getFname(cacheDir, oldYear, oldMonth);
    if (existsSync(fname)) {
        await unlink(fname);
    }
}

async function downloadDatabaseByDate(cacheDir: string, year: number, month: number) {
    const yearStr = year.toString();
    const monthStr = month.toString().padStart(2, "0");

    const url = URL.replace("{{YEAR}}", yearStr).replace("{{MONTH}}", monthStr);
    const fname = getFname(cacheDir, year, month);

    if (existsSync(fname)) {
        if (ipDb == null) {
            ipDb = await maxmind.open<CityResponse>(fname);
            log.info(`Using existing IP Geo database: ${fname}`);
        }
        return false;
    }

    try {
        await downloadDatabase(url, fname);
        ipDb = await maxmind.open<CityResponse>(fname);
        log.info(`Using new IP Geo database: ${fname}`);
        return true;
    }
    catch (err) {
        log.debug(`Failed downloading IP Geo database for ${year}-${month.toString().padStart(2, "0")}`);
        return false;
    }
}

async function downloadDatabaseIfNeeded(cacheDir: string) {
    const { year, month } = getYearAndMonth();

    const updated = await downloadDatabaseByDate(cacheDir, year, month);
    if (!updated) {
        return;
    }

    const { year: oldYear, month: oldMonth } = getLastYearAndMonth();
    await cleanUp(cacheDir, oldYear, oldMonth);
}

export const ipRegionRoute = new GetRouteGenerator({
    name: "ipregion",
    requiredParams: [] as const,
    optionalParams: [] as const,
    executor: async (route, { headers, res, regions }) => {
        const ip = headers["x-forwarded-for"]?.split(",")?.[0]
            ?? Buffer.from(res.getRemoteAddressAsText()).toString();

        const coords = getDb().get(ip)?.location;
        if (coords == null) {
            return route.finish("error", {
                message: "Failed to get IP region.",
            });
        }
        const userLocation = { lat: coords.latitude, lng: coords.longitude };

        let closestRegion = [regions[0], Infinity] as const;
        for (const region of regions) {
            const dist = defaultProjection.getDistBetweenLatLngs(userLocation, region.location);
            if (dist < closestRegion[1]) {
                closestRegion = [region, dist];
            }
        }

        const [region] = closestRegion;
        const result: RegionResult = {
            code: region.code,
            location: region.location,
            country: region.country,
            region: region.region,
            attributionHTML: region.attributionHTML,
        };

        return route.finish("success", {
            message: "See region found.",
            result,
            userLocation,
        });
    },

    initialize: async ({ cacheDir }) => {
        await downloadDatabaseIfNeeded(cacheDir);
    },
});
