import { FeedMessage } from "../gtfs-realtime_v2.generated";
import type { NSWSource } from "../realtime_polling";

export const metro: NSWSource = {
    url: "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/metro",
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
                schedule_relationship: false,
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
                speed: false,
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
