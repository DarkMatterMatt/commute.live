import VehicleMarker from "./VehicleMarker";
import { api } from "./Api";
import HtmlMarkerView from "./HtmlMarkerView";

interface RouteOptions {
    map: google.maps.Map;
    type: Route["type"];
    color: string;
    active?: boolean;
    longName: Route["longName"];
    markerView: HtmlMarkerView;
    shortName: Route["shortName"];
    animateMarkerPosition: boolean;
}

class Route {
    map: google.maps.Map;

    markerView: HtmlMarkerView = null;

    type: "bus" | "rail" | "ferry";

    color: string;

    active: boolean;

    longName: string;

    shortName: string;

    polylines: google.maps.Polyline[];

    animateMarkerPosition: boolean;

    vehicleMarkers: Map<string, VehicleMarker>;

    constructor({ map, type, color, longName, markerView, shortName, animateMarkerPosition }: RouteOptions) {
        this.map = map;
        this.type = type;
        this.color = color;
        this.longName = longName;
        this.markerView = markerView;
        this.shortName = shortName;
        this.animateMarkerPosition = animateMarkerPosition;

        this.active = false;
        this.polylines = [];
        this.vehicleMarkers = new Map();
    }

    removeVehicle(markerOrId: VehicleMarker | string): void {
        const marker = typeof markerOrId === "string" ? this.vehicleMarkers.get(markerOrId) : markerOrId;
        if (marker == null) {
            return;
        }
        if (this.markerView != null) {
            this.markerView.removeMarker(marker);
        }
        this.vehicleMarkers.delete(marker.getId());
        marker.destroy();
    }

    showVehicle({ vehicleId, position, lastUpdatedUnix, directionId }: LiveVehicle): void {
        let marker = this.vehicleMarkers.get(vehicleId);
        if (marker == null) {
            marker = new VehicleMarker({
                id:              vehicleId,
                color:           this.color,
                onExpiry:        () => this.removeVehicle(vehicleId),
                animatePosition: this.animateMarkerPosition,
            });
            this.vehicleMarkers.set(vehicleId, marker);
            if (this.markerView != null) {
                this.markerView.addMarker(marker);
            }
        }
        marker.updateLiveData({
            directionId,
            lastUpdated: lastUpdatedUnix * 1000,
            position,
        });
    }

    setColor(color: string): void {
        this.color = color;
        if (this.polylines) {
            this.polylines[2].setOptions({ strokeColor: color });
            this.polylines[3].setOptions({ strokeColor: color });
        }
        this.vehicleMarkers.forEach(m => m.setColor(color));
    }

    setAnimatePosition(animate: boolean): void {
        this.animateMarkerPosition = animate;
        this.vehicleMarkers.forEach(m => m.setAnimatePosition(animate));
    }

    setMap(map: google.maps.Map): void {
        this.map = map;
        this.polylines.forEach(p => p.setMap(map));
        if (this.markerView != null) {
            this.markerView.setMap(map);
        }
    }

    setMarkerView(markerView: HtmlMarkerView): void {
        if (this.markerView != null) {
            this.vehicleMarkers.forEach(m => this.markerView.removeMarker(m));
        }
        this.markerView = markerView;
        this.vehicleMarkers.forEach(m => this.markerView.addMarker(m));
    }

    async loadVehicles(): Promise<void> {
        api.subscribe(this.shortName);
        const { vehicles } = await api.queryRoute(this.shortName, ["vehicles"]);
        Object.values(vehicles).map(v => this.showVehicle(v));
    }

    async activate(): Promise<void> {
        if (this.active) {
            return;
        }
        this.active = true;
        const [{ polylines }] = await Promise.all([
            api.queryRoute(this.shortName, ["polylines"]),
            this.loadVehicles(),
        ]);

        const { map } = this;
        const strokeOpacity = 0.7;
        this.polylines = [
            // background line, so the path isn't affected by the map colour
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: "black" }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: "white" }),

            // route line, semi-transparent so it's obvious when they overlap
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: this.color, strokeOpacity, zIndex: 1 }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: this.color, strokeOpacity, zIndex: 2 }),
        ];
    }

    deactivate(): void {
        if (!this.active) {
            return;
        }
        this.active = false;
        api.unsubscribe(this.shortName);

        this.polylines.forEach(p => p.setMap(null));
        this.polylines = [];

        this.vehicleMarkers.forEach(m => this.removeVehicle(m));
    }

    isActive(): boolean {
        return this.active;
    }
}

export default Route;
