import type { LatLng } from "~/types";
import { getDatabase } from "./static.js";

/**
 * Returns an appropriate long name for the given short name.
 *
 * Selects the longest name (prefer more detailed names), breaks ties by lexicographical order.
 */
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
