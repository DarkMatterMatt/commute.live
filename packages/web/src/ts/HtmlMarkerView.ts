import { Preconditions } from "@commutelive/common";
import type HtmlMarker from "./HtmlMarker";
import { CheckedMapCanvasProjection, type MapCanvasProjection, ShiftedMapCanvasProjection  } from "./ShiftedMapCanvasProjection";

class HtmlMarkerView extends google.maps.OverlayView {
    private root = document.createElement("div");

    private referencePoint: google.maps.LatLng;

    private markers: Map<string, HtmlMarker> = new Map();

    private worldWidth: number | null = null;

    private shiftedProj: MapCanvasProjection | null = null;

    private hasDrawn = false;

    private hasAdded = false;

    constructor(map: google.maps.Map) {
        super();
        this.referencePoint = Preconditions.checkExists(map.getCenter());
        this.setMap(map);
    }

    public onAdd(): void {
        this.hasAdded = true;
        this.root.classList.add("html-marker-view");
        this.root.style.position = "absolute";
        this.root.style.height = "0";
        this.root.style.width = "0";
        Preconditions.checkExists(this.getPanes()).markerLayer.appendChild(this.root);
        this.markers.forEach(m => m.onAdd());
    }

    public onRemove(): void {
        this.root.parentNode?.removeChild(this.root);
    }

    public draw(): void {
        this.hasDrawn = true;

        const proj = new CheckedMapCanvasProjection(this.getProjection());
        const pos = proj.fromLatLngToDivPixel(this.referencePoint);
        this.shiftedProj = new ShiftedMapCanvasProjection(proj, pos.y, pos.x);

        this.root.style.top = `${pos.y}px`;
        this.root.style.left = `${pos.x}px`;

        // only redraw markers when zoom/width changes (don't redraw when panning)
        if (proj.getWorldWidth() !== this.worldWidth) {
            this.worldWidth = proj.getWorldWidth();
            this.markers.forEach(m => m.draw(false));
        }
    }

    public getRootElement(): HTMLDivElement {
        return this.root;
    }

    public addMarker(m: HtmlMarker): void {
        if (this.markers.has(m.getId())) {
            throw new Error(`Marker with id '${m.getId()}' already exists.`);
        }
        this.markers.set(m.getId(), m);

        this.root.appendChild(m.getRootElement());
        m.setFromLatLngToDivPixelProvider(this.fromLatLngToDivPixelProvider);

        if (this.hasAdded) {
            m.onAdd();
        }
        if (this.hasDrawn) {
            m.draw(false);
        }
    }

    public removeMarker(m_: HtmlMarker | string): void {
        const m = typeof m_ === "string" ? this.markers.get(m_) : m_;
        if (m != null) {
            this.markers.delete(m.getId());
            this.root.removeChild(m.getRootElement());
        }
    }

    private readonly fromLatLngToDivPixelProvider = () => this.shiftedProj && this.shiftedProj.fromLatLngToDivPixel;
}

export default HtmlMarkerView;
