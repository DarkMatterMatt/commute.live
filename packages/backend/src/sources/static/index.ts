import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import fetch from "node-fetch";
import path from "path";
import { SqlDatabase, importGtfs, openDb } from "gtfs";

interface RegionInfo {
    url: string;
    db: SqlDatabase;
}

const regions = new Map([
    ["akl", "https://cdn01.at.govt.nz/data/gtfs.zip"],
].map(([r, url]) => [r, { url } as RegionInfo]));

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

async function activateDb(region: string, dbPath: string) {
    const info = regions.get(region);
    if (info == null) {
        throw new Error(`Invalid region: ${region}`);
    }

    // open database
    info.db = await openDb({ sqlitePath: dbPath });
}

async function init() {
    // create directories and files for each region
    for (const region of regions.keys()) {
        // create `cache/REGION` directory
        const dir = path.join("cache", region);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        const lastUpdatePath = getLastUpdatePath(region);
        if (existsSync(lastUpdatePath)) {
            // load database
            const buf = await readFile(lastUpdatePath);
            const dbPath = getDbPath(region, new Date(buf.toString()));
            await activateDb(region, dbPath);
        }
        else {
            // create `cache/REGION/lastUpdate` file
            await writeFile(lastUpdatePath, new Date(0).toUTCString());
        }
    }

    isInitialized = true;
}

export function getRegionDb(region: string) {
    return regions.get(region)?.db ?? null;
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
    const updates = await Promise.allSettled([...regions.entries()].map(
        ([region, info]) => checkForUpdate(region, info.url)
    ));

    // apply updates
    for (const update of updates) {
        if (update.status === "fulfilled" && update.value != null) {
            const { region, timestamp } = update.value;
            await activateDb(region, getDbPath(region, timestamp));
        }
    }
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
