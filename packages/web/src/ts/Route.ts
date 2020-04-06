import { LiveVehicle } from "./types";
import VehicleMarker from "./VehicleMarker";
import Api from "./Api";
import Render from "./Render";

/**
 * Calculates a bezier blend curve
 * @param t position on the curve, 0 <= t <= 1
 */
function bezierBlend(t: number): number {
    return t * t * (3 - 2 * t);
}

interface RouteOptions {
    map: google.maps.Map;
    type: Route["type"];
    color: string;
    active?: boolean;
    shortName: Route["shortName"];
}

class Route {
    map: google.maps.Map;

    type: "bus" | "rail" | "ferry";

    color: string;

    active: boolean;

    longName: string;

    shortName: string;

    polylines: google.maps.Polyline[];

    vehicleMarkers: Map<string, VehicleMarker>;

    constructor({ map, type, color, shortName }: RouteOptions) {
        this.map = map;
        this.type = type;
        this.color = color;
        this.shortName = shortName;

        this.active = false;
        this.longName = null;
        this.polylines = [];
        this.vehicleMarkers = new Map();
    }

    generateMarkerIcon(directionId: LiveVehicle["directionId"], opacity? = 1): google.maps.Icon {
        const fill = this.color;
        const dotFill = directionId === 0 ? "#000" : "#FFF";
        const dotOpacity = 0.5 * opacity;
        return Render.createMarkerIcon({ fill, dotFill, opacity, dotOpacity, borderOpacity: opacity });
    }

    showVehicle({ vehicleId, position, lastUpdatedUnix, directionId }: LiveVehicle): void {
        let marker = this.vehicleMarkers.get(vehicleId);
        if (marker === undefined) {
            marker = new VehicleMarker({ map: this.map });
            this.vehicleMarkers.set(vehicleId, marker);

            marker.interval = setInterval(() => {
                // delete marker after no update for 90 seconds
                const now = (new Date()).getTime() / 1000;
                if (marker.lastUpdatedUnix < now - 90) {
                    marker.setMap(null);
                    clearInterval(marker.interval);
                    this.vehicleMarkers.delete(vehicleId);
                }
                // marker starts going transparent after no update for 20 seconds
                else if (marker.lastUpdatedUnix < now - 20) {
                    // bezier from 20 to 90 secs, minimum of 0.3 opacity
                    const opacity = 1 - 0.7 * bezierBlend((now - marker.lastUpdatedUnix - 20) / (90 - 20));
                    marker.setIcon(this.generateMarkerIcon(directionId, opacity));
                }
            }, 1000 + Math.floor(Math.random() * 200));
        }

        marker.setPosition(position);
        marker.setIcon(this.generateMarkerIcon(directionId));
        marker.lastUpdatedUnix = lastUpdatedUnix;
        marker.directionId = directionId;
    }

    setColor(color: string): void {
        this.color = color;
        if (this.polylines) {
            this.polylines[2].setOptions({ strokeColor: color });
            this.polylines[3].setOptions({ strokeColor: color });
        }
        this.vehicleMarkers.forEach(m => m.setIcon(this.generateMarkerIcon(m.directionId)));
    }

    async loadVehicles(): Promise<void> {
        Api.subscribe(this.shortName);
        const { vehicles } = await Api.queryRoute(this.shortName, ["vehicles"]);
        Object.values(vehicles).map(v => this.showVehicle(v));
    }

    async activate(): Promise<void> {
        if (this.active) {
            return;
        }
        this.active = true;
        const [{ longName, polylines }] = await Promise.all([
            Api.queryRoute(this.shortName, ["longName", "polylines"]),
            this.loadVehicles(),
        ]);

        this.longName = longName;

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
        Api.unsubscribe(this.shortName);

        this.polylines.forEach(p => p.setMap(null));
        this.polylines = [];

        this.vehicleMarkers.forEach(m => m.setMap(null));
    }

    isActive(): boolean {
        return this.active;
    }
}

export default Route;
