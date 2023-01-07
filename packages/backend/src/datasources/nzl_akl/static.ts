import { createWriteStream } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path, { basename } from "node:path";
import { pipeline } from "node:stream/promises";
import { defaultProjection, type Id, type JSONSerializable, sleep, type StrOrNull } from "@commutelive/common";
import { closeDb, importGtfs, openDb } from "gtfs";
import fetch, { type Response } from "node-fetch";
import Graceful from "node-graceful";
import { SqlBatcher } from "~/helpers/";
import { getLogger } from "~/log.js";
import type { SqlDatabase } from "~/types";
import { makeId } from "./id";

const log = getLogger("NZLAKL/static");

let gtfsUrl: string;

let cacheDir: string;

let db: null | SqlDatabase = null;

Graceful.on("exit", () => db?.close());

export async function getStatus(): Promise<JSONSerializable> {
    return {
        dbFilename: basename(getDatabase().name),
    };
}

/**
 * Returns the currently opened database instance.
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
export async function initializeStatic(cacheDir_: string, gtfsUrl_: string): Promise<void> {
    cacheDir = cacheDir_;
    gtfsUrl = gtfsUrl_;

    const lastUpdate = await getLastUpdate();
    if (lastUpdate == null) {
        await checkForStaticUpdate();
    }
    else {
        const dbPath = getDbPath(lastUpdate);
        db = await openDb({ sqlitePath: dbPath });
    }
}

/**
 * Returns true if an update was processed. Should be called regularly.
 */
export async function checkForStaticUpdate(): Promise<boolean> {
    const lastUpdate = await getLastUpdate() ?? new Date(0);

    const res = await fetch(gtfsUrl, {
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

    throw new Error(`Failed loading GTFS from ${gtfsUrl}.`);
}

/**
 * Download zip, import to database, remove zip & old database.
 */
async function performUpdate(res: Response): Promise<void> {
    log.info("Updating static data.");
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
        verbose: false,
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
    log.info("Running post-import functions.");

    // add index for routes.route_short_name
    db.prepare(`
        CREATE INDEX idx_routes_route_short_name
        ON routes (route_short_name)
    `).run();

    // add missing shape_dist_traveled
    await addShapeDistances(db);

    // add table summarising routes
    await addRouteSummaries(db);

    // rebuilds the database file, repacking it into a minimal amount of disk space
    // disabled for now because we run out of memory on servers with 1GB RAM
    //db.prepare("VACUUM").run();
}

/**
 * Generate missing shape_dist_traveled in shapes table.
 */
async function addShapeDistances(db: SqlDatabase): Promise<void> {
    log.debug("Adding missing shape distances.");

    // calculate our own shape_dist_traveled
    const shapeIds = (db.prepare(`
        SELECT DISTINCT shape_id
        FROM shapes
        WHERE shape_dist_traveled IS NULL
    `).all() as { shape_id: string }[]).map(r => r.shape_id);

    if (shapeIds.length === 0) {
        return;
    }

    db.prepare(`
        CREATE TABLE tmp_shapes (
            id INTEGER PRIMARY KEY,
            shape_dist_traveled REAL
        )
    `).run();

    const batcher = new SqlBatcher<[number, number]>({
        db,
        table: "tmp_shapes",
        columns: ["id", "shape_dist_traveled"],
    });

    for (const shapeId of shapeIds) {
        const points: {
            id: number,
            lat: number,
            lng: number,
        }[] = db.prepare(`
            SELECT id, shape_pt_lat AS lat, shape_pt_lon AS lng
            FROM shapes
            WHERE shape_id=$shapeId
            ORDER BY shape_pt_sequence ASC
        `).all({ shapeId });

        let dist = 0;
        await batcher.queue(points[0].id, dist);

        for (let i = 1; i < points.length; i++) {
            // distance is returned in meters, Auckland Transport uses kilometers
            dist += defaultProjection.getDistBetweenLatLngs(points[i - 1], points[i]) / 1000;
            await batcher.queue(points[i].id, dist);
        }
    }

    await batcher.flush();

    // update database with inserted values
    db.prepare(`
        UPDATE shapes
        SET shape_dist_traveled=(
            SELECT shape_dist_traveled
            FROM tmp_shapes
            WHERE id=shapes.id)
        WHERE EXISTS (
            SELECT shape_dist_traveled
            FROM tmp_shapes
            WHERE id=shapes.id)
    `).run();

    db.prepare("DROP TABLE tmp_shapes").run();
}

/**
 * Creates route_summaries table with basic route data (short name & route type,
 * long names & shapes for each direction).
 */
async function addRouteSummaries(db: SqlDatabase): Promise<void> {
    log.debug("Adding route summaries.");

    // converts '19990531' -> JULIANDAY('1999-05-31') -> 2451329.5
    const julianDay = (field: string) =>
        `JULIANDAY(SUBSTR(${field}, 1, 4) || '-' || SUBSTR(${field}, 5, 2) || '-' || SUBSTR(${field}, 7, 2))`;

    // make To and Via lowercase, remove full stops
    const normaliseLongName = (field: string) => `REPLACE(REPLACE(REPLACE(REPLACE(${field},
        ' To ', ' to '),
        ' Via ', ' via '),
        'Stn', 'Station'),
        '.', '')`;

    let routes: {
        directionId: 0 | 1;
        longName: string;
        routeCount: number;
        routeLength: number;
        routeType: number;
        shapeId: string;
        shortName: string;
        tripHeadsign: string;
    }[] = db.prepare(`
        SELECT
            direction_id AS directionId,
            route_long_name AS longName,
            SUM(service_count) AS routeCount,
            shape_length AS routeLength,
            route_type AS routeType,
            T.shape_id AS shapeId,
            route_short_name AS shortName,
            ${normaliseLongName("trip_headsign")} AS tripHeadsign
        FROM trips T
        INNER JOIN (
            SELECT
                shape_id,
                MAX(shape_dist_traveled) as shape_length
            FROM shapes
            GROUP BY shape_id
        ) S ON S.shape_id=T.shape_id
        INNER JOIN (
            SELECT service_id, CAST(
                    (monday + tuesday + wednesday + thursday + friday + saturday + sunday)
                    * (1 + ${julianDay("end_date")} - ${julianDay("start_date")})
                AS INT) AS service_count
            FROM calendar
        ) C ON C.service_id=T.service_id
        INNER JOIN (
            SELECT route_id, route_short_name, ${normaliseLongName("route_long_name")} AS route_long_name, route_type
            FROM routes
        ) R ON R.route_id=T.route_id
        GROUP BY direction_id, route_long_name, trip_headsign
    `).all();

    // Auckland Transport no longer provides route_long_name, so we use the trip headsign instead.
    routes = routes.map(({ longName, shortName, tripHeadsign, ...rest }) => ({
        longName: (longName && longName !== shortName) ? longName : tripHeadsign,
        shortName,
        tripHeadsign,
        ...rest,
    }));

    db.prepare(`
        CREATE TABLE route_summaries (
            id VARCHAR(255) NOT NULL,
            route_long_name_0 VARCHAR(255),
            route_long_name_1 VARCHAR(255),
            route_short_name VARCHAR(255),
            route_type INTEGER NOT NULL,
            shape_id_0 VARCHAR(255),
            shape_id_1 VARCHAR(255),
            PRIMARY KEY (id)
        )
    `).run();

    const batcher = new SqlBatcher<[Id, StrOrNull, StrOrNull, string, number, StrOrNull, StrOrNull]>({
        db,
        table: "route_summaries",
        columns: [
            "id",
            "route_long_name_0",
            "route_long_name_1",
            "route_short_name",
            "route_type",
            "shape_id_0",
            "shape_id_1",
        ],
    });

    const maxInArr = <T>(arr: T[], getter: (item: T) => number) =>
        arr.reduce((a, b) => Math.max(a, getter(b)), -Infinity);

    type RouteWithId = typeof routes[0] & { id: Id };
    const routesByKey = new Map<string, [RouteWithId[], RouteWithId[]]>();
    for (const r of routes) {
        const id = makeId(r.shortName);
        const arr = routesByKey.get(id) ?? [[], []];
        arr[r.directionId].push({ ...r, id });
        routesByKey.set(id, arr);
    }

    for (const possibilitiesByDirection of routesByKey.values()) {
        const { id, shortName, routeType } = (possibilitiesByDirection[0][0] ?? possibilitiesByDirection[1][0]);
        const longNames: [StrOrNull, StrOrNull] = [null, null];
        const shapeIds: [StrOrNull, StrOrNull] = [null, null];

        for (const directionId of [0, 1] as const) {
            let possibilities = possibilitiesByDirection[directionId];
            if (possibilities.length === 0) {
                // no long names for this direction
                continue;
            }

            // we want routes that occur often (at least 60% as often as the most common route)
            if (possibilities.length > 1) {
                const maxOccurrences = maxInArr(possibilities, p => p.routeCount);
                possibilities = possibilities.filter(p => p.routeCount >= maxOccurrences * 0.6);
            }

            // we want routes that are long (at least 90% as long as the longest route)
            if (possibilities.length > 1) {
                const maxLength = maxInArr(possibilities, p => p.routeLength);
                possibilities = possibilities.filter(p => p.routeLength >= maxLength * 0.9);
            }

            // break ties by longest first, then alphabetically
            possibilities.sort(({ longName: a }, { longName: b }) => b.length - a.length || a.localeCompare(b));

            longNames[directionId] = possibilities[0].longName;
            shapeIds[directionId] = possibilities[0].shapeId;
        }

        // add to database
        await batcher.queue(id, longNames[0], longNames[1], shortName, routeType, shapeIds[0], shapeIds[1]);
    }
    await batcher.flush();
}

/**
 * Delete temp zip file, delete previous database.
 */
async function cleanUp(zipPath: string, oldDatabase: null | SqlDatabase): Promise<void> {
    log.debug("Cleaning up old data.");

    // TODO: surely this can be done better than using sleep()
    // assume that in 30 secs nobody will be using the old data
    await sleep(30 * 1000);

    await unlink(zipPath);
    if (oldDatabase != null) {
        await closeDb(oldDatabase);
        await unlink(oldDatabase.name);
    }
}
