import type { LiveVehicle } from "@commutelive/common";
import { afterRepaint } from "./Helpers";
import HtmlMarker from "./HtmlMarker";
import Render from "./Render";
import type { MarkerType } from "./types";

const ANIMATE_POSITION_DURATION = 1000;
const FADE_OUT_EASING = "ease-in";
const FADE_OUT_DELAY = 30 * 1000; // 30 seconds at full opacity
const FADE_OUT_DURATION = 90 * 1000; // fade out over 90 seconds
const FADE_OUT_OPACITY = 0.3; // never go below 30% opacity
const EXPIRES_AFTER = 150 * 1000; // expire after 150 seconds

interface VehicleMarkerOptions {
    id: string;
    color: string;
    onExpiry?: () => void;
    markerType: MarkerType;
    animatePosition: boolean;
    transitType: number;
}

interface UpdateLiveDataOpts {
    position: google.maps.LatLng | google.maps.LatLngLiteral;
    lastUpdated: number;
    bearing: null | number;
}

class VehicleMarker extends HtmlMarker {
    private bearing: null | number = null;

    private color: string;

    private directionId: LiveVehicle["directionId"];

    private expiryTimeout: ReturnType<typeof setTimeout> | null = null;

    private lastUpdated: number | null = null;

    private markerType: MarkerType;

    private onExpiry: (() => void) | null = null;

    private transitType: number;

    public constructor(o: VehicleMarkerOptions) {
        super({
            ...o,
            elem: document.createElement("div"),
            smoothMovementDuration: o.animatePosition ? ANIMATE_POSITION_DURATION : 0,
        });

        this.color = o.color;
        this.markerType = o.markerType;
        this.onExpiry = o.onExpiry ?? null;
        this.transitType = o.transitType;
    }

    public onAdd(): void {
        super.onAdd();
        this.startOpacityTransition();
    }

    private loadIcon(): void {
        const elem = Render.createMarkerSvg({
            type: this.markerType,
            color: this.color,
            directionId: this.directionId,
            transitType: this.transitType,
            bearing: this.bearing,
        });
        // set opacity so CSS transition has something to work from
        elem.style.opacity = "1";
        this.setHtmlElement(elem);
    }

    private removeOpacityTransition(): void {
        const elem = this.getHtmlElement();
        elem.style.transition = "";
        elem.style.opacity = "1";
    }

    private startOpacityTransition(): void {
        if (this.isAdded() && this.lastUpdated != null) {
            const elapsed = Date.now() - this.lastUpdated;
            const elem = this.getHtmlElement();
            elem.style.transitionProperty = "opacity";
            elem.style.transitionTimingFunction = FADE_OUT_EASING;
            elem.style.transitionDelay = `${FADE_OUT_DELAY - elapsed}ms`;
            elem.style.transitionDuration = `${FADE_OUT_DURATION}ms`;
            afterRepaint(() => {
                elem.style.opacity = `${FADE_OUT_OPACITY}`;
            });
        }
    }

    public setColor(color: string): void {
        if (color !== this.color) {
            this.color = color;
            this.loadIcon();
        }
    }

    public setMarkerIconType(type: MarkerType): void {
        if (type !== this.markerType) {
            this.markerType = type;
            this.loadIcon();
        }
    }

    public setAnimatePosition(smooth: boolean): void {
        this.setSmoothMovementDuration(smooth ? ANIMATE_POSITION_DURATION : 0);
    }

    public updateLiveData(data: UpdateLiveDataOpts): void {
        this.lastUpdated = data.lastUpdated;
        this.bearing = data.bearing;

        // regenerate icon
        this.loadIcon();

        // update expiry time
        const elapsed = Date.now() - this.lastUpdated;
        clearTimeout(this.expiryTimeout ?? undefined);
        this.expiryTimeout = setTimeout(() => {
            if (this.onExpiry != null) {
                this.onExpiry();
            }
        }, EXPIRES_AFTER - elapsed);

        // start opacity transition (fade out over time)
        this.removeOpacityTransition();
        afterRepaint(() => this.startOpacityTransition());

        this.setPosition(data.position);
    }
}

export default VehicleMarker;
