import type { LatLng, RouteSummary, StrOrNull } from "~/types";
import { getDatabase } from "./static.js";

async function getLongNameByShortNameDirection(shortName: string, directionId: 0 | 1): Promise<StrOrNull> {
    const result: {
        longName: string
    } | undefined = await getDatabase().get(`
        SELECT route_long_name_${directionId} AS longName
        FROM route_summaries
        WHERE route_short_name=$shortName
    `, {
        $shortName: shortName,
    });

    return result?.longName ?? null;
}

/**
 * Returns an appropriate long name for the given short name.
 *
 * Selects the longest name (prefer more detailed names), breaks ties by lexicographical order.
 */
export async function getLongNamesByShortName(shortName: string): Promise<[StrOrNull, StrOrNull]> {
    const [ln1, ln2] = await Promise.all([
        getLongNameByShortNameDirection(shortName, 0),
        getLongNameByShortNameDirection(shortName, 1),
    ]);

    return [ln1, ln2];
}

/**
 * Returns the type of route for the given short name.
 *
 * @see https://developers.google.com/transit/gtfs/reference#routestxt.
 */
export async function getRouteTypeByShortName(shortName: string): Promise<number> {
    const result = await getDatabase().get(`
        SELECT route_type
        FROM routes
        WHERE route_short_name=$shortName
        LIMIT 1
    `, {
        $shortName: shortName,
    });

    if (result == null) {
        throw new Error(`Could not find route ${shortName}`);
    }

    return result.route_type;
}

/**
 * Returns summarising data for all routes (by short name) in the datasource.
 */
export async function getRoutesSummary(): Promise<Map<string, RouteSummary>> {
    const result: {
        longName0: StrOrNull;
        longName1: StrOrNull;
        shortName: string;
        routeType: number;
        shapeId0: StrOrNull;
        shapeId1: StrOrNull;
    }[] = await getDatabase().all(`
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
async function getShapeByShortName(shortName: string, directionId: number): Promise<LatLng[]> {
    const shapeIdQuery = `
        SELECT trips.shape_id
        FROM routes
        INNER JOIN trips ON routes.route_id=trips.route_id
        INNER JOIN shapes ON trips.shape_id=shapes.shape_id
        WHERE route_short_name=$shortName AND direction_id=$directionId
        ORDER BY shape_dist_traveled DESC, CAST(SUBSTR(trips.shape_id, INSTR(trips.shape_id, '_v') + 2) AS DECIMAL) DESC
        LIMIT 1
    `;

    return getDatabase().all(`
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
export async function getShapesByShortName(shortName: string): Promise<[LatLng[], LatLng[]]> {
    return Promise.all([
        getShapeByShortName(shortName, 0),
        getShapeByShortName(shortName, 1),
    ]);
}

/**
 * Return short name for specified trip id.
 */
export async function getShortNameByTripId(tripId: string): Promise<string> {
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

/**
 * Return all the short names in the datasource.
 */
export async function getShortNames(): Promise<string[]> {
    const result: {
        shortName: string
    }[] = await getDatabase().all(`
        SELECT route_short_name AS shortName
        FROM route_summaries
    `);
    return result.map(r => r.shortName);
}

/**
 * Return trip id for specified route, direction, and start time.
 */
export async function getTripIdByTripDetails(routeId: string, directionId: number, startTime: string): Promise<string> {
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

/**
 * Check if route exists in the datasource.
 */
export async function hasShortName(shortName: string): Promise<boolean> {
    const result = await getDatabase().get(`
        SELECT 1
        FROM route_summaries
        WHERE route_short_name=$shortName
    `, {
        $shortName: shortName,
    });

    return result != null;
}
