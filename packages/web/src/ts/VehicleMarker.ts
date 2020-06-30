import BezierEasing from "bezier-easing";
import { UnixTimestamp } from "./types";
import { settings } from "./Settings";

const ANIMATE_POSITION_DURATION = 1000;
const ANIMATE_POSITION_EASING = BezierEasing(0.4, 0, 0.2, 1);

function toLatLngLiteral(pos: google.maps.LatLng | google.maps.LatLngLiteral): google.maps.LatLngLiteral {
    return pos instanceof google.maps.LatLng ? pos.toJSON() : pos;
}

interface VehicleMarkerOptions extends google.maps.ReadonlyMarkerOptions {
    directionId?: 0 | 1;
    lastUpdatedUnix?: UnixTimestamp;
}

class VehicleMarker extends google.maps.Marker {
    interval: NodeJS.Timeout;

    directionId: 0 | 1;

    lastUpdatedUnix: UnixTimestamp;

    lastPosition: google.maps.LatLngLiteral;

    nextPosition: google.maps.LatLngLiteral;

    finishAnimatePositionAt: DOMHighResTimeStamp;

    constructor(opts: VehicleMarkerOptions) {
        super(opts);
        this.directionId = opts.directionId;
        this.lastUpdatedUnix = opts.lastUpdatedUnix;
    }

    setPosition(position: google.maps.LatLng | google.maps.LatLngLiteral): void {
        if (settings.getBool("animateMarkerPosition")) {
            this.animateTo(position);
        }
        else {
            this.nextPosition = position;
            super.setPosition(position);
        }
    }

    animateTo(position_: google.maps.LatLng | google.maps.LatLngLiteral): void {
        const position = toLatLngLiteral(position_);

        if (this.lastPosition == null) {
            this.lastPosition = position;
            this.nextPosition = position;
            super.setPosition(position);
            return;
        }

        this.lastPosition = this.nextPosition;
        this.nextPosition = position;

        this.finishAnimatePositionAt = performance.now() + ANIMATE_POSITION_DURATION;
        window.requestAnimationFrame(this.animatePositionStep.bind(this));
    }

    private animatePositionStep(time: number) {
        const progress = 1 - (this.finishAnimatePositionAt - time) / ANIMATE_POSITION_DURATION;

        if (progress >= 1) {
            super.setPosition(this.nextPosition);
            return;
        }

        const easeProgress = ANIMATE_POSITION_EASING(progress);
        super.setPosition({
            lat: this.lastPosition.lat + (this.nextPosition.lat - this.lastPosition.lat) * easeProgress,
            lng: this.lastPosition.lng + (this.nextPosition.lng - this.lastPosition.lng) * easeProgress,
        });

        window.requestAnimationFrame(this.animatePositionStep.bind(this));
    }
}

export default VehicleMarker;
