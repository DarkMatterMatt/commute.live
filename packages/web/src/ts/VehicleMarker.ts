import { unixTimestamp } from "./types";

class VehicleMarker extends google.maps.Marker {
    interval: number;

    lastUpdatedUnix: unixTimestamp;

    directionId: 0 | 1;
}

export default VehicleMarker;
