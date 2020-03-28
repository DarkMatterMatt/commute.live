import Route from "./Route";
import Render from "./Render";
import { LiveVehicle, SearchRoute } from "./types";

const STATE_VERSION = 1;

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

    static migrate(data: Record<string, any>): Record<string, any> {
        /* eslint-disable no-param-reassign */
        data.version = STATE_VERSION;
        return data;
    }

    toJSON(): Record<string, any> {
        return {
            version: this.version,
            routes:  [...this.routesByShortName.values()].map(r => [r.type, r.shortName, r.active, r.color]),
        };
    }

    save(): void {
        localStorage.setItem("state", JSON.stringify(this));
    }

    load(): void {
        let data: Record<string, any> = {
            version: STATE_VERSION,
            routes:  [],
        };

        const dataStr = localStorage.getItem("state");
        if (dataStr !== null) {
            data = State.migrate({ ...data, ...JSON.parse(dataStr) });
        }

        this.version = data.version;

        this.routesByShortName = new Map();
        for (const [type, shortName, active, color] of data.routes) {
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
        }
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
}

export default State;
