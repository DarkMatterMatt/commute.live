import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import Route from "./Route";
import Render from "./Render";
import { LiveVehicle, SearchRoute, TransitType } from "./types";
import { localStorageEnabled } from "./Helpers";

const STATE_VERSION = 1;

interface ParsedStateV1 {
    version: number;

    // routes: array of [TransitType, shortName, active, color]
    routes: [TransitType, string, boolean, string][];
}

class State {
    map: google.maps.Map;

    ws: WebSocket;

    version: number;

    routesByShortName: Map<string, Route>;

    $addRoute: HTMLElement;

    constructor(map: google.maps.Map, $addRoute: HTMLElement) {
        this.map = map;
        this.$addRoute = $addRoute;
        this.load();
    }

    static migrate(data: Record<string, any>): ParsedStateV1 {
        /* eslint-disable no-param-reassign */

        // on first load, show route 25B and 70
        if (data.routes === undefined) {
            data.routes = [["bus", "25B", true, "#9400D3"], ["bus", "70", true, "#E67C13"]];
        }
        return {
            version: STATE_VERSION,
            routes:  data.routes,
        };
    }

    toJSON(onlyActive = false): ParsedStateV1 {
        const routes = [...this.routesByShortName.values()].filter(r => !onlyActive || r.active);
        return {
            version: STATE_VERSION,
            routes:  routes.map(r => [r.type, r.shortName, r.active, r.color]),
        };
    }

    save(): void {
        if (localStorageEnabled()) {
            localStorage.setItem("state", JSON.stringify(this));
        }
        else {
            window.location.hash = compressToEncodedURIComponent(JSON.stringify(this.toJSON(true)));
        }
    }

    load(): void {
        let data;
        if (window.location.hash) {
            // trim leading # off location.hash and decompress
            data = decompressFromEncodedURIComponent(window.location.hash.replace(/^#/, ""));
        }
        else if (localStorageEnabled()) {
            data = localStorage.getItem("state");
        }
        const parsed = State.migrate(data ? JSON.parse(data) : {});

        this.routesByShortName = new Map();
        parsed.routes.forEach(([type, shortName, active, color]) => {
            const route = new Route({
                shortName,
                color,
                type,
                map: this.map,
            });
            this.routesByShortName.set(shortName, route);

            if (active) {
                const $activeRoute = Render.createActiveRoute({ shortName }, route.color, false,
                    this.changeRouteColor.bind(this), this.deactivateRoute.bind(this));
                this.$addRoute.parentNode.insertBefore($activeRoute, this.$addRoute);
                route.activate();
            }
        });
    }

    // eslint-disable-next-line class-methods-use-this
    getNewColor(): string {
        return "#E94537";
    }

    isActive({ shortName }: SearchRoute): boolean {
        const route = this.routesByShortName.get(shortName);
        return route ? route.active : false;
    }

    showVehicle(data: LiveVehicle): void {
        const route = this.routesByShortName.get(data.shortName);
        if (route === undefined) {
            console.log("Skipping vehicle update because the route does not exist", data);
            return;
        }
        route.showVehicle(data);
    }

    changeRouteColor({ shortName }: SearchRoute, color: string): void {
        const route = this.routesByShortName.get(shortName);
        if (route) {
            route.setColor(color);
        }
        this.save();
    }

    deactivateRoute({ shortName, $activeRoute }: SearchRoute): void {
        const route = this.routesByShortName.get(shortName);
        if (route !== undefined) {
            route.deactivate();
        }
        $activeRoute.remove();
        this.save();
    }

    async activateRoute({ shortName, type }: SearchRoute): Promise<void> {
        let route = this.routesByShortName.get(shortName);
        let showPickr = false;
        if (route === undefined) {
            showPickr = true;
            route = new Route({
                shortName,
                type,
                color:  this.getNewColor(),
                map:    this.map,
            });
            this.routesByShortName.set(shortName, route);
        }

        const $activeRoute = Render.createActiveRoute({ shortName }, route.color, showPickr,
            this.changeRouteColor.bind(this), this.deactivateRoute.bind(this));
        this.$addRoute.parentNode.insertBefore($activeRoute, this.$addRoute);

        await route.activate();
        this.save();
    }

    async loadRouteVehicles({ shortName }: SearchRoute): Promise<void> {
        const route = this.routesByShortName.get(shortName);
        if (route === undefined) {
            console.error(`Could not reload vehicles for route: ${shortName}. Route is not in routesByShortName.`);
            return;
        }
        await route.loadVehicles();
    }

    async loadActiveRoutesVehicles(): Promise<void> {
        await Promise.all([...this.routesByShortName.values()]
            .filter(r => r.isActive())
            .map(r => this.loadRouteVehicles(r)));
    }
}

export default State;
