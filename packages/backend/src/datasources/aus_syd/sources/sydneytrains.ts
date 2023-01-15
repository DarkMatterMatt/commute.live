import { FeedMessage } from "../gtfs-realtime_v2.proto";
import type { NSWSource } from "../realtime_polling";

export const sydneytrains: NSWSource = {
    url: "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/sydneytrains",
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
                start_time: false,
                start_date: false,
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
                bearing: false,
                odometer: false,
                speed: false,
            },
            current_stop_sequence: false,
            stop_id: true,
            current_status: false,
            timestamp: true,
            congestion_level: false,
            occupancy_status: true,
        },
        alert: false,
    },
};
