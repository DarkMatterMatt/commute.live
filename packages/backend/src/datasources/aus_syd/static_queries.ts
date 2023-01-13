import type { Id, LatLng, StrOrNull } from "@commutelive/common";
import type { RouteSummary, SqlDatabase } from "~/types";
import { parseId } from "./id";

/**
 * Returns summarising data for all routes in the datasource.
 */
export async function getRoutesSummary(
    db: SqlDatabase,
): Promise<RouteSummary[]> {
    const result: {
        id: Id;
        longName0: StrOrNull;
        longName1: StrOrNull;
        shortName: string;
        routeType: number;
        shapeId0: StrOrNull;
        shapeId1: StrOrNull;
    }[] = db.prepare(`
        SELECT
            id,
            route_long_name_0 AS longName0,
            route_long_name_1 AS longName1,
            route_short_name AS shortName,
            route_type AS routeType,
            shape_id_0 AS shapeId0,
            shape_id_1 AS shapeId1
        FROM route_summaries
    `).all();

    return result.map(r => ({
        id: r.id,
        longNames: [r.longName0, r.longName1],
        shapeIds: [r.shapeId0, r.shapeId1],
        shortName: r.shortName,
        type: r.routeType,
    }));
}

/**
 * Returns summarising data for the specified route.
 */
export async function getRouteSummary(
    db: SqlDatabase,
    id: Id,
): Promise<null | RouteSummary> {
    const r: {
        longName0: StrOrNull;
        longName1: StrOrNull;
        shortName: string;
        routeType: number;
        shapeId0: StrOrNull;
        shapeId1: StrOrNull;
    } = db.prepare(`
        SELECT
            route_long_name_0 AS longName0,
            route_long_name_1 AS longName1,
            route_short_name AS shortName,
            route_type AS routeType,
            shape_id_0 AS shapeId0,
            shape_id_1 AS shapeId1
        FROM route_summaries
        WHERE id=$id
    `).get({ id });

    if (r == null) {
        return null;
    }

    return {
        id,
        longNames: [r.longName0, r.longName1],
        shapeIds: [r.shapeId0, r.shapeId1],
        shortName: r.shortName,
        type: r.routeType,
    };
}

/**
 * Returns a polyline shape for the specified route and direction.
 *
 * Returns an empty shape if there is no matching shape.
 */
async function getShape(
    db: SqlDatabase,
    id: Id,
    directionId: 0 | 1,
): Promise<LatLng[] | null> {
    const shapeIdQuery = `
        SELECT shape_id_${directionId}
        FROM route_summaries
        WHERE id=$id
        LIMIT 1
    `;

    const result: LatLng[] = db.prepare(`
        SELECT shape_pt_lat AS lat, shape_pt_lon AS lng
        FROM shapes
        WHERE shape_id=(${shapeIdQuery})
        ORDER BY shape_pt_sequence ASC
    `).all({ id });

    return result.length > 0 ? result : null;
}

/**
 * Returns two polyline shapes, one for each direction.
 *
 * Selects the longest shape (by distance), breaks ties by version number.
 * Returns an empty shape if there is no shape for the specified direction/identifier.
 */
export async function getShapes(
    db: SqlDatabase,
    id: Id,
): Promise<[LatLng[] | null, LatLng[] | null]> {
    return Promise.all([
        getShape(db, id, 0),
        getShape(db, id, 1),
    ]);
}

/**
 * Return route id for specified trip id.
 */
export async function getIdByTripId(
    db: SqlDatabase,
    tripId: string,
): Promise<Id> {
    const result: { id: Id } = db.prepare(`
        SELECT id
        FROM trips T
        INNER JOIN routes R ON T.route_id=R.route_id
        INNER JOIN route_summaries S ON R.route_short_name=S.route_short_name AND R.route_type=S.route_type
        WHERE trip_id=$tripId
    `).get({ tripId });

    if (result == null) {
        throw new Error(`Could not find trip ${tripId}`);
    }
    return result.id;
}

/**
 * Return direction id for specified trip id.
 */
export function getDirectionIdByTripId(
    db: SqlDatabase,
    tripId: string,
): 0 | 1 {
    const result: { directionId: 0 | 1 } = db.prepare(`
        SELECT direction_id AS directionId
        FROM trips
        WHERE trip_id=$tripId
    `).get({ tripId });

    if (result == null) {
        throw new Error(`Could not find trip ${tripId}`);
    }
    return result.directionId;
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
    const result: { tripId: string } = db.prepare(`
        SELECT trips.trip_id AS tripId
        FROM trips
        INNER JOIN stop_times ON trips.trip_id=stop_times.trip_id
        WHERE route_id=$routeId AND direction_id=$directionId
            AND stop_sequence=1 AND (arrival_time=$startTime OR departure_time=$startTime)
    `).get({
        routeId,
        directionId,
        startTime,
    });

    if (result == null) {
        throw new Error(
            `Could not find trip matching route=${routeId}, direction=${directionId}, startTime=${startTime}`,
        );
    }
    return result.tripId;
}

/**
 * Get a list of route identifiers for the specified route.
 */
export async function getRouteIds(
    db: SqlDatabase,
    id: Id,
): Promise<string[]> {
    const { shortName, type } = parseId(id);
    const result: {
        routeId: string;
    }[] = db.prepare(`
        SELECT route_id AS routeId
        FROM routes
        WHERE route_short_name=$shortName AND route_type=$routeType
    `).all({
        shortName,
        routeType: type,
    });

    return result.map(r => r.routeId);
}

/**
 * Get a list of trip identifiers for the specified route.
 */
export async function getTripIds(
    db: SqlDatabase,
    id: Id,
): Promise<string[]> {
    const { shortName, type } = parseId(id);
    const result: {
        tripId: string;
    }[] = db.prepare(`
        SELECT trip_id AS tripId
        FROM trips
        INNER JOIN routes ON trips.route_id=routes.route_id
        WHERE route_short_name=$shortName AND route_type=$routeType
    `).all({
        shortName,
        routeType: type,
    });

    return result.map(r => r.tripId);
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
    }[] = db.prepare(`
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
    `).all({ shapeId });

    return stops;
}
