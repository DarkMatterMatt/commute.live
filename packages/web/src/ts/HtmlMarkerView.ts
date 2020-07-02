import { fromLatLngLiteral, fromLatLngBoundsLiteral } from "./Helpers";

interface Marker {
    id: string;
    elem: HTMLElement;
    size: google.maps.Size;
    position: google.maps.LatLng;
    anchorPoint?: google.maps.Point;
    smoothMovementEasing?: string;
    smoothMovementDuration?: number;
}

interface MarkerId extends Partial<Marker> {
    id: string;
}

const markerDefaults: Partial<Marker> = {
    smoothMovementEasing:   "cubic-bezier(0.4, 0, 0.2, 1)",
    smoothMovementDuration: 1000,
};

class HtmlMarkerView extends google.maps.OverlayView {
    root = document.createElement("div");

    bounds: google.maps.LatLngBounds;

    markers: Map<string, Marker> = new Map();

    top: number;

    left: number;

    height: number;

    width: number;

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
        const proj = this.getProjection();
        const sw = proj.fromLatLngToDivPixel(this.bounds.getSouthWest());
        const ne = proj.fromLatLngToDivPixel(this.bounds.getNorthEast());

        this.top = ne.y;
        this.left = sw.x;
        this.root.style.top = `${ne.y}px`;
        this.root.style.left = `${sw.x}px`;

        const [height, width] = [sw.y - ne.y, ne.x - sw.x];
        if (height !== this.height || width !== this.width) {
            [this.height, this.width] = [height, width];
            this.root.style.height = `${height}px`;
            this.root.style.width = `${width}px`;
            this.markers.forEach(m => this.drawMarker(proj, m, false));
        }
    }

    getRoot(): HTMLDivElement {
        return this.root;
    }

    addMarker(m_: Marker): void {
        const m = { ...markerDefaults, ...m_ };

        this.root.appendChild(m.elem);
        if (this.markers.has(m.id)) {
            throw new Error(`Marker with id '${m.id}' already exists.`);
        }
        this.markers.set(m.id, m);

        m.elem.style.position = "absolute";
        this.updateMarker(m, true);
    }

    removeMarker(m_: MarkerId): void {
        const m = this.markers.get(m_.id);
        if (!m) {
            return;
        }
        this.markers.delete(m.id);
        this.root.removeChild(m.elem);
    }

    drawMarker(proj: google.maps.MapCanvasProjection, m: Marker, smoothMovement = true): void {
        /* eslint-disable no-param-reassign */
        if (!smoothMovement) {
            m.elem.style.transition = "";
            m.elem.style.transitionProperty = "";
        }

        const coords = proj.fromLatLngToDivPixel(m.position);
        m.elem.style.left = `${coords.x - this.left}px`;
        m.elem.style.top = `${coords.y - this.top}px`;
        m.elem.style.width = `${m.size.width}px`;
        m.elem.style.height = `${m.size.height}px`;

        if (!smoothMovement && m.smoothMovementDuration > 0) {
            setTimeout(() => {
                m.elem.style.transition = `all ${m.smoothMovementDuration}ms ${m.smoothMovementEasing}`;
                m.elem.style.transitionProperty = "top, left";
            }, 0);
        }
    }

    updateMarker(m_: MarkerId, forceRedraw = false): void {
        const m = this.markers.get(m_.id);
        if (m == null) {
            throw new Error(`Cannot update a non-existant marker with id '${m_.id}'.`);
        }

        let requiresRedraw = false;
        if (m_.position != null && !m_.position.equals(m.position)) {
            m.position = m_.position;
            requiresRedraw = true;
        }
        if (m_.smoothMovementDuration != null) {
            m.smoothMovementDuration = m_.smoothMovementDuration;
        }
        if (m_.smoothMovementEasing != null) {
            m.smoothMovementEasing = m_.smoothMovementEasing;
        }

        if (m.smoothMovementDuration > 0) {
            m.elem.style.transition = `all ${m.smoothMovementDuration}ms ${m.smoothMovementEasing}`;
            m.elem.style.transitionProperty = "top, left";
        }
        else {
            m.elem.style.transition = "";
            m.elem.style.transitionProperty = "";
        }
        if (forceRedraw || requiresRedraw) {
            this.drawMarker(this.getProjection(), m);
        }
    }

    setMarkerPosition({ id }: MarkerId, pos: google.maps.LatLng | google.maps.LatLngLiteral): void {
        this.updateMarker({
            id,
            position: fromLatLngLiteral(pos),
        });
    }
}

export default HtmlMarkerView;
