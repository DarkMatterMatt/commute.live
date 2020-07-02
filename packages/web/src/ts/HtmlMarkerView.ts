import { fromLatLngBoundsLiteral } from "./Helpers";
import ShiftedMapCanvasProjection from "./ShiftedMapCanvasProjection";
import HtmlMarker from "./HtmlMarker";

class HtmlMarkerView extends google.maps.OverlayView {
    root = document.createElement("div");

    bounds: google.maps.LatLngBounds;

    markers: Map<string, HtmlMarker> = new Map();

    top: number;

    left: number;

    height: number;

    width: number;

    shiftedProj = new ShiftedMapCanvasProjection(null, 0, 0);

    hasDrawn = false;

    constructor(bounds: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral, map: google.maps.Map) {
        super();
        this.setBounds(bounds);
        this.setMap(map);
    }

    setBounds(bounds: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral): HtmlMarkerView {
        this.bounds = fromLatLngBoundsLiteral(bounds);
        return this;
    }

    onAdd(): void {
        this.root.style.position = "absolute";
        this.getPanes().markerLayer.appendChild(this.root);

        this.root.style.backgroundColor = "red";
        this.root.style.opacity = "0.2";
    }

    onRemove(): void {
        this.root.parentNode.removeChild(this.root);
        this.root = null;
    }

    draw(): void {
        this.hasDrawn = true;

        const proj = this.getProjection();
        const sw = proj.fromLatLngToDivPixel(this.bounds.getSouthWest());
        const ne = proj.fromLatLngToDivPixel(this.bounds.getNorthEast());

        this.top = ne.y;
        this.left = sw.x;
        this.root.style.top = `${this.top}px`;
        this.root.style.left = `${this.left}px`;

        this.shiftedProj.update(proj, this.top, this.left);

        const [height, width] = [sw.y - ne.y, ne.x - sw.x];
        if (height !== this.height || width !== this.width) {
            [this.height, this.width] = [height, width];
            this.root.style.height = `${height}px`;
            this.root.style.width = `${width}px`;

            this.markers.forEach(m => m.draw(false));
        }
    }

    getDomElement(): HTMLDivElement {
        return this.root;
    }

    addMarker(m: HtmlMarker): void {
        if (this.markers.has(m.id)) {
            throw new Error(`Marker with id '${m.id}' already exists.`);
        }
        this.markers.set(m.id, m);

        this.root.appendChild(m.getDomElement());
        m.setProjection(this.shiftedProj);
        if (this.hasDrawn) {
            m.draw(false);
        }
    }

    removeMarker({ id }: { id: string }): void {
        this.markers.delete(id);
    }
}

export default HtmlMarkerView;
