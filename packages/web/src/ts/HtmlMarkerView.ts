import type HtmlMarker from "./HtmlMarker";
import ShiftedMapCanvasProjection from "./ShiftedMapCanvasProjection";

class HtmlMarkerView extends google.maps.OverlayView {
    private root = document.createElement("div");

    private referencePoint: google.maps.LatLng;

    private markers: Map<string, HtmlMarker> = new Map();

    private worldWidth: number;

    private shiftedProj = new ShiftedMapCanvasProjection(null, 0, 0);

    private hasDrawn = false;

    constructor(map: google.maps.Map) {
        super();
        this.referencePoint = map.getCenter();
        this.setMap(map);
    }

    onAdd(): void {
        this.root.style.position = "absolute";
        this.root.style.height = "0";
        this.root.style.width = "0";
        this.getPanes().markerLayer.appendChild(this.root);
        this.markers.forEach(m => m.onAdd());
    }

    onRemove(): void {
        this.root.parentNode.removeChild(this.root);
        this.root = null;
    }

    draw(): void {
        this.hasDrawn = true;

        const proj = this.getProjection();
        const pos = proj.fromLatLngToDivPixel(this.referencePoint);
        this.shiftedProj.update(proj, pos.y, pos.x);

        this.root.style.top = `${pos.y}px`;
        this.root.style.left = `${pos.x}px`;

        // only redraw markers when zoom/width changes (don't redraw when panning)
        if (proj.getWorldWidth() !== this.worldWidth) {
            this.worldWidth = proj.getWorldWidth();
            this.markers.forEach(m => m.draw(false));
        }
    }

    getRootElement(): HTMLDivElement {
        return this.root;
    }

    addMarker(m: HtmlMarker): void {
        if (this.markers.has(m.getId())) {
            throw new Error(`Marker with id '${m.getId()}' already exists.`);
        }
        this.markers.set(m.getId(), m);

        this.root.appendChild(m.getRootElement());
        m.setProjection(this.shiftedProj);
        if (this.hasDrawn) {
            m.draw(false);
        }
    }

    removeMarker(m_: HtmlMarker | string): void {
        const m = typeof m_ === "string" ? this.markers.get(m_) : m_;
        if (m != null) {
            this.markers.delete(m.getId());
            this.root.removeChild(m.getRootElement());
        }
    }
}

export default HtmlMarkerView;
