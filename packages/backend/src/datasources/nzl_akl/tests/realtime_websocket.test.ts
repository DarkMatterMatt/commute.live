import { TripDescriptor$ScheduleRelationship, type TripUpdate } from "~/types";
import { type AucklandTransportData, fixTripUpdate } from "../realtime_websocket";

describe("fixTripUpdate", () => {
    test.each([
        [5, TripDescriptor$ScheduleRelationship.REPLACEMENT],
        [6, TripDescriptor$ScheduleRelationship.DUPLICATED],
        [7, TripDescriptor$ScheduleRelationship.DELETED],
        [8, TripDescriptor$ScheduleRelationship.NEW],
    ])("parses TripDescriptor.schedule_relationship=%j", (value, expected) => {
        const input: AucklandTransportData<TripUpdate> = {
            trip: {
                trip_id: "TRIP123",
                schedule_relationship: value,
            },
            stop_time_update: [],
        };
        const result = fixTripUpdate(input);

        expect(result.trip.schedule_relationship).toBe(expected);
    });
});
