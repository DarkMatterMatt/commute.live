import type { Id, LiveVehicle, StrOrNull } from "@commutelive/common";
import { api } from "./Api";
import type HtmlMarkerView from "./HtmlMarkerView";
import type { MarkerType } from "./types";
import VehicleMarker from "./VehicleMarker";

/** Snap location to route if within this many meters */
const VEHICLE_SNAP_THRESHOLD = 50;
/** Snap bearing to route if within this many degrees */
// const VEHICLE_SNAP_BEARING_THRESHOLD = 30;

interface RouteOptions {
    map: google.maps.Map;
    type: Route["type"];
    color: string;
    active?: boolean;
    longName: Route["longName"];
    id: Route["id"];
    markerView: HtmlMarkerView;
    markerType: MarkerType;
    shortName: Route["shortName"];
    animateMarkerPosition: boolean;
    showTransitRoutes: boolean;
}

class Route {
    private map: google.maps.Map;

    private markerView: HtmlMarkerView | null = null;

    private readonly type: number;

    public color: string;

    public active = false;

    public readonly id: Id;

    public readonly longName: string;

    private markerType: MarkerType;

    public readonly shortName: string;

    private polylines: google.maps.Polyline[] = [];

    private animateMarkerPosition: boolean;

    private showTransitRoutes: boolean;

    private readonly vehicleMarkers = new Map<string, VehicleMarker>();

    public static getLongName(longNames: [StrOrNull, StrOrNull]) {
        // find best long name, take the first alphabetically if both are specified
        if (longNames[0] && longNames[1]) {
            return longNames[0].localeCompare(longNames[1]) < 0 ? longNames[0] : longNames[1];
        }
        else if (longNames[0]) {
            return longNames[0];
        }
        else if (longNames[1]) {
            return longNames[1];
        }
        throw new Error("No longNames provided");
    }

    public constructor(o: RouteOptions) {
        this.map = o.map;
        this.type = o.type;
        this.color = o.color;
        this.longName = o.longName;
        this.id = o.id;
        this.markerType = o.markerType;
        this.markerView = o.markerView;
        this.shortName = o.shortName;
        this.animateMarkerPosition = o.animateMarkerPosition;
        this.showTransitRoutes = o.showTransitRoutes;
    }

    public removeVehicle(markerOrId: VehicleMarker | string): void {
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

    public showVehicle(v: LiveVehicle): void {
        if (!this.active) {
            console.warn("Route is not active", this.id, v);
            return;
        }
        const { vehicleId: id } = v;
        if (id == null) {
            console.warn("Vehicle is missing identifier", v);
            return;
        }

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

        const shouldSnap = v.snapDeviation && v.snapDeviation < VEHICLE_SNAP_THRESHOLD;

        marker.updateLiveData({
            lastUpdated: v.lastUpdated ?? Date.now(),
            position: shouldSnap ? v.snapPosition : v.position,
            bearing: v.bearing ?? -1,
        });
    }

    public setColor(color: string): void {
        if (color === this.color) {
            return;
        }
        this.color = color;

        if (this.polylines) {
            this.polylines[2].setOptions({ strokeColor: color });
            this.polylines[3].setOptions({ strokeColor: color });
        }
        this.vehicleMarkers.forEach(m => m.setColor(color));
    }

    public setMarkerIconType(type: MarkerType): void {
        this.vehicleMarkers.forEach(m => m.setMarkerIconType(type));
    }

    public setAnimatePosition(animate: boolean): void {
        if (animate === this.animateMarkerPosition) {
            return;
        }
        this.animateMarkerPosition = animate;

        this.vehicleMarkers.forEach(m => m.setAnimatePosition(animate));
    }

    public setMap(map: google.maps.Map): void {
        if (map === this.map) {
            return;
        }
        this.map = map;

        this.polylines.forEach(p => p.setMap(map));
        if (this.markerView != null) {
            this.markerView.setMap(map);
        }
    }

    public setMarkerView(markerView: HtmlMarkerView): void {
        if (markerView === this.markerView) {
            return;
        }
        const oldMarkerView = this.markerView;
        this.markerView = markerView;

        if (oldMarkerView != null) {
            this.vehicleMarkers.forEach(m => oldMarkerView.removeMarker(m));
        }
        this.vehicleMarkers.forEach(m => markerView.addMarker(m));
    }

    public async setShowTransitRoutes(show: boolean): Promise<void> {
        if (!this.active || show === this.showTransitRoutes) {
            return;
        }
        this.showTransitRoutes = show;

        if (show) {
            await this.loadPolylines();
        }
        else {
            this.polylines.forEach(p => p.setMap(null));
            this.polylines = [];
        }
    }

    public async loadVehicles(): Promise<void> {
        api.subscribe(this.id);
        const { vehicles } = await api.queryRoute(this.id, ["vehicles"]);
        if (vehicles == null) {
            throw new Error(`No vehicles found for route ${this.id}`);
        }
        vehicles.map(v => this.showVehicle(v));
    }

    public async loadPolylines(): Promise<void> {
        if (!this.showTransitRoutes) {
            return;
        }
        if (this.polylines.length > 0) {
            console.warn("Polylines already loaded", this.id);
            return;
        }

        const strokeOpacity = 0.7;
        const { map, color } = this;

        const { polylines } = await api.queryRoute(this.id, ["polylines"]);
        if (polylines == null) {
            throw new Error(`No polylines found for route ${this.shortName}`);
        }
        this.polylines = [
            // background line, so the path isn't affected by the map colour
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: "black" }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: "white" }),

            // route line, semi-transparent so it's obvious when they overlap
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: color, strokeOpacity, zIndex: 11 }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: color, strokeOpacity, zIndex: 12 }),
        ];
    }

    public async activate(): Promise<void> {
        if (this.active) {
            return;
        }
        this.active = true;
        await Promise.all([
            this.loadVehicles(),
            this.loadPolylines(),
        ]);
    }

    public deactivate(): void {
        if (!this.active) {
            return;
        }
        this.active = false;
        api.unsubscribe(this.id);

        this.polylines.forEach(p => p.setMap(null));
        this.polylines = [];

        this.vehicleMarkers.forEach(m => this.removeVehicle(m));
    }

    public isActive(): boolean {
        return this.active;
    }
}

export default Route;
