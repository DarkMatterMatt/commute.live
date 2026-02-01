import { createWriteStream } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path, { basename } from "node:path";
import { pipeline } from "node:stream/promises";
import { chunk, defaultProjection, type Id, type JSONSerializable, Preconditions, sleep, type StrOrNull } from "@commutelive/common";
import Database from "better-sqlite3";
import { closeDb, importGtfs, openDb } from "gtfs";
import fetch, { type Response } from "node-fetch";
import Graceful from "node-graceful";
import { SqlBatcher } from "~/helpers/";
import { getLogger } from "~/log";
import type { SqlDatabase } from "~/types";
import { queryApiPtd } from "./api";
import { makeId } from "./id";

const log = getLogger("NZLAKL/static");

let gtfsUrl: string;
let staticApiUrl: string;

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
export async function initializeStatic(cacheDir_: string, gtfsUrl_: string, staticApiUrl_: string): Promise<void> {
    cacheDir = cacheDir_;
    gtfsUrl = gtfsUrl_;
    staticApiUrl = staticApiUrl_;

    await checkForStaticUpdate();

    const lastUpdate = await getLastUpdate();
    Preconditions.assert(lastUpdate != null);

    const dbPath = getDbPath(lastUpdate);
    db = new Database(dbPath, { readonly: true });
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
        const lastModifiedStr = res.headers.get("Last-Modified");
        const lastModified = lastModifiedStr ? new Date(lastModifiedStr) : new Date();
        if (+lastModified === +lastUpdate) {
            // we already have the latest data
            return false;
        }

        await performUpdate(res, lastModified);
        return true;
    }

    throw new Error(`Failed loading GTFS from ${gtfsUrl}.`);
}

/**
 * Download zip, import to database, remove zip & old database.
 */
async function performUpdate(res: Response, lastModified: Date): Promise<void> {
    log.info("Updating static data.");
    if (res.body == null) {
        // should never occur
        throw new Error(`Response returned empty body, ${res.url}`);
    }

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

    // open writeable database, run post-import functions, and then close it
    const newDb = openDb({ sqlitePath: dbPath });
    await postImport(newDb);
    closeDb(newDb);

    // clean up in background
    cleanUp(zipPath, db);

    // open the new database in read-only mode
    db = new Database(dbPath, { readonly: true });
}

/**
 * Generate any missing data.
 */
async function postImport(db: SqlDatabase): Promise<void> {
    log.info("Running post-import functions.");

    // the static GTFS data doesn't include school buses, but the REST API does. We'll query the
    // API to fetch any missing routes
    try {
        await supplementWithMissingRoutes(db);
    }
    catch (err) {
        log.warn("Failed to supplement GTFS with missing routes, continuing with GTFS-only data.", err);
    }

    // add index for routes.route_short_name
    db.prepare<[]>(`
        CREATE INDEX idx_routes_route_short_name
        ON routes (route_short_name)
    `).run();

    // add missing shape_dist_traveled
    await addShapeDistances(db);

    // add table summarising routes
    await addRouteSummaries(db);

    // rebuilds the database file, repacking it into a minimal amount of disk space
    // disabled for now because we run out of memory on servers with 1GB RAM
    //db.prepare<[]>("VACUUM").run();
}

async function queryGtfs<T>(url: string): Promise<T> {
    const res = await queryApiPtd(`${staticApiUrl}/${url}`);
    if (res.status !== 200) {
        throw new Error(`Got status ${res.status} from ${url}`);
    }
    const json = (await res.json() as { data: T });
    return json.data;
}

/**
 * Supplement GTFS data with missing routes and trips from the API.
 * For example, school buses exist in the API but not in the static GTFS data.
 */
async function supplementWithMissingRoutes(db: SqlDatabase): Promise<void> {
    log.info("Fetching routes from API to supplement GTFS data.");

    // Fetch all routes from API
    const rawApiRoutes = await queryGtfs<Partial<{
        type: string; // always 'route', because we're querying routes...
        id: string; // always attributes.route_id...
        attributes: Partial<{
            route_id: string;
            agency_id: string;
            route_short_name: string;
            route_long_name: string;
            route_type: number;
            // The API claims we might get the following, but I haven't seen them populated.
            // route_desc: string;
            // route_url: number;
            // route_color: string;
            // route_text_color: string;
            // route_sort_order: string;
        }>;
    }>[]>("routes");

    // Unbox the `attributes` field, ensure `route_id` & `route_type` are present.
    const apiRoutes = rawApiRoutes
        .map(r => r.attributes?.route_id && r.attributes?.route_type != null && {
            ...r.attributes,
            route_id: r.attributes?.route_id,
            route_type: r.attributes?.route_type,
        })
        .filter(r => !!r);

    // Get existing route_ids from database
    const existingRoutes = db.prepare<[], { route_id: string }>("SELECT route_id FROM routes").all();
    const existingRouteIds = new Set(existingRoutes.map(r => r.route_id));

    log.debug(`Found ${existingRouteIds.size} of ${apiRoutes.length} routes in GTFS.`);

    // Filter to find missing routes
    const missingRoutes = apiRoutes.filter(r => !existingRouteIds.has(r.route_id));
    if (missingRoutes.length === 0) {
        return;
    }

    // Get trip information for missing routes.
    const allTrips: {
        route_id: string;
        trip_id: string;
        service_id: string;
        trip_headsign?: string;
        direction_id?: number;
        shape_id?: string;
        wheelchair_accessible?: number;
        bikes_allowed?: number;
    }[] = [];
    for (const batch of chunk(missingRoutes, 20)) {
        const trips = await Promise.all(batch.map(async ({ route_id }) => {
            const rawRouteTrips = await queryGtfs<Partial<{
                type: string;
                id: string;
                attributes: Partial<{
                    service_id: string;
                    route_id: string;
                    trip_id: string;
                    trip_headsign: string;
                    direction_id: number;
                    shape_id: string;
                    wheelchair_accessible: number;
                    bikes_allowed: number;
                    // The API claims we might get the following, but I haven't seen them populated.
                    // trip_short_name: string;
                    // block_id: string;
                }>;
            }>[]>(`routes/${encodeURIComponent(route_id)}/trips`);

            // Unbox the `attributes` field, ensure `trip_id` is present.
            return rawRouteTrips
                .map(r => r.attributes?.trip_id && r.attributes?.service_id && {
                    ...r.attributes,
                    route_id,
                    service_id: r.attributes?.service_id,
                    trip_id: r.attributes?.trip_id,
                })
                .filter(r => !!r);
        }));
        allTrips.push(...trips.flatMap(t => t));
    }

    // Insert missing routes into routes table.
    const routeBatcher = new SqlBatcher<[
        string, // route_id
        StrOrNull, // agency_id
        StrOrNull, // route_short_name
        StrOrNull, // route_long_name
        number, // route_type
    ]>({
        db,
        table: "routes",
        columns: [
            "route_id",
            "agency_id",
            "route_short_name",
            "route_long_name",
            "route_type",
        ],
    });

    for (const route of missingRoutes) {
        await routeBatcher.queue(
            route.route_id,
            route.agency_id ?? null,
            route.route_short_name ?? null,
            route.route_long_name ?? null,
            route.route_type,
        );
    }
    await routeBatcher.flush();

    // Insert missing trips into trips table.
    const tripBatcher = new SqlBatcher<[
        string, // route_id
        string, // service_id
        string, // trip_id
        StrOrNull, // trip_headsign
        number | null, // direction_id
        StrOrNull, // shape_id
        number | null, // wheelchair_accessible
        number | null, // bikes_allowed
    ]>({
        db,
        table: "trips",
        columns: [
            "route_id",
            "service_id",
            "trip_id",
            "trip_headsign",
            "direction_id",
            "shape_id",
            "wheelchair_accessible",
            "bikes_allowed",
        ],
    });

    for (const trip of allTrips) {
        await tripBatcher.queue(
            trip.route_id,
            trip.service_id,
            trip.trip_id,
            trip.trip_headsign ?? null,
            trip.direction_id ?? null,
            trip.shape_id ?? null,
            trip.wheelchair_accessible ?? null,
            trip.bikes_allowed ?? null,
        );
    }
    await tripBatcher.flush();

    log.verbose(`Supplemented GTFS with ${missingRoutes.length} routes and ${allTrips.length} trips.`);
}

/**
 * Generate missing shape_dist_traveled in shapes table.
 */
async function addShapeDistances(db: SqlDatabase): Promise<void> {
    log.debug("Adding missing shape distances.");

    // calculate our own shape_dist_traveled
    const shapeIds = (db.prepare<[]>(`
        SELECT DISTINCT shape_id
        FROM shapes
        WHERE shape_dist_traveled IS NULL
    `).all() as { shape_id: string }[]).map(r => r.shape_id);

    if (shapeIds.length === 0) {
        return;
    }

    db.prepare<[]>(`
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
        const points = db.prepare<{ shapeId: string }>(`
            SELECT id, shape_pt_lat AS lat, shape_pt_lon AS lng
            FROM shapes
            WHERE shape_id=$shapeId
            ORDER BY shape_pt_sequence ASC
        `).all({ shapeId }) as {
            id: number,
            lat: number,
            lng: number,
        }[];

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
    db.prepare<[]>(`
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

    db.prepare<[]>("DROP TABLE tmp_shapes").run();
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

    let routes = db.prepare<[]>(`
        SELECT
            direction_id AS directionId,
            route_long_name AS longName,
            SUM(service_count) AS routeCount,
            COALESCE(shape_length, 0) AS routeLength,
            route_type AS routeType,
            T.shape_id AS shapeId,
            route_short_name AS shortName,
            ${normaliseLongName("trip_headsign")} AS tripHeadsign
        FROM trips T
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
        LEFT JOIN (
            SELECT
                shape_id,
                MAX(shape_dist_traveled) as shape_length
            FROM shapes
            GROUP BY shape_id
        ) S ON S.shape_id=T.shape_id
        GROUP BY direction_id, route_long_name, trip_headsign
    `).all() as {
        directionId: 0 | 1;
        longName: string;
        routeCount: number;
        routeLength: number;
        routeType: number;
        shapeId: StrOrNull;
        shortName: string;
        tripHeadsign: string;
    }[];

    // Auckland Transport no longer provides route_long_name, so we use the trip headsign instead.
    routes = routes.map(({ longName, shortName, tripHeadsign, ...rest }) => ({
        longName: /^\w+$/.test(longName) ? tripHeadsign : longName,
        shortName,
        tripHeadsign,
        ...rest,
    }));

    db.prepare<[]>(`
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

        // find the "best" shape (by frequency and length), and the corresponding long name.
        for (const directionId of [0, 1] as const) {
            let possibilities = possibilitiesByDirection[directionId];
            if (possibilities.length === 0) {
                // no long names for this direction
                continue;
            }

            // we want routes that occur often (at least 60% as often as the most common route)
            if (possibilities.length > 1) {
                const maxOccurrences = Math.max(...possibilities.map(p => p.routeCount));
                possibilities = possibilities.filter(p => p.routeCount >= maxOccurrences * 0.6);
            }

            // we want routes that are long (at least 90% as long as the longest route)
            if (possibilities.length > 1) {
                const maxLength = Math.max(...possibilities.map(p => p.routeLength));
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
        oldDatabase.close();
        await unlink(oldDatabase.name);
    }
}
