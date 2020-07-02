import ShiftedMapCanvasProjection from "./ShiftedMapCanvasProjection";
import { fromLatLngLiteral } from "./Helpers";

export interface HtmlMarkerOptions {
    id: string;
    elem: HTMLElement;
    position: google.maps.LatLng | google.maps.LatLngLiteral;
    anchorPoint?: google.maps.Point;
    smoothMovementEasing?: string;
    smoothMovementDuration?: number;
}

const markerDefaults: Partial<HtmlMarkerOptions> = {
    smoothMovementEasing:   "cubic-bezier(0.4, 0, 0.2, 1)",
    smoothMovementDuration: 1000,
};

export default class HtmlMarker {
    public id: string;

    private root = document.createElement("div");

    private position: google.maps.LatLng;

    private anchorPoint?: google.maps.Point;

    private smoothMovementEasing?: string;

    private smoothMovementDuration?: number;

    private proj: google.maps.MapCanvasProjection | ShiftedMapCanvasProjection = null;

    constructor(opts: HtmlMarkerOptions) {
        this.root.style.position = "absolute";
        this.update({ ...markerDefaults, ...opts }, false);
    }

    destroy(): void {
        this.root.parentNode.removeChild(this.root);
    }

    draw(smoothMovement = true): void {
        /* eslint-disable no-param-reassign */
        if (!smoothMovement) {
            this.root.style.transition = "";
            this.root.style.transitionProperty = "";
        }

        const coords = this.proj.fromLatLngToDivPixel(this.position);
        this.root.style.left = `${coords.x}px`;
        this.root.style.top = `${coords.y}px`;

        if (!smoothMovement && this.smoothMovementDuration > 0) {
            setTimeout(() => {
                this.root.style.transition = `all ${this.smoothMovementDuration}ms ${this.smoothMovementEasing}`;
                this.root.style.transitionProperty = "top, left";
            }, 0);
        }
    }

    getDomElement(): HTMLElement {
        return this.root;
    }

    setPosition(position: google.maps.LatLng | google.maps.LatLngLiteral): void {
        this.update({ position });
    }

    setProjection(proj: google.maps.MapCanvasProjection | ShiftedMapCanvasProjection): void {
        this.proj = proj;
    }

    update(opts: Partial<HtmlMarkerOptions>, redraw?: boolean): void {
        let requiresRedraw = false;

        if (opts.id != null) {
            this.id = opts.id;
        }

        if (opts.elem != null) {
            if (this.root.firstElementChild != null) {
                this.root.removeChild(this.root.firstElementChild);
            }
            this.root.appendChild(opts.elem);
        }

        if (opts.size != null && !opts.size.equals(this.size)) {
            this.size = opts.size;
            requiresRedraw = true;
        }

        if (opts.position != null) {
            const pos = fromLatLngLiteral(opts.position);
            if (!pos.equals(this.position)) {
                this.position = pos;
                requiresRedraw = true;
            }
        }

        if (opts.anchorPoint != null && !opts.anchorPoint.equals(this.anchorPoint)) {
            this.anchorPoint = opts.anchorPoint;
            requiresRedraw = true;
        }

        if (opts.smoothMovementDuration != null) {
            this.smoothMovementDuration = opts.smoothMovementDuration;
        }

        if (opts.smoothMovementEasing != null) {
            this.smoothMovementEasing = opts.smoothMovementEasing;
        }

        if (this.smoothMovementDuration > 0) {
            this.root.style.transition = `all ${this.smoothMovementDuration}ms ${this.smoothMovementEasing}`;
            this.root.style.transitionProperty = "top, left";
        }
        else {
            this.root.style.transition = "";
            this.root.style.transitionProperty = "";
        }

        if (redraw || (redraw === undefined && requiresRedraw)) {
            this.draw();
        }
    }
}
