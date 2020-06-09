import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import Route from "./Route";
import Render from "./Render";
import { LiveVehicle, SearchRoute, TransitType } from "./types";
import { localStorageEnabled, isEmptyObject } from "./Helpers";
import { api } from "./Api";
import { settings } from "./Settings";

const STATE_VERSION = 2;

interface ParsedState {
    version: number;

    // routes: array of [shortName, active, color]
    routes: [string, boolean, string][];

    // map of <settingName, value>
    settings: Record<string, any>;
}

let instance: State = null;

class State {
    map: google.maps.Map = null;

    routesByShortName = new Map<string, Route>();

    $activeRoutes: HTMLElement = document.createElement("div");

    private constructor() {
        //
    }

    static getInstance(): State {
        if (instance == null) {
            instance = new State();
        }
        return instance;
    }

    static migrate(data: Record<string, any>): ParsedState {
        /* eslint-disable no-param-reassign */
        const version = data.version as number;

        // on first load, show route 25B and 70
        if (isEmptyObject(data)) {
            return {
                version: STATE_VERSION,
                routes:  [
                    ["25B", true, "#9400D3"],
                    ["70", true, "#E67C13"],
                ],
                settings: {},
            };
        }

        if (version < 2) {
            // remove type from route
            (data.routes as [TransitType, string, boolean, string][]).forEach(r => r.splice(0, 1));
            data.settings = {};
        }

        return {
            version:  STATE_VERSION,
            routes:   data.routes,
            settings: data.settings,
        };
    }

    setMap(map: google.maps.Map): State {
        this.map = map;
        this.routesByShortName.forEach(r => r.setMap(map));
        return this;
    }

    setActiveRoutesElem($new: HTMLElement): State {
        $new.append(...this.$activeRoutes.childNodes);
        this.$activeRoutes = $new;
        return this;
    }

    toJSON(onlyActive = false): ParsedState {
        const routes = [...this.routesByShortName.values()].filter(r => !onlyActive || r.active);
        return {
            version: STATE_VERSION,
            routes:  routes.map(r => [r.shortName, r.active, r.color]),
            settings,
        };
    }

    save(): void {
        if (localStorageEnabled()) {
            localStorage.setItem("state", JSON.stringify(this));
            window.location.hash = "";
        }
        else {
            window.location.hash = compressToEncodedURIComponent(JSON.stringify(this.toJSON(true)));
        }
    }

    async loadRoutes(routes: ParsedState["routes"]): Promise<void> {
        const routesData = await api.queryRoutes(null, ["shortName", "longName", "type"]);

        routes.forEach(([shortName, active, color]) => {
            if (routesData[shortName] == null) {
                return;
            }
            const { longName, type } = routesData[shortName];

            const route = new Route({
                shortName,
                longName,
                color,
                type,
                map: this.map,
            });
            this.routesByShortName.set(shortName, route);

            if (active) {
                const $activeRoute = Render.createActiveRoute({ type, shortName, longName }, route.color, false,
                    this.changeRouteColor.bind(this), this.deactivateRoute.bind(this));
                this.$activeRoutes.appendChild($activeRoute);
                route.activate();
            }
        });
    }

    load(): void {
        // trim leading # off location.hash
        const hash = window.location.hash.replace(/^#/, "");

        let data;
        if (hash) {
            data = decompressFromEncodedURIComponent(hash);
        }
        if (!data && localStorageEnabled()) {
            data = localStorage.getItem("state");
        }
        const parsed = State.migrate(data ? JSON.parse(data) : {});

        settings.import(parsed.settings);
        settings.getNames().forEach(n => settings.addChangeListener(n, () => this.save(), false));

        // run async
        this.loadRoutes(parsed.routes);
    }

    // eslint-disable-next-line class-methods-use-this
    getNewColor(): string {
        return Render.getNewColor([...this.routesByShortName.values()]);
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

    async activateRoute({ shortName, longName, type }: SearchRoute): Promise<void> {
        let route = this.routesByShortName.get(shortName);
        let showPickr = false;
        if (route === undefined) {
            showPickr = true;
            route = new Route({
                shortName,
                longName,
                type,
                color:  this.getNewColor(),
                map:    this.map,
            });
            this.routesByShortName.set(shortName, route);
        }

        const $activeRoute = Render.createActiveRoute({ shortName, longName, type }, route.color, showPickr,
            this.changeRouteColor.bind(this), this.deactivateRoute.bind(this));
        this.$activeRoutes.appendChild($activeRoute);

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

export const state = State.getInstance();
