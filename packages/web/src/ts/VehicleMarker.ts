import { UnixTimestamp } from "./types";

interface VehicleMarkerOptions extends google.maps.ReadonlyMarkerOptions {
    directionId?: 0 | 1;
    lastUpdatedUnix?: UnixTimestamp;
}

class VehicleMarker extends google.maps.Marker {
    interval: NodeJS.Timeout;

    directionId: 0 | 1;

    lastUpdatedUnix: UnixTimestamp;

    constructor(opts: VehicleMarkerOptions) {
        super(opts);
        this.directionId = opts.directionId;
        this.lastUpdatedUnix = opts.lastUpdatedUnix;
    }
}

export default VehicleMarker;
