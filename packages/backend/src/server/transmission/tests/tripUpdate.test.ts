import { makeRegionalId } from "~/datasources";
import type { TripUpdate } from "~/types";
import { convertTripUpdate } from "../tripUpdate";

describe("convertTripUpdate", () => {
    const testId1 = makeRegionalId("TEST_REGION", "ROUTE1");
    const testId2 = makeRegionalId("TEST_REGION", "ROUTE2");

    it("adds id to trip update", () => {
        const mockTripUpdate: TripUpdate = {
            trip: {
                trip_id: "TRIP123",
                route_id: "ROUTE1",
                direction_id: 0,
            },
            stop_time_update: [
                {
                    stop_id: "STOP1",
                    arrival: { delay: 120 },
                },
            ],
            timestamp: 1640000000,
        };

        const result = convertTripUpdate(testId1, mockTripUpdate);

        expect(result.id).toBe(testId1);
        expect(result.trip).toEqual(mockTripUpdate.trip);
        expect(result.stop_time_update).toEqual(mockTripUpdate.stop_time_update);
        expect(result.timestamp).toBe(1640000000);
    });

    it("preserves all fields including optional ones", () => {
        const mockTripUpdate: TripUpdate = {
            trip: {
                trip_id: "TRIP456",
            },
            stop_time_update: [],
            delay: 300,
            vehicle: { id: "VEH123" },
        };

        const result = convertTripUpdate(testId2, mockTripUpdate);

        expect(result.id).toBe(testId2);
        expect(result.delay).toBe(300);
        expect(result.vehicle).toEqual({ id: "VEH123" });
        expect(result.stop_time_update).toEqual([]);
    });
});
