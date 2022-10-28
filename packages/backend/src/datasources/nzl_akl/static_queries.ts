import { SqlDatabase } from "gtfs";
import { defaultProjection } from "~/helpers/";
import { LatLng, RouteSummary, ShapeLatLng, StrOrNull } from "~/types";

async function getLongNameByShortNameDirection(
    db: SqlDatabase,
    shortName: string,
    directionId: 0 | 1,
): Promise<StrOrNull> {
    const result = await db.get<{ longName: string }>(`
        SELECT route_long_name_${directionId} AS longName
        FROM route_summaries
        WHERE route_short_name=$shortName
    `, { $shortName: shortName });

    return result?.longName ?? null;
}

/**
 * Returns an appropriate long name for the given short name.
 *
 * Selects the longest name (prefer more detailed names), breaks ties by lexicographical order.
 */
export async function getLongNamesByShortName(
    db: SqlDatabase,
    shortName: string,
): Promise<[StrOrNull, StrOrNull]> {
    const [ln1, ln2] = await Promise.all([
        getLongNameByShortNameDirection(db, shortName, 0),
        getLongNameByShortNameDirection(db, shortName, 1),
    ]);

    return [ln1, ln2];
}

/**
 * Returns the type of route for the given short name.
 *
 * @see https://developers.google.com/transit/gtfs/reference#routestxt.
 */
export async function getRouteTypeByShortName(
    db: SqlDatabase,
    shortName: string,
): Promise<number> {
    const result = await db.get(`
        SELECT route_type
        FROM routes
        WHERE route_short_name=$shortName
        LIMIT 1
    `, { $shortName: shortName });

    if (result == null) {
        throw new Error(`Could not find route ${shortName}`);
    }
    return result.route_type;
}

/**
 * Returns summarising data for all routes (by short name) in the datasource.
 */
export async function getRoutesSummary(
    db: SqlDatabase,
): Promise<Map<string, RouteSummary>> {
    const result: {
        longName0: StrOrNull;
        longName1: StrOrNull;
        shortName: string;
        routeType: number;
        shapeId0: StrOrNull;
        shapeId1: StrOrNull;
    }[] = await db.all(`
        SELECT
            route_long_name_0 AS longName0,
            route_long_name_1 AS longName1,
            route_short_name AS shortName,
            route_type AS routeType,
            shape_id_0 AS shapeId0,
            shape_id_1 AS shapeId1
        FROM route_summaries
    `);

    return new Map(result.map(r => [
        r.shortName,
        {
            longNames: [r.longName0, r.longName1],
            shapeIds: [r.shapeId0, r.shapeId1],
            shortName: r.shortName,
            type: r.routeType,
        },
    ]));
}

/**
 * Returns a polyline shape for the specified short name and direction.
 *
 * Selects the longest shape (by distance), breaks ties by version number.
 * Returns an empty shape if there is no matching shape.
 */
async function getShapeByShortName(
    db: SqlDatabase,
    shortName: string,
    directionId: number,
): Promise<LatLng[]> {
    const shapeIdQuery = `
        SELECT trips.shape_id
        FROM routes
        INNER JOIN trips ON routes.route_id=trips.route_id
        INNER JOIN shapes ON trips.shape_id=shapes.shape_id
        WHERE route_short_name=$shortName AND direction_id=$directionId
        ORDER BY shape_dist_traveled DESC, CAST(SUBSTR(trips.shape_id, INSTR(trips.shape_id, '_v') + 2) AS DECIMAL) DESC
        LIMIT 1
    `;

    return db.all(`
        SELECT shape_pt_lat AS lat, shape_pt_lon AS lng
        FROM shapes
        WHERE shape_id=(${shapeIdQuery})
        ORDER BY shape_pt_sequence ASC
    `, {
        $shortName: shortName,
        $directionId: directionId,
    });
}

/**
 * Returns two polyline shapes, one for each direction.
 *
 * Selects the longest shape (by distance), breaks ties by version number.
 * Returns an empty shape if there is no shape for the specified direction/short name.
 */
export async function getShapesByShortName(
    db: SqlDatabase,
    shortName: string,
): Promise<[LatLng[], LatLng[]]> {
    return Promise.all([
        getShapeByShortName(db, shortName, 0),
        getShapeByShortName(db, shortName, 1),
    ]);
}

/**
 * Return short name for specified trip id.
 */
export async function getShortNameByTripId(
    db: SqlDatabase,
    tripId: string,
): Promise<string> {
    const result = await db.get(`
        SELECT route_short_name
        FROM trips
        INNER JOIN routes ON trips.route_id=routes.route_id
        WHERE trip_id=$tripId
    `,{ $tripId: tripId });

    if (result == null) {
        throw new Error(`Could not find trip ${tripId}`);
    }
    return result.route_short_name;
}

export async function getShapeIdsByShortNameAndDirection(
    db: SqlDatabase,
    shortName: string,
    direction: 0 | 1,
): Promise<string[]> {
    const result = await db.all(`
        SELECT DISTINCT trips.shape_id
        FROM routes
        INNER JOIN trips ON routes.route_id=trips.route_id
        WHERE route_short_name=$shortName AND direction_id=$direction
    `, {
        $shortName: shortName,
        $direction: direction,
    });
    return result.map(r => r.shape_id);
}

export async function getShapeIdsByShortName(
    db: SqlDatabase,
    shortName: string,
): Promise<[string[], string[]]> {
    return Promise.all([
        getShapeIdsByShortNameAndDirection(db, shortName, 0),
        getShapeIdsByShortNameAndDirection(db, shortName, 1),
    ]);
}

/**
 * Return shape identifier for specified trip.
 */
export async function getShapeIdByTripId(
    db: SqlDatabase,
    tripId: string,
): Promise<string> {
    const result = await db.get(`
        SELECT shape_id
        FROM trips
        WHERE trip_id=$tripId
    `, { $tripId: tripId });

    if (result == null) {
        throw new Error(`Could not find trip ${tripId}`);
    }
    return result.shape_id;
}

/**
 * Return all the short names in the datasource.
 */
export async function getShortNames(db: SqlDatabase): Promise<string[]> {
    const result: {
        shortName: string;
    }[] = await db.all(`
        SELECT route_short_name AS shortName
        FROM route_summaries
    `);
    return result.map(r => r.shortName);
}

/**
 * Return trip id for specified route, direction, and start time.
 */
export async function getTripIdByTripDetails(
    db: SqlDatabase,
    routeId: string,
    directionId: number,
    startTime: string,
): Promise<string> {
    const result = await db.get(`
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
            `Could not find trip matching route=${routeId}, direction=${directionId}, startTime=${startTime}`,
        );
    }
    return result.trip_id;
}

/**
 * Check if route exists in the datasource.
 */
export async function hasShortName(
    db: SqlDatabase,
    shortName: string,
): Promise<boolean> {
    const result = await db.get(`
        SELECT 1
        FROM route_summaries
        WHERE route_short_name=$shortName
    `, { $shortName: shortName });
    return result != null;
}

/**
 * Get a list of trip identifiers for the specified route short name.
 */
export async function getTripIdsByShortName(
    db: SqlDatabase,
    shortName: string,
): Promise<string[]> {
    const result: {
        tripId: string;
    }[] = await db.all(`
        SELECT trip_id AS tripId
        FROM trips
        INNER JOIN routes ON trips.route_id=routes.route_id
        WHERE route_short_name=$shortName
    `, {
        $shortName: shortName,
    });

    return result.map(r => r.tripId);
}

/**
 * Get a map of trip identifiers for each specified route short names.
 */
export async function getTripIdsByShortNames(
    db: SqlDatabase,
    shortNames: string[],
): Promise<Map<string, string[]>> {
    const result: {
        tripId: string;
        shortName: string;
    }[] = await db.all(`
        SELECT trip_id AS tripId, route_short_name AS shortName
        FROM trips
        INNER JOIN routes ON trips.route_id=routes.route_id
        WHERE route_short_name IN (${shortNames.map(() => "?").join()})
    `, shortNames);

    const map = new Map<string, string[]>();
    for (const row of result) {
        const tripIds = map.get(row.shortName);
        if (tripIds == null) {
            map.set(row.shortName, [row.tripId]);
        }
        else {
            tripIds.push(row.tripId);
        }
    }

    return map;
}

/**
 * Return stops for specified trip id.
 */
export async function getStopsByTripId(
    db: SqlDatabase,
    tripId: string,
) {
    const stops: {
        lat: number;
        lng: number;
        stopCode: string;
        stopId: string;
        time: string;
    }[] = await db.all(`
        SELECT stop_lat AS lat, stop_lon AS lng, stop_code AS stopCode, S.stop_id AS stopId, arrival_time AS time
        FROM stops S
        INNER JOIN stop_times ST ON S.stop_id=ST.stop_id
        WHERE trip_id=$tripId
        ORDER BY stop_sequence ASC
    `, {
        $tripId: tripId,
    });

    return stops;
}

/**
 * Return unordered stops for specified shape id.
 */
export async function getStopsByShapeId(
    db: SqlDatabase,
    shapeId: string,
) {
    const stops: {
        lat: number;
        lng: number;
        stopCode: string;
        stopId: string;
    }[] = await db.all(`
        SELECT stop_lat AS lat, stop_lon AS lng, stop_code AS stopCode, S.stop_id AS stopId
        FROM stops S
        INNER JOIN stop_times ST ON S.stop_id=ST.stop_id
        WHERE trip_id IN (
        SELECT trip_id
        FROM trips
        WHERE shape_id=$shapeId
        )
        GROUP BY S.stop_id
        ORDER BY stop_sequence ASC
    `, {
        $shapeId: shapeId,
    });

    return stops;
}

/**
 * Returns a polyline shape with the specified identifier.
 */
export async function getShapeByShapeId(
    db: SqlDatabase,
    shapeId: string,
    removeBusStops = true,
): Promise<ShapeLatLng[]> {
    const points = await db.all<ShapeLatLng[]>(`
        SELECT shape_pt_lat AS lat, shape_pt_lon AS lng, shape_dist_traveled AS dist
        FROM shapes
        WHERE shape_id=$shapeId
        ORDER BY shape_pt_sequence ASC
    `, {
        $shapeId: shapeId,
    });

    if (points.length === 0) {
        throw new Error(`Failed finding ${shapeId}`);
    }

    // Remove bus stops.
    if (removeBusStops) {
        const stops = await getStopsByShapeId(db, shapeId);
        const stopsSet = new Set(stops.map(s => `${s.lat}|${s.lng}`));
        for (let i = 0; i < points.length; i++) {
            if (stopsSet.has(`${points[i].lat}|${points[i].lng}`)) {
                points.splice(i--, 1);
            }
        }
    }

    // Remove duplicate consecutive points.
    for (let i = 1; i < points.length; i++) {
        if (points[i].lat === points[i - 1].lat && points[i].lng === points[i - 1].lng) {
            points.splice(i--, 1);
        }
    }

    // Fix distances after removing points.
    let dist = points[0].dist = 0;
    for (let i = 1; i < points.length; i++) {
        dist += defaultProjection.getDistBetweenLatLngs(points[i - 1], points[i]);
        points[i].dist = dist;
    }

    return points;
}


/**
 * Returns an array of shape info for the specified shape id.
 */
export async function getShapeInfoByShapeId(db: SqlDatabase, shapeId: string) {
    return await db.all<{
        routeId: string;
        headsign: string;
        directionId: 0 | 1;
        agencyId: string;
        shortName: string;
        longName: string;
        routeType: number;
    }[]>(`
        SELECT DISTINCT route_short_name AS shortName, route_long_name AS longName, trip_headsign AS headsign,
        R.route_id AS routeId, direction_id AS directionId, route_type AS routeType, agency_id AS agencyId
        FROM trips T
        INNER JOIN routes R ON T.route_id=R.route_id
        WHERE shape_id=$shapeId
    `, {
        $shapeId: shapeId,
    });
}
