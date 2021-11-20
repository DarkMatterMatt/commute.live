import type { Shapes, TripUpdate, VehicleUpdate } from "gtfs-types";

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
    checkForStaticUpdate: (tempDir: string) => Promise<boolean>;

    getShapesByShortName: (shortName: string) => Promise<Shapes[]>;

    getShortName: (tripId: string) => Promise<string>;

    getTripId: (routeId: string, directionId: number, startTime: string) => Promise<string>;

    /**
     * Returns a list of realtime vehicle updates.
     *
     * The list will contain the most recent update for each vehicle, but is not required to
     * contain updates older than two minutes.
     */
    getVehicles: () => VehicleUpdate[];

    /**
     * Register a function to be called when an update is available.
     */
    registerTripUpdateListener: (listener: (update: TripUpdate) => void) => void;

    /**
     * Register a function to be called when an update is available.
     */
    registerVehicleUpdateListener: (listener: (update: VehicleUpdate) => void) => void;
}
