import { api } from "./Api";
import HtmlMarkerView from "./HtmlMarkerView";
import VehicleMarker from "./VehicleMarker";

/** Snap location to route if within this many meters */
const VEHICLE_SNAP_THRESHOLD = 50;
/** Snap bearing to route if within this many degrees */
// const VEHICLE_SNAP_BEARING_THRESHOLD = 30;

/** Wildcard route shows all vehicles and routes */
export const WILDCARD_ROUTE = {
    shortName: "# ALL",
    longName: "Show all routes and vehicles. This may crash your browser!",
    type: "bus" as TransitType,
};

interface RouteOptions {
    map: google.maps.Map;
    type: Route["type"];
    color: string;
    active?: boolean;
    longName: Route["longName"];
    markerView: HtmlMarkerView;
    markerType: MarkerType;
    shortName: Route["shortName"];
    animateMarkerPosition: boolean;
    showTransitRoutes: boolean;
}

class Route {
    map: google.maps.Map;

    markerView: HtmlMarkerView = null;

    type: TransitType;

    color: string;

    active: boolean;

    longName: string;

    markerType: MarkerType;

    shortName: string;

    polylines: google.maps.Polyline[];

    animateMarkerPosition: boolean;

    showTransitRoutes: boolean;

    vehicleMarkers: Map<string, VehicleMarker>;

    wildcardRouteLookup: Map<string, TransitType>;

    constructor(o: RouteOptions) {
        this.map = o.map;
        this.type = o.type;
        this.color = o.color;
        this.longName = o.longName;
        this.markerType = o.markerType;
        this.markerView = o.markerView;
        this.shortName = o.shortName;
        this.animateMarkerPosition = o.animateMarkerPosition;
        this.showTransitRoutes = o.showTransitRoutes;

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

    showVehicle(v: LiveVehicle): void {
        const id = this.shortName === WILDCARD_ROUTE.shortName ? `wildcard_${v.vehicleId}` : v.vehicleId;
        let marker = this.vehicleMarkers.get(id);
        if (marker == null) {
            marker = new VehicleMarker({
                id,
                color: this.color,
                onExpiry: () => this.removeVehicle(id),
                animatePosition: this.animateMarkerPosition,
                transitType: this.type,
                markerType: this.markerType,
            });
            this.vehicleMarkers.set(id, marker);
            if (this.markerView != null) {
                this.markerView.addMarker(marker);
            }
        }

        const shouldSnap = v.snapDeviation < VEHICLE_SNAP_THRESHOLD;

        marker.updateLiveData({
            lastUpdated: v.lastUpdated,
            position: shouldSnap ? v.snapPosition : v.position,
            bearing: v.bearing,
        });
    }

    setColor(color: string): void {
        this.color = color;

        // don't change the colour of background polylines
        const skipFirstPolylines = this.shortName === WILDCARD_ROUTE.shortName ? 0 : 2;
        this.polylines.slice(skipFirstPolylines).forEach(p => p.setOptions({ strokeColor: color }));

        this.vehicleMarkers.forEach(m => m.setColor(color));
    }

    public setMarkerIconType(type: MarkerType): void {
        this.vehicleMarkers.forEach(m => m.setMarkerIconType(type));
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

    async setShowTransitRoutes(show: boolean): Promise<void> {
        this.showTransitRoutes = show;
        if (show && this.active) {
            this.loadPolylines();
        }
        else {
            this.polylines.forEach(p => p.setMap(null));
            this.polylines = [];
        }
    }

    async loadVehicles(): Promise<void> {
        if (this.shortName === WILDCARD_ROUTE.shortName) {
            api.subscribe("#");
            const routes = await api.queryRoutes(null, ["vehicles"]);
            Object.values(routes).forEach(r => Object.values(r.vehicles).map(v => this.showVehicle(v)));
            return;
        }

        api.subscribe(this.shortName);
        const { vehicles } = await api.queryRoute(this.shortName, ["vehicles"]);
        Object.values(vehicles).map(v => this.showVehicle(v));
    }

    async loadPolylines(): Promise<void> {
        if (!this.showTransitRoutes) {
            return;
        }
        const strokeOpacity = 0.7;
        const { map, color } = this;

        if (this.shortName === WILDCARD_ROUTE.shortName) {
            // load all routes
            const routes = await api.queryRoutes(null, ["polylines"]);
            this.polylines = Object.values(routes).flatMap(r => [
                new google.maps.Polyline({ map, path: r.polylines[0], strokeColor: color, strokeOpacity, zIndex: 10 }),
                new google.maps.Polyline({ map, path: r.polylines[1], strokeColor: color, strokeOpacity, zIndex: 10 }),
            ]);
            return;
        }

        const { polylines } = await api.queryRoute(this.shortName, ["polylines"]);
        this.polylines = [
            // background line, so the path isn't affected by the map colour
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: "black" }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: "white" }),

            // route line, semi-transparent so it's obvious when they overlap
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: color, strokeOpacity, zIndex: 11 }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: color, strokeOpacity, zIndex: 12 }),
        ];
    }

    async activate(): Promise<void> {
        if (this.active) {
            return;
        }
        this.active = true;

        if (this.shortName === WILDCARD_ROUTE.shortName) {
            const routes = await api.queryRoutes(null, ["type"]);
            this.wildcardRouteLookup = new Map(Object.entries(routes).map(([k, v]) => [k, v.type]));
        }

        await Promise.all([
            this.loadVehicles(),
            this.loadPolylines(),
        ]);
    }

    deactivate(): void {
        if (!this.active) {
            return;
        }
        this.active = false;
        api.unsubscribe(this.shortName === WILDCARD_ROUTE.shortName ? "#" : this.shortName);

        this.polylines.forEach(p => p.setMap(null));
        this.polylines = [];

        this.vehicleMarkers.forEach(m => this.removeVehicle(m));
    }

    isActive(): boolean {
        return this.active;
    }
}

export default Route;
