import type { Id, JSONSerializable, LatLng, RegionCode, StrOrNull } from "@commutelive/common";
import type { TripUpdate, VehiclePosition } from "./";

export type TripUpdateListener = (update: TripUpdate) => void;

export type VehicleUpdateListener = (update: VehiclePosition) => void;

export interface RouteSummary {
    id: Id;
    longNames: [StrOrNull, StrOrNull];
    shapeIds: [StrOrNull, StrOrNull];
    shortName: string;
    type: number;
}

/**
 * Represents a datasource for a single region.
 */
export interface DataSource {
    /**
     * Globally unique region code.
     *
     * Format is COUNTRY_REGION. COUNTRY is an ISO 3166-1 alpha-3 code; REGION is a string.
     */
    readonly code: RegionCode;

    /**
     * Approximate center of the data source.
     */
    readonly location: LatLng;

    /**
     * Human-readable version of the COUNTRY in the region code.
     */
    readonly country: string;

    /**
     * Human-readable version of the REGION in the region code.
     */
    readonly region: string;

    /**
     * Data source attribution and/or copyright notice.
     */
    readonly attributionHTML: string;

    /**
     * Default map zoom level when centered on this data source.
     */
    defaultZoom: number;

    /**
     * Default routes to show to new users.
     */
    defaultRouteIds: Id[];

    /**
     * Returns true if an update was processed. Should be called regularly.
     */
    checkForRealtimeUpdate: () => Promise<boolean>;

    /**
     * Returns true if an update was processed. Should be called regularly.
     */
    checkForStaticUpdate: () => Promise<boolean>;

    /**
     * Return identifier for specified trip id.
     */
    getIdByTripId: (tripId: string) => Promise<Id>;

    /**
     * Returns summarising data for the specified route.
     */
    getRouteSummary(id: Id): Promise<null | RouteSummary>;

    /**
     * Returns summarising data for all routes in the datasource.
     */
    getRoutesSummary(): Promise<RouteSummary[]>;

    /**
     * Returns two polyline shapes, one for each direction.
     *
     * Selects the longest shape (by distance), breaks ties by version number.
     * Returns an empty shape if there is no shape for the specified direction/identifier.
     */
    getShapes: (id: Id) => Promise<[LatLng[], LatLng[]]>;

    /**
     * Return datasource status in a JSON-serializable format.
     */
    getStatus: () => Promise<JSONSerializable>;

    /**
     * Return trip id for specified route, direction, and start time.
     */
    getTripIdByTripDetails: (routeId: string, directionId: number, startTime: string) => Promise<string>;

    /**
     * Returns a map of realtime trip updates, keyed by `trip_id`.
     *
     * The map will contain the most recent update for each trip, but is not required to
     * contain updates older than two minutes.
     */
    getTripUpdates: (id?: Id) => Promise<ReadonlyMap<string, TripUpdate>>;

    /**
     * Returns a map of realtime vehicle updates, keyed by `vehicle_id`.
     *
     * The list will contain the most recent update for each vehicle, but is not required to
     * contain updates older than two minutes.
     */
    getVehicleUpdates: (id?: Id) => Promise<ReadonlyMap<string, VehiclePosition>>;

    /**
     * Will be executed once on startup.
     */
    initialize: (tempDir: string) => Promise<void>;

    /**
     * Register a function to be called when an update is available.
     */
    registerTripUpdateListener: (listener: TripUpdateListener) => void;

    /**
     * Register a function to be called when an update is available.
     */
    registerVehicleUpdateListener: (listener: VehicleUpdateListener) => void;
}
