import type { SqlDatabase } from "gtfs";
import type { TripUpdate, VehicleUpdate } from "gtfs-types";
import type { LatLng } from ".";

/**
 * Globally unique region code.
 *
 * Format is COUNTRY_REGION. COUNTRY is an ISO 3166-1 alpha-3 code; REGION is a string.
 */
type RegionCode = `${string}_${string}`;

/**
 * Represents a datasource for a single region.
 */
interface DataSource {
    /**
     * Globally unique region code.
     *
     * Format is COUNTRY_REGION. COUNTRY is an ISO 3166-1 alpha-3 code; REGION is a string.
     */
    readonly code: RegionCode;

    /**
     * Returns true if an update was processed. Should be called regularly.
     */
    checkForRealtimeUpdate: () => Promise<boolean>;

    /**
     * Returns true if an update was processed. Should be called regularly.
     */
    checkForStaticUpdate: () => Promise<boolean>;

    /**
     * Returns the currently opened database instance, or null if no database is open.
     */
    getDatabase: () => SqlDatabase;

    /**
     * Returns an appropriate long name for the given short name.
     *
     * Selects the longest name (prefer more detailed names), breaks ties by lexicographical order.
     */
    getLongNameByShortName(shortName: string): Promise<string>;

    /**
     * Returns two polyline shapes, one for each direction.
     *
     * Selects the longest shape (by distance), breaks ties by version number.
     * Returns an empty shape if there is no shape for the specified direction/short name.
     */
    getShapesByShortName: (shortName: string) => Promise<[LatLng[], LatLng[]]>;

    /**
     * Return short name for specified trip id.
     */
    getShortName: (tripId: string) => Promise<string>;

    /**
     * Return trip id for specified route, direction, and start time.
     */
    getTripId: (routeId: string, directionId: number, startTime: string) => Promise<string>;

    /**
     * Returns a list of realtime vehicle updates.
     *
     * The list will contain the most recent update for each vehicle, but is not required to
     * contain updates older than two minutes.
     */
    getVehicles: () => VehicleUpdate[];

    /**
     * Will be executed once on startup.
     */
    initialize: (tempDir: string) => Promise<void>;

    /**
     * Register a function to be called when an update is available.
     */
    registerTripUpdateListener: (listener: (update: TripUpdate) => void) => void;

    /**
     * Register a function to be called when an update is available.
     */
    registerVehicleUpdateListener: (listener: (update: VehicleUpdate) => void) => void;
}
