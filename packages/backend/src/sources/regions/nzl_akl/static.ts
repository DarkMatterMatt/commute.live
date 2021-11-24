import type { SqlDatabase } from "gtfs";
import type { Response } from "node-fetch";
import { closeDb, openDb, importGtfs } from "gtfs";
import { createWriteStream } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import fetch from "node-fetch";
import path from "path";
import { sleep } from "~/helpers/";
import { defaultProjection } from "~/MercatorProjection.js";

const GTFS_URL = "https://cdn01.at.govt.nz/data/gtfs.zip";

let cacheDir: string;

let db: null | SqlDatabase = null;

/**
 * Returns the currently opened database instance, or null if no database is open.
 */
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

async function getLastUpdate(): Promise<null | Date> {
    try {
        const fname = getLastUpdatePath();
        const dateStr = await readFile(fname, { encoding: "utf8" });
        return new Date(dateStr);
    }
    catch (err) {
        return null;
    }
}

/**
 * Open database (load from remote source if local cache does not exist).
 */
export async function initializeStatic(cacheDir_: string): Promise<void> {
    cacheDir = cacheDir_;

    const lastUpdate = await getLastUpdate();
    if (lastUpdate == null) {
        await checkForStaticUpdate();
    }
    else {
        const dbPath = getDbPath(lastUpdate);
        db = await openDb({ sqlitePath: dbPath });
        await postImport(db);
    }
}

/**
 * Returns true if an update was processed. Should be called regularly.
 */
export async function checkForStaticUpdate(): Promise<boolean> {
    const lastUpdate = await getLastUpdate() ?? new Date(0);

    const res = await fetch(GTFS_URL, {
        headers: { "If-Modified-Since": lastUpdate.toUTCString() },
    });
    if (res.status === 304) {
        // we already have the latest data
        return false;
    }
    if (res.status === 200) {
        await performUpdate(res);
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
    await postImport(newDb);

    // clean up in background
    cleanUp(zipPath, db);
    db = newDb;
}

/**
 * Generate any missing data.
 */
async function postImport(db: SqlDatabase): Promise<void> {
    // calculate our own shape_dist_traveled
    const shapeIds: { shapeId: string }[] = await db.all(`
        SELECT DISTINCT shape_id as shapeId
        FROM shapes
        WHERE shape_dist_traveled IS NULL
    `);

    if (shapeIds.length > 0) {
        await db.run(`
            CREATE TABLE tmp_shapes (
                id INTEGER PRIMARY KEY,
                shape_dist_traveled REAL
            )
        `);

        const maxInsertVariables = 800;
        const placeholders: string[] = [];
        const values: number[] = [];

        const actionBatch = async () => {
            if (values.length > 0) {
                await db.run(`
                    INSERT INTO tmp_shapes (id, shape_dist_traveled)
                    VALUES ${placeholders.join(",")}
                `, values);
            }

            // clear arrays
            values.length = 0;
            placeholders.length = 0;
        };

        const insertInBatch = async (id: number, dist: number) => {
            placeholders.push("(?, ?)");
            values.push(id, dist);

            // have filled up this batch, insert them now
            if (values.length + 2 > maxInsertVariables) {
                await actionBatch();
            }
        };

        for (const { shapeId } of shapeIds) {
            const points: {
                id: number,
                lat: number,
                lng: number,
            }[] = await db.all(`
                SELECT id, shape_pt_lat AS lat, shape_pt_lon AS lng
                FROM shapes
                WHERE shape_id=$shapeId
                ORDER BY shape_pt_sequence ASC
            `, {
                $shapeId: shapeId,
            });

            let dist = 0;
            await insertInBatch(points[0].id, dist);

            for (let i = 1; i < points.length; i++) {
                dist += defaultProjection.getDistBetweenLatLngs(points[i - 1], points[i]);
                await insertInBatch(points[i].id, dist);
            }
        }

        // update database with inserted values
        await db.run(`
            UPDATE shapes
            SET shape_dist_traveled=(
                SELECT shape_dist_traveled
                FROM tmp_shapes
                WHERE id=shapes.id) 
            WHERE EXISTS (
                SELECT shape_dist_traveled
                FROM tmp_shapes
                WHERE id=shapes.id)
        `);

        await db.run("DROP TABLE tmp_shapes");
    }

    // rebuilds the database file, repacking it into a minimal amount of disk space
    await db.run("VACUUM");
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
