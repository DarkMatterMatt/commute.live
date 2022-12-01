import { fromLatLngLiteral } from "./Helpers";
import type ShiftedMapCanvasProjection from "./ShiftedMapCanvasProjection";

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

    private proj: ShiftedMapCanvasProjection | null = null;

    // container element so we don't modify the user's transitions
    private root = document.createElement("div");

    private size: google.maps.Size | null = null;

    private smoothMovementDuration = 1000;

    private smoothMovementEasing = "cubic-bezier(0.4, 0, 0.2, 1)";

    constructor(opts: HtmlMarkerOptions) {
        this.id = opts.id;
        this.root.style.position = "absolute";
        this.setAnchorPoint(opts.anchorPoint ?? null);
        this.setHtmlElement(opts.elem);
        this.setOpacity(opts.opacity ?? 1);
        this.setPosition(opts.position ?? null);
        this.setSize(opts.size ?? null);
        this.setSmoothMovementDuration(opts.smoothMovementDuration ?? null);
        this.setSmoothMovementEasing(opts.smoothMovementEasing ?? null);
    }

    onAdd(): void {
        this.isAdded_ = true;
    }

    destroy(): void {
        if (this.root.parentNode != null) {
            this.root.parentNode.removeChild(this.root);
        }
    }

    draw(smoothMovement = true): void {
        // don't draw if we have nothing to draw, or if we aren't on the DOM
        if (this.elem == null || this.root.parentNode == null) {
            return;
        }
        // don't draw if we can't calculate the position
        if (this.position == null || this.proj == null || !this.proj.isValid()) {
            return;
        }

        /* eslint-disable no-param-reassign */
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

        const coords = this.proj.fromLatLngToDivPixel(this.position);
        this.root.style.left = `${coords.x - this.anchorPoint.x}px`;
        this.root.style.top = `${coords.y - this.anchorPoint.y}px`;
    }

    getAnchorPoint(): google.maps.Point {
        return this.anchorPoint;
    }

    getHtmlElement(): HTMLElement {
        return this.elem;
    }

    getId(): string {
        return this.id;
    }

    getOpacity(): number {
        return this.opacity;
    }

    getPosition(): google.maps.LatLng | null {
        return this.position;
    }

    getProjection(): google.maps.MapCanvasProjection | ShiftedMapCanvasProjection | null {
        return this.proj;
    }

    getRootElement(): HTMLElement {
        return this.root;
    }

    getSize(): google.maps.Size | null {
        return this.size;
    }

    getSmoothMovementEasing(): string {
        return this.smoothMovementEasing;
    }

    getSmoothMovementDuration(): number {
        return this.smoothMovementDuration;
    }

    isAdded(): boolean {
        return this.isAdded_;
    }

    setAnchorPoint(anchorPoint: google.maps.Point | null): void {
        if (anchorPoint != null && !anchorPoint.equals(this.anchorPoint)) {
            this.anchorPoint = anchorPoint;
            this.draw();
        }
    }

    setHtmlElement(elem: HTMLElement | null): void {
        if (elem != null) {
            if (this.elem != null) {
                this.root.removeChild(this.elem);
            }
            this.elem = elem;
            this.root.appendChild(elem);
            this.draw();
        }
    }

    setOpacity(opacity: number): void {
        if (this.opacity !== opacity) {
            this.opacity = opacity;
            this.draw();
        }
    }

    setPosition(position: google.maps.LatLng | google.maps.LatLngLiteral | null): void {
        if (position != null) {
            const pos = fromLatLngLiteral(position);
            if (this.position == null || !pos.equals(this.position)) {
                this.position = pos;
                this.draw();
            }
        }
    }

    setProjection(proj: ShiftedMapCanvasProjection): void {
        this.proj = proj;
    }

    setSize(size: google.maps.Size | null): void {
        if (size != null && (this.size == null || !size.equals(this.size))) {
            this.size = size;
            this.draw();
        }
    }

    setSmoothMovementDuration(smoothMovementDuration: number | null): void {
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

    setSmoothMovementEasing(smoothMovementEasing: string | null): void {
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
