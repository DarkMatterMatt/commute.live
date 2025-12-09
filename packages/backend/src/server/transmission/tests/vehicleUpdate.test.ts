import { makeRegionalId } from "~/datasources";
import type { VehiclePosition } from "~/types";
import { convertVehiclePosition } from "../vehicleUpdate";

describe("convertVehiclePosition", () => {
    const testId1 = makeRegionalId("TEST_REGION", "ROUTE1");
    const testId2 = makeRegionalId("TEST_REGION", "ROUTE2");

    it("converts full vehicle position with all fields", () => {
        const vehiclePosition: VehiclePosition = {
            position: {
                latitude: -36.8484,
                longitude: 174.7633,
                bearing: 45,
            },
            timestamp: 1640000000,
            trip: {
                trip_id: "TRIP123",
                route_id: "ROUTE1",
                direction_id: 1,
            },
            vehicle: {
                id: "BUS123",
            },
            occupancy_status: 2,
        };

        const result = convertVehiclePosition(testId1, vehiclePosition);

        expect(result.status).toBe("success");
        expect(result.route).toBe("live/vehicle");
        expect(result.id).toBe(testId1);
        expect(result.position).toEqual({ lat: -36.8484, lng: 174.7633 });
        expect(result.bearing).toBe(45);
        expect(result.lastUpdated).toBe(1640000000000); // timestamp converted from seconds to milliseconds
        expect(result.directionId).toBe(1);
        expect(result.vehicleId).toBe("BUS123");
        expect(result.occupancyStatus).toBe(2);
    });

    it("omits position when lat/lng are missing", () => {
        const vehiclePosition: VehiclePosition = {
            timestamp: 1640000000,
            trip: {
                trip_id: "TRIP123",
            },
            vehicle: {
                id: "BUS456",
            },
        };

        const result = convertVehiclePosition(testId2, vehiclePosition);

        expect(result.position).toBeUndefined();
        expect(result.id).toBe(testId2);
        expect(result.vehicleId).toBe("BUS456");
    });

    it("filters out undefined optional fields", () => {
        const vehiclePosition: VehiclePosition = {
            position: {
                latitude: -37.8136,
                longitude: 144.9631,
            },
            timestamp: 1640000000,
        };

        const result = convertVehiclePosition(testId1, vehiclePosition);

        // Should only have defined fields
        expect(result).toHaveProperty("status");
        expect(result).toHaveProperty("route");
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("position");
        expect(result).toHaveProperty("lastUpdated");

        // Should not have undefined fields
        expect(result).not.toHaveProperty("directionId");
        expect(result).not.toHaveProperty("bearing");
        expect(result).not.toHaveProperty("vehicleId");
        expect(result).not.toHaveProperty("occupancyStatus");
    });

    it("omits lastUpdated when timestamp is missing", () => {
        const vehiclePosition: VehiclePosition = {
            position: {
                latitude: -37.8136,
                longitude: 144.9631,
            },
            vehicle: {
                id: "TRAM789",
            },
        };

        const result = convertVehiclePosition(testId1, vehiclePosition);

        expect(result.lastUpdated).toBeUndefined();
        expect(result).not.toHaveProperty("lastUpdated");
        expect(result.vehicleId).toBe("TRAM789");
    });
});
