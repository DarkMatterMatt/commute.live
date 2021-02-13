import { afterRepaint } from "./Helpers";
import HtmlMarker from "./HtmlMarker";
import Render from "./Render";

const ANIMATE_POSITION_DURATION = 1000;
const FADE_OUT_EASING = "ease-in";
const FADE_OUT_DELAY = 20 * 1000;
const FADE_OUT_DURATION = (70 * 1000) / 0.8; // divide by 0.8 so we expire with 30% opacity
const EXPIRES_AFTER = 90 * 1000;

interface VehicleMarkerOptions {
    id: string;
    color: string;
    onExpiry?: () => void;
    markerType: MarkerType;
    animatePosition: boolean;
    transitType: TransitType;
}

interface UpdateLiveDataOpts {
    position: google.maps.LatLng | google.maps.LatLngLiteral;
    lastUpdated: number;
    bearing: number;
}

class VehicleMarker extends HtmlMarker {
    private bearing = -1;

    private color: string;

    private directionId: LiveVehicle["directionId"];

    private expiryTimeout: ReturnType<typeof setTimeout>;

    private lastUpdated: number = null;

    private markerType: MarkerType;

    private onExpiry: () => void = null;

    private transitType: TransitType;

    public constructor(o: VehicleMarkerOptions) {
        super({
            ...o,
            elem:                   document.createElement("div"),
            smoothMovementDuration: o.animatePosition ? ANIMATE_POSITION_DURATION : 0,
        });

        this.color = o.color;
        this.markerType = o.markerType;
        this.onExpiry = o.onExpiry;
        this.transitType = o.transitType;
    }

    public onAdd(): void {
        super.onAdd();
        this.startOpacityTransition();
    }

    private loadIcon(): void {
        const elem = Render.createMarkerSvg({
            type:        this.markerType,
            color:       this.color,
            directionId: this.directionId,
            transitType: this.transitType,
            bearing:     this.bearing,
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
        if (this.isAdded()) {
            const elapsed = Date.now() - this.lastUpdated;
            const elem = this.getHtmlElement();
            elem.style.transitionProperty = "opacity";
            elem.style.transitionTimingFunction = FADE_OUT_EASING;
            elem.style.transitionDelay = `${FADE_OUT_DELAY - elapsed}ms`;
            elem.style.transitionDuration = `${FADE_OUT_DURATION}ms`;
            afterRepaint(() => {
                elem.style.opacity = "0";
            });
        }
    }

    public setColor(color: string): void {
        if (color !== this.color) {
            this.color = color;
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
        clearTimeout(this.expiryTimeout);
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
