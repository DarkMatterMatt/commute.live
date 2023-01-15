import { FeedMessage } from "../gtfs-realtime.proto";
import type { NSWSource } from "../realtime_polling";

export const ferries_sydneyferries: NSWSource = {
    url: "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/ferries/sydneyferries",
    decode: FeedMessage.decode,
    keep: {
        id: false,
        is_deleted: false,
        trip_update: false,
        vehicle: {
            trip: {
                trip_id: true,
                route_id: true,
                direction_id: false,
                start_time: true,
                start_date: true,
                schedule_relationship: true,
            },
            vehicle: {
                id: true,
                label: true,
                license_plate: false,
            },
            position: {
                latitude: true,
                longitude: true,
                bearing: true,
                odometer: false,
                speed: true,
            },
            current_stop_sequence: true,
            stop_id: true,
            current_status: true,
            timestamp: true,
            congestion_level: false,
            occupancy_status: false,
        },
        alert: false,
    },
};
