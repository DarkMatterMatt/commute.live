import { fromLatLngLiteral } from "./Helpers";

export interface HtmlMarkerOptions {
    anchorPoint?: google.maps.Point;
    elem: HTMLElement;
    id: string;
    opacity?: number;
    position?: google.maps.LatLng | google.maps.LatLngLiteral;
    size?: google.maps.Size;
    smoothMovementDuration?: number;
    smoothMovementEasing?: string;
}

export default class HtmlMarker {
    private anchorPoint = new google.maps.Point(0, 0);

    private elem!: HTMLElement;

    private id: string;

    private isAdded_ = false;

    private opacity = 1;

    private position: google.maps.LatLng | null = null;

    /**
     * Returns a projection from coordinates to pixel space, if one is available.
     * Initially, no projection is available and this marker will not be drawn on screen.
     */
    private fromLatLngToDivPixelProvider: () => ((latLng: google.maps.LatLng) => google.maps.Point) | null = () => null;

    // container element so we don't modify the user's transitions
    private root = document.createElement("div");

    private size: google.maps.Size | null = null;

    private smoothMovementDuration = 1000;

    private smoothMovementEasing = "cubic-bezier(0.4, 0, 0.2, 1)";

    constructor(opts: HtmlMarkerOptions) {
        this.id = opts.id;
        this.root.classList.add("html-marker");
        this.root.style.position = "absolute";
        this.setAnchorPoint(opts.anchorPoint ?? null);
        this.setHtmlElement(opts.elem);
        this.setOpacity(opts.opacity ?? 1);
        this.setPosition(opts.position ?? null);
        this.setSize(opts.size ?? null);
        this.setSmoothMovementDuration(opts.smoothMovementDuration ?? null);
        this.setSmoothMovementEasing(opts.smoothMovementEasing ?? null);
    }

    public onAdd(): void {
        this.isAdded_ = true;
    }

    public destroy(): void {
        if (this.root.parentNode != null) {
            this.root.parentNode.removeChild(this.root);
        }
    }

    public draw(smoothMovement = true): void {
        // don't draw if we have nothing to draw, or if we aren't on the DOM
        if (this.elem == null || this.root.parentNode == null) {
            return;
        }
        // don't draw if we can't calculate the position
        const fromLatLngToDivPixel = this.fromLatLngToDivPixelProvider();
        if (this.position == null || fromLatLngToDivPixel == null) {
            return;
        }

        if (this.smoothMovementDuration > 0) {
            if (smoothMovement) {
                this.root.style.transition = `all ${this.smoothMovementDuration}ms ${this.smoothMovementEasing}`;
                this.root.style.transitionProperty = "top, left";
            }
            else {
                this.root.style.transition = "";
                this.root.style.transitionProperty = "";
            }
        }

        if (this.size != null) {
            this.elem.style.width = `${this.size.width}px`;
            this.elem.style.height = `${this.size.height}px`;
        }

        this.elem.style.opacity = `${this.opacity}`;

        const coords = fromLatLngToDivPixel(this.position);
        this.root.style.left = `${coords.x - this.anchorPoint.x}px`;
        this.root.style.top = `${coords.y - this.anchorPoint.y}px`;
    }

    public getAnchorPoint(): google.maps.Point {
        return this.anchorPoint;
    }

    public getHtmlElement(): HTMLElement {
        return this.elem;
    }

    public getId(): string {
        return this.id;
    }

    public getOpacity(): number {
        return this.opacity;
    }

    public getPosition(): google.maps.LatLng | null {
        return this.position;
    }

    public getRootElement(): HTMLElement {
        return this.root;
    }

    public getSize(): google.maps.Size | null {
        return this.size;
    }

    public getSmoothMovementEasing(): string {
        return this.smoothMovementEasing;
    }

    public getSmoothMovementDuration(): number {
        return this.smoothMovementDuration;
    }

    public isAdded(): boolean {
        return this.isAdded_;
    }

    public setAnchorPoint(anchorPoint: google.maps.Point | null): void {
        if (anchorPoint != null && !anchorPoint.equals(this.anchorPoint)) {
            this.anchorPoint = anchorPoint;
            this.draw();
        }
    }

    public setHtmlElement(elem: HTMLElement | null): void {
        if (elem != null) {
            if (this.elem != null) {
                this.root.removeChild(this.elem);
            }
            this.elem = elem;
            this.root.appendChild(elem);
            this.draw();
        }
    }

    public setOpacity(opacity: number): void {
        if (this.opacity !== opacity) {
            this.opacity = opacity;
            this.draw();
        }
    }

    public setPosition(position: google.maps.LatLng | google.maps.LatLngLiteral | null): void {
        if (position != null) {
            const pos = fromLatLngLiteral(position);
            if (this.position == null || !pos.equals(this.position)) {
                this.position = pos;
                this.draw();
            }
        }
    }

    public setFromLatLngToDivPixelProvider(provider: HtmlMarker["fromLatLngToDivPixelProvider"]): void {
        this.fromLatLngToDivPixelProvider = provider;
    }

    public setSize(size: google.maps.Size | null): void {
        if (size != null && (this.size == null || !size.equals(this.size))) {
            this.size = size;
            this.draw();
        }
    }

    public setSmoothMovementDuration(smoothMovementDuration: number | null): void {
        if (smoothMovementDuration != null) {
            this.smoothMovementDuration = smoothMovementDuration;
        }

        if (this.smoothMovementDuration > 0) {
            this.root.style.transition = `all ${this.smoothMovementDuration}ms ${this.smoothMovementEasing}`;
            this.root.style.transitionProperty = "top, left";
        }
        else {
            this.root.style.transition = "";
            this.root.style.transitionProperty = "";
        }
    }

    public setSmoothMovementEasing(smoothMovementEasing: string | null): void {
        if (smoothMovementEasing != null) {
            this.smoothMovementEasing = smoothMovementEasing;
        }

        if (this.smoothMovementDuration > 0) {
            this.root.style.transition = `all ${this.smoothMovementDuration}ms ${this.smoothMovementEasing}`;
            this.root.style.transitionProperty = "top, left";
        }
        else {
            this.root.style.transition = "";
            this.root.style.transitionProperty = "";
        }
    }
}
