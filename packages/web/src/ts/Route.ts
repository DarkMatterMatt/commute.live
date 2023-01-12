import { binarySearch, defaultProjection, getClosestLatLngOnPolyline, type Id, type LatLng, type LatLngPoint, type LiveVehicle, type StrOrNull } from "@commutelive/common";
import { api } from "./Api";
import type HtmlMarkerView from "./HtmlMarkerView";
import type { MarkerType } from "./types";
import VehicleMarker from "./VehicleMarker";

/** Snap location to route if within this many meters */
const VEHICLE_SNAP_THRESHOLD = 50;

/** Snap bearing to route if within this many degrees */
const VEHICLE_SNAP_BEARING_THRESHOLD = 30;

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
    snapToRoute: boolean;
}

interface ShapePoint extends LatLngPoint {
    dist: number
}

type PolylineOrNull = google.maps.Polyline | null;

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

    private polylines: [PolylineOrNull, PolylineOrNull, PolylineOrNull, PolylineOrNull] | null = null;

    private animateMarkerPosition: boolean;

    private showTransitRoutes: boolean;

    private snapPolylines: [ShapePoint[] | null, ShapePoint[] | null] | null = null;

    private snapToRoute: boolean;

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

    private static findLatLngAtDist(snapPolyline: ShapePoint[], targetDist: number): LatLng {
        if (targetDist < snapPolyline[0].dist) {
            const [{ lat, lng }] = snapPolyline;
            return { lat, lng };
        }
        if (targetDist > snapPolyline[snapPolyline.length - 1].dist) {
            const { lat, lng } = snapPolyline[snapPolyline.length - 1];
            return { lat, lng };
        }

        // search the shape for the target distance
        const result = binarySearch(snapPolyline.map(p => p.dist), targetDist);
        if (result.found !== -1) {
            const { lat, lng } = snapPolyline[result.found];
            return { lat, lng };
        }

        const below = snapPolyline[result.below];
        const above = snapPolyline[result.above];
        const fTo = (targetDist - below.dist) / (above.dist - below.dist);

        // lat/lng can be linearly interpolated for small distances
        return {
            lat: below.lat + ((above.lat - below.lat) * fTo),
            lng: below.lng + ((above.lng - below.lng) * fTo),
        };
    }

    private static absDegreesBetweenBearings(b1: number, b2: number): number {
        const diff = Math.abs(b1 - b2);
        return Math.min(diff, 360 - diff);
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
        this.snapToRoute = o.snapToRoute;
    }

    private snapPositionAndBearing(
        position: LatLng,
        bearing: null | number,
        directionId: null | number,
    ): { position: LatLng, bearing: null | number } {
        if (!this.snapToRoute || directionId == null) {
            return { position, bearing };
        }

        const snapPolyline = this.snapPolylines?.[directionId];
        if (snapPolyline == null) {
            console.warn("No snap polyline for direction", this.id, directionId);
            return { position, bearing };
        }

        // snap position to route
        const snapPosition = getClosestLatLngOnPolyline(snapPolyline, position);
        const distance = defaultProjection.getDistBetweenLatLngs(position, snapPosition);
        if (distance <= VEHICLE_SNAP_THRESHOLD) {
            position = snapPosition;

            const lastPointDist = snapPolyline[snapPosition.i - 1].dist;
            const nextPointDist = snapPolyline[snapPosition.i].dist;
            const dist = lastPointDist + ((nextPointDist - lastPointDist) * snapPosition.fTo);

            // calculate bearing along route
            const behind = Route.findLatLngAtDist(snapPolyline, dist - 10);
            const ahead = Route.findLatLngAtDist(snapPolyline, dist + 20);
            const snapBearing = defaultProjection.getBearingBetweenLatLngs(behind, ahead);
            if (bearing == null
                    || Route.absDegreesBetweenBearings(snapBearing, bearing) < VEHICLE_SNAP_BEARING_THRESHOLD) {
                bearing = snapBearing;
            }
        }
        return { position, bearing };
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
        if (v.position == null) {
            console.warn("Vehicle update does not contain a position", v);
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

        const { position, bearing } = this.snapPositionAndBearing(v.position, v.bearing ?? null, v.directionId ?? null);

        marker.updateLiveData({
            lastUpdated: v.lastUpdated ?? Date.now(),
            position,
            bearing,
        });
    }

    public setColor(color: string): void {
        if (color === this.color) {
            return;
        }
        this.color = color;

        this.polylines?.[2]?.setOptions({ strokeColor: color });
        this.polylines?.[3]?.setOptions({ strokeColor: color });
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

        this.polylines?.forEach(p => p?.setMap(map));
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
            this.polylines?.forEach(p => p?.setMap(null));
            this.polylines = null;
        }
    }

    public async setSnapToRoute(shouldSnap: boolean): Promise<void> {
        if (shouldSnap === this.snapToRoute) {
            return;
        }
        this.snapToRoute = shouldSnap;

        if (shouldSnap && this.snapPolylines == null) {
            await this.loadPolylines();
        }

        // TODO: snap/un-snap existing positions, rather than waiting for new data
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
        if (!this.showTransitRoutes && !this.snapToRoute) {
            return;
        }

        if (this.snapPolylines == null) {
            const { polylines } = await api.queryRoute(this.id, ["polylines"]);
            if (polylines == null) {
                throw new Error(`No polylines found for route ${this.shortName}`);
            }
            this.snapPolylines = [null, null];

            for (const directionId of [0, 1] as const) {
                const polyline = polylines[directionId];
                if (polyline == null) {
                    continue;
                }

                const snapPolyline: ShapePoint[] = [];
                let dist = 0;
                for (let i = 1; i < polyline.length; i++) {
                    const p1 = polyline[i - 1];
                    const p2 = polyline[i];
                    dist += defaultProjection.getDistBetweenLatLngs(p1, p2);
                    snapPolyline.push({
                        ...p1,
                        ...defaultProjection.fromLatLngToPoint(p1),
                        dist,
                    });
                }
                this.snapPolylines[directionId] = snapPolyline;
            }
        }

        if (this.showTransitRoutes && this.polylines == null) {
            const strokeOpacity = 0.7;
            const { map, color } = this;
            const [p0, p1] = this.snapPolylines;

            this.polylines = [
                // background line, so the path isn't affected by the map colour
                p0 && new google.maps.Polyline({ map, path: p0, strokeColor: "black" }),
                p1 && new google.maps.Polyline({ map, path: p1, strokeColor: "white" }),

                // route line, semi-transparent so it's obvious when they overlap
                p0 && new google.maps.Polyline({ map, path: p0, strokeColor: color, strokeOpacity, zIndex: 11 }),
                p1 && new google.maps.Polyline({ map, path: p1, strokeColor: color, strokeOpacity, zIndex: 12 }),
            ];
        }
    }

    public async activate(): Promise<void> {
        if (this.active) {
            return;
        }
        this.active = true;

        await this.loadPolylines();
        await this.loadVehicles();
    }

    public deactivate(): void {
        if (!this.active) {
            return;
        }
        this.active = false;
        api.unsubscribe(this.id);

        this.polylines?.forEach(p => p?.setMap(null));
        this.polylines = null;

        this.vehicleMarkers.forEach(m => this.removeVehicle(m));
    }

    public isActive(): boolean {
        return this.active;
    }
}

export default Route;
