import type { SqlDatabase } from "gtfs";
import type { Shapes } from "gtfs-types";
import type { Response } from "node-fetch";
import { closeDb, openDb, importGtfs } from "gtfs";
import { createWriteStream } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import fetch from "node-fetch";
import path from "path";
import { pipeStreamTo, sleep } from "~/helpers/";

const GTFS_URL = "https://cdn01.at.govt.nz/data/gtfs.zip";

let db: null | SqlDatabase = null;

function getLastUpdatePath(cacheDir: string): string {
    return path.join(cacheDir, "lastUpdate.txt");
}

function getZipPath(cacheDir: string, date: Date): string {
    return path.join(cacheDir, `${date.toISOString()}.zip`);
}

function getDbPath(cacheDir: string, date: Date): string {
    return path.join(cacheDir, `${date.toISOString()}.db`);
}

async function getLastUpdate(cacheDir: string): Promise<Date> {
    try {
        const fname = getLastUpdatePath(cacheDir);
        const dateStr = await readFile(fname, { encoding: "utf8" });
        return new Date(dateStr);
    }
    catch (err) {
        return new Date(0);
    }
}

export async function checkForStaticUpdate(cacheDir: string): Promise<boolean> {
    const lastUpdate = await getLastUpdate(cacheDir);

    const res = await fetch(GTFS_URL, {
        headers: { "If-Modified-Since": lastUpdate.toUTCString() },
    });
    if (res.status === 304) {
        // we already have the latest data
        return false;
    }
    if (res.status === 200) {
        await performUpdate(res, cacheDir);
        return true;
    }

    throw new Error(`Failed loading GTFS from ${GTFS_URL}`);
}

/**
 * Download zip, import to database, remove zip & old database.
 */
async function performUpdate(res: Response, cacheDir: string): Promise<void> {
    if (res.body == null) return;

    // fetch & store timestamp for update
    const lastModifiedStr = res.headers.get("Last-Modified");
    const lastModified = lastModifiedStr ? new Date(lastModifiedStr) : new Date();

    // write last update timestamp to disk
    const fname = getLastUpdatePath(cacheDir);
    await writeFile(fname, lastModified.toISOString(), { encoding: "utf8" });

    // write new GTFS file to disk
    const zipPath = getZipPath(cacheDir, lastModified);
    const outputStream = createWriteStream(zipPath);
    await pipeStreamTo(res.body, outputStream);

    // import to database
    const dbPath = getDbPath(cacheDir, lastModified);
    await importGtfs({
        agencies: [{ path: zipPath }],
        sqlitePath: dbPath,
    });

    // clean up in background
    cleanUp(zipPath, db);

    db = await openDb({ sqlitePath: dbPath });
}

/**
 * Delete temp zip file, delete previous database.
 */
async function cleanUp(zipPath: string, oldDatabase: null | SqlDatabase) {
    // assume that in 30 secs nobody will be using the old data
    await sleep(30 * 1000);

    unlink(zipPath);
    if (oldDatabase != null) {
        closeDb(oldDatabase);
        unlink(oldDatabase.config.filename);
    }
}

export async function getShapesByShortName(shortName: string): Promise<Shapes[]> {
    throw new Error("Function not implemented.");
}

export async function getShortName(tripId: string): Promise<string> {
    throw new Error("Function not implemented.");
}

export async function getTripId(routeId: string, directionId: number, startTime: string): Promise<string> {
    throw new Error("Function not implemented.");
}
