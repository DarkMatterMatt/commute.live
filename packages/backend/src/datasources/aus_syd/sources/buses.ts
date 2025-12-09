import { FeedMessage } from "../gtfs-realtime.generated";
import type { NSWSource } from "../realtime_polling";

export const buses: NSWSource = {
    url: "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/buses",
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
                label: false,
                license_plate: false,
            },
            position: {
                latitude: true,
                longitude: true,
                bearing: true,
                odometer: false,
                speed: true,
            },
            current_stop_sequence: false,
            stop_id: false,
            current_status: false,
            timestamp: true,
            congestion_level: true,
            occupancy_status: true,
        },
        alert: false,
    },
};
