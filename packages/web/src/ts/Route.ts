import VehicleMarker from "./VehicleMarker";
import Api from "./Api";

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

    constructor({ map, type, color, active = false, shortName }: RouteOptions) {
        this.map = map;
        this.type = type;
        this.color = color;
        this.active = active;
        this.shortName = shortName;

        this.longName = null;
        this.polylines = null;
        this.vehicleMarkers = new Map();
    }

    async load(): Promise<void> {
        const { longName, polylines } = await Api.queryRoute(this.shortName, ["longName", "polylines"]);
        this.longName = longName;

        this.polylines = [
            // background line, so the path isn't affected by the map colour
            new google.maps.Polyline({ path: polylines[0], strokeColor: "black" }),
            new google.maps.Polyline({ path: polylines[1], strokeColor: "white" }),

            // route line, semi-transparent so it's obvious when they overlap
            new google.maps.Polyline({ path: polylines[0], strokeColor: this.color, strokeOpacity: 0.7, zIndex: 1 }),
            new google.maps.Polyline({ path: polylines[1], strokeColor: this.color, strokeOpacity: 0.7, zIndex: 2 }),
        ];
    }

    setColor(color: Pickr.HSVaColor): void {
        this.color = color.toHEXA().toString();
        if (this.polylines) {
            this.polylines[2].setOptions({ strokeColor: this.color });
            this.polylines[3].setOptions({ strokeColor: this.color });
        }
        for (const m of Object.values(this.vehicleMarkers) as VehicleMarker[]) {
            m.setIcon(generateMarkerIcon(m.directionId, this.color));
        }
    }

    async show(): Promise<void> {
        if (this.active) {
            return;
        }
        this.active = true;
        await this.load();
        for (const polyline of this.polylines) {
            polyline.setMap(this.map);
        }
    }

    remove(): void {
        if (!this.active) {
            return;
        }
        this.active = false;

        for (const polyline of this.polylines) {
            polyline.setMap(null);
        }

        for (const marker of this.vehicleMarkers.values()) {
            marker.setMap(null);
        }
    }
}

export default Route;
