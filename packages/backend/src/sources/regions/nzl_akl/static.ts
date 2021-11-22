import type { SqlDatabase } from "gtfs";
import type { Shapes, Trip } from "gtfs-types";
import type { Response } from "node-fetch";
import { closeDb, openDb, importGtfs } from "gtfs";
import { createWriteStream } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import fetch from "node-fetch";
import path from "path";
import { sleep } from "~/helpers/";

const GTFS_URL = "https://cdn01.at.govt.nz/data/gtfs.zip";

let cacheDir: string;

let db: null | SqlDatabase = null;

export function getDatabase(): SqlDatabase {
    if (db == null) {
        throw new Error("Database is not open yet.");
    }
    return db;
}

function getLastUpdatePath(): string {
    return path.join(cacheDir, "lastUpdate.txt");
}

function getZipPath(date: Date): string {
    return path.join(cacheDir, `${date.toISOString().replace(/\W/g, "")}.zip`);
}

function getDbPath(date: Date): string {
    return path.join(cacheDir, `${date.toISOString().replace(/\W/g, "")}.db`);
}

async function getLastUpdate(): Promise<Date> {
    try {
        const fname = getLastUpdatePath();
        const dateStr = await readFile(fname, { encoding: "utf8" });
        return new Date(dateStr);
    }
    catch (err) {
        return new Date(0);
    }
}

export async function initializeStatic(cacheDir_: string): Promise<void> {
    cacheDir = cacheDir_;

    try {
        const lastUpdate = await getLastUpdate();
        const dbPath = getDbPath(lastUpdate);
        db = await openDb({ sqlitePath: dbPath });
    }
    catch (err) {
        console.warn(err);
        await checkForStaticUpdate();
        console.log("initializeStatic err finished");
    }
}

export async function checkForStaticUpdate(): Promise<boolean> {
    const lastUpdate = await getLastUpdate();

    const res = await fetch(GTFS_URL, {
        headers: { "If-Modified-Since": lastUpdate.toUTCString() },
    });
    console.log("checkForStaticUpdate", res.status);
    if (res.status === 304) {
        // we already have the latest data
        return false;
    }
    if (res.status === 200) {
        console.log("performUpdate start");
        await performUpdate(res);
        console.log("performUpdate end");
        return true;
    }

    throw new Error(`Failed loading GTFS from ${GTFS_URL}`);
}

/**
 * Download zip, import to database, remove zip & old database.
 */
async function performUpdate(res: Response): Promise<void> {
    if (res.body == null) {
        // should never occur
        throw new Error(`Response returned empty body, ${res.url}`);
    }
    console.log("Performing update");

    // fetch & store timestamp for update
    const lastModifiedStr = res.headers.get("Last-Modified");
    const lastModified = lastModifiedStr ? new Date(lastModifiedStr) : new Date();

    // write last update timestamp to disk
    const fname = getLastUpdatePath();
    await writeFile(fname, lastModified.toISOString(), { encoding: "utf8" });

    // write new GTFS file to disk
    const zipPath = getZipPath(lastModified);
    const outputStream = createWriteStream(zipPath);
    await pipeline(res.body, outputStream);

    // import to database
    const dbPath = getDbPath(lastModified);
    await importGtfs({
        agencies: [{ path: zipPath }],
        sqlitePath: dbPath,
    });

    const newDb = await openDb({ sqlitePath: dbPath });

    // clean up in background
    cleanUp(zipPath, db);
    db = newDb;
}

}

/**
 * Delete temp zip file, delete previous database.
 */
async function cleanUp(zipPath: string, oldDatabase: null | SqlDatabase): Promise<void> {
    // assume that in 30 secs nobody will be using the old data
    await sleep(30 * 1000);

    unlink(zipPath);
    if (oldDatabase != null) {
        closeDb(oldDatabase);
        unlink(oldDatabase.config.filename);
    }
}

export async function getLongNameByShortName(shortName: string): Promise<string> {
    const result = await getDatabase().get(`
        SELECT route_long_name
        FROM routes
        WHERE route_short_name=$shortName
        ORDER BY LENGTH(route_long_name) DESC, route_long_name ASC
        LIMIT 1
    `, {
        $shortName: shortName,
    });

    if (result == null) {
        throw new Error(`Could not find route ${shortName}`);
    }

    // make To and Via lowercase, remove full stops
    return result.route_long_name
        .replace(/To/g, "to")
        .replace(/Via/g, "via")
        .replace(/\./g, "");
}

export async function getShapeByShortName(_shortName: string): Promise<Shapes[]> {
    // choosing algorithm:
    //   1. 
}

export async function getShortName(tripId: string): Promise<string> {
    const result = await getDatabase().get(`
        SELECT route_short_name
        FROM trips
        INNER JOIN routes ON trips.route_id=routes.route_id
        WHERE trip_id=$tripId
    `, {
        $tripId: tripId,
    });

    if (result == null) {
        throw new Error(`Could not find trip ${tripId}`);
    }
    return result.route_short_name;
}

export async function getTripId(routeId: string, directionId: number, startTime: string): Promise<string> {
    const result = await getDatabase().get(`
        SELECT trips.trip_id
        FROM trips
        INNER JOIN stop_times ON trips.trip_id=stop_times.trip_id
        WHERE route_id=$routeId AND direction_id=$directionId
            AND stop_sequence=1 AND (arrival_time=$startTime OR departure_time=$startTime)
    `, {
        $routeId: routeId,
        $directionId: directionId,
        $startTime: startTime,
    });

    if (result == null) {
        throw new Error(
            `Could not find trip matching route=${routeId}, direction=${directionId}, startTime=${startTime}`);
    }
    return result.trip_id;
}
