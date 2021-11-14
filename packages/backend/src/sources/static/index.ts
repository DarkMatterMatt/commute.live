import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import fetch from "node-fetch";
import path from "path";
import { importGtfs } from "gtfs";

const regions = new Map([
    ["akl", "https://cdn01.at.govt.nz/data/gtfs.zip"],
]);

let interval: null | ReturnType<typeof setInterval> = null;

let isInitialized = false;

function getRegionPath(region: string) {
    return path.join("cache", region);
}

function getDbPath(region: string, timestamp: Date) {
    const fname = `${timestamp.toISOString().replace(/\W+/g, "")}.db`;
    return path.join(getRegionPath(region), fname);
}

function getLastUpdatePath(region: string) {
    return path.join(getRegionPath(region), "lastUpdate");
}

function getZipPath(region: string, timestamp: Date) {
    const fname = `${timestamp.toISOString().replace(/\W+/g, "")}.zip`;
    return path.join(getRegionPath(region), fname);
}

async function init() {
    // create directories and files for each region
    for (const region of regions.keys()) {
        // create `cache/REGION` directory
        const dir = path.join("cache", region);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        // create `cache/REGION/lastUpdate` file
        const lastUpdatePath = getLastUpdatePath(region);
        if (!existsSync(lastUpdatePath)) {
            await writeFile(lastUpdatePath, new Date(0).toUTCString());
        }
    }

    isInitialized = true;
}

export function startBackgroundUpdateChecks() {
    interval = setInterval(checkForUpdates, 60 * 1000);
}

export function stopBackgroundUpdateChecks() {
    if (interval != null) {
        clearInterval(interval);
        interval = null;
    }
}

export async function checkForUpdates() {
    // make sure we've been initialized
    if (!isInitialized) {
        init();
    }

    // check each region for updates
    return Promise.allSettled([...regions.entries()].map(
        ([region, url]) => checkForUpdate(region, url)
    ));
}

export async function checkForUpdate(region: string, url: string) {
    const lastUpdatePath = getLastUpdatePath(region);
    const lastUpdate = await readFile(lastUpdatePath);

    const r = await fetch(url, {
        headers: { "If-Modified-Since": lastUpdate.toString() },
    });
    if (r.status === 304) {
        // we already have the latest data
        return null;
    }
    if (r.status === 200) {
        // fetch & store timestamp for update
        const lastModified = r.headers.get("Last-Modified");
        const timestamp = lastModified ? new Date(lastModified) : new Date();
        await writeFile(getLastUpdatePath(region), timestamp.toUTCString());

        // write new GTFS file to disk
        const data = await r.arrayBuffer().then(Buffer.from);
        await writeFile(getZipPath(region, timestamp), data);

        return update(region, timestamp);
    }

    throw new Error(`Failed loading GTFS from ${url}`);
}

export async function update(region: string, timestamp: Date) {
    const dbPath = getDbPath(region, timestamp);

    await importGtfs({
        agencies: [{
            path: getZipPath(region, timestamp),
        }],
        csvOptions: {
            skip_lines_with_error: true,
        },
        sqlitePath: dbPath,
    });

    return {
        region,
        timestamp,
        dbPath,
    };
}
