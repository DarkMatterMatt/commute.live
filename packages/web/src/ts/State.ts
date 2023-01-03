import type { Id, LiveVehicle } from "@commutelive/common";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { api } from "./Api";
import { isEmptyObject, localStorageEnabled } from "./Helpers";
import type HtmlMarkerView from "./HtmlMarkerView";
import Render from "./Render";
import Route from "./Route";
import { settings } from "./Settings";
import type { MarkerType, SearchRoute } from "./types";

const STATE_VERSION = 3;

interface ParsedState {
    version: number;

    // routes: array of [routeId, active, color]
    routes: [Id, boolean, string][];

    // map of <settingName, value>
    settings: Record<string, any>;
}

let instance: State | null = null;

class State {
    /** Is the user's first visit (i.e. user has never modified the default routes & settings). */
    private bIsFirstVisit = true;

    private map: google.maps.Map | null = null;

    private markerView: HtmlMarkerView | null = null;

    private routes = new Map<Id, Route>();

    private $activeRoutes: HTMLElement = document.createElement("div");

    private constructor() {
        //
    }

    static getInstance(): State {
        if (instance == null) {
            instance = new State();
        }
        return instance;
    }

    static migrate(data: Record<string, any>): ParsedState & { isFirstVisit: boolean } {
        /* eslint-disable no-param-reassign */
        const version = data.version as number;

        // on first load, show route 25B and 70
        if (isEmptyObject(data)) {
            return {
                isFirstVisit: true,
                version: STATE_VERSION,
                routes: [
                    ["NZL_AKL|25B" as Id, true, "#9400D3"],
                    ["NZL_AKL|70" as Id, true, "#E67C13"],
                ],
                settings: {},
            };
        }

        if (version < 2) {
            // remove type from route
            (data.routes as [string, string, boolean, string][]).forEach(r => r.splice(0, 1));
            data.settings = {};
        }

        if (version < 3) {
            // convert shortName to routeId
            (data.routes as [string, boolean, string][]).map(r => [`NZL_AKL|${r[0]}` as Id, ...r.slice(1)]);
            data.settings = {};
        }

        return {
            isFirstVisit: false,
            version: STATE_VERSION,
            routes: data.routes,
            settings: data.settings,
        };
    }

    setMap(map: google.maps.Map): State {
        this.map = map;
        this.routes.forEach(r => r.setMap(map));
        return this;
    }

    setMarkerView(markerView: HtmlMarkerView): State {
        this.markerView = markerView;
        this.routes.forEach(r => r.setMarkerView(markerView));
        return this;
    }

    setActiveRoutesElem($new: HTMLElement): State {
        $new.append(...this.$activeRoutes.childNodes);
        this.$activeRoutes = $new;
        return this;
    }

    toJSON(onlyActive = false): ParsedState {
        const routes = [...this.routes.values()].filter(r => !onlyActive || r.active);
        return {
            version: STATE_VERSION,
            routes: routes.map(r => [r.id, r.active, r.color]),
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
        const animateMarkerPosition = settings.getBool("animateMarkerPosition");
        const showTransitRoutes = settings.getBool("showTransitRoutes");
        const markerType = settings.getStr("markerType") as MarkerType;

        const { map, markerView } = this;
        if (map == null || markerView == null) {
            throw new Error("Map or markerView is not set");
        }

        const activeAndColorMap = new Map(routes.map(([id, active, color]) => [id, [active, color] as const]));
        const foundRoutes = await api.queryRoutes(routes.map(r => r[0]), ["id", "shortName", "longNames", "type"]);

        foundRoutes.forEach(({ id, shortName, longNames, type }) => {
            const activeAndColor = activeAndColorMap.get(id);
            if (activeAndColor == null) {
                // this should never happen
                console.warn(`Route ${id} not found`);
                return;
            }
            const [active, color] = activeAndColor;
            const longName = Route.getLongName(longNames);

            const route = new Route({
                id,
                animateMarkerPosition,
                showTransitRoutes,
                shortName,
                longName,
                color,
                type,
                map,
                markerView,
                markerType,
            });
            this.routes.set(id, route);

            if (active) {
                const $activeRoute = Render.createActiveRoute(
                    { id, type, shortName, longName },
                    route.color,
                    false,
                    this.changeRouteColor.bind(this),
                    this.deactivateRoute.bind(this),
                );
                this.$activeRoutes.appendChild($activeRoute);
                route.activate();
            }
        });
    }

    load(): () => Promise<void> {
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
        this.bIsFirstVisit = parsed.isFirstVisit;

        settings.import(parsed.settings);
        settings.getNames().forEach(n => settings.addChangeListener(n, () => this.save(), false));

        // return function to load routes
        return () => this.loadRoutes(parsed.routes);
    }

    // eslint-disable-next-line class-methods-use-this
    getNewColor(): string {
        return Render.getNewColor([...this.routes.values()]);
    }

    getRoutesByShortName(): Map<string, Route> {
        return this.routes;
    }

    isActive({ id }: SearchRoute): boolean {
        const route = this.routes.get(id);
        return route ? route.active : false;
    }

    /** Is the user's first visit (i.e. user has never modified the default routes & settings). */
    isFirstVisit(): boolean {
        return this.bIsFirstVisit;
    }

    showVehicle(data: LiveVehicle): void {
        const route = this.routes.get(data.id);
        if (route === undefined) {
            console.log("Skipping vehicle update because the route does not exist", data);
            return;
        }
        route.showVehicle(data);
    }

    changeRouteColor(id: Id, color: string): void {
        const route = this.routes.get(id);
        if (route) {
            route.setColor(color);
        }
        this.save();
    }

    deactivateRoute(id: Id, $activeRoute: HTMLDivElement): void {
        const route = this.routes.get(id);
        if (route !== undefined) {
            route.deactivate();
        }
        $activeRoute.remove();
        this.save();
    }

    async activateRoute({ id, shortName, longName, type }: SearchRoute): Promise<void> {
        const { map, markerView } = this;
        if (map == null || markerView == null) {
            throw new Error("Map or markerView is not set");
        }

        let route = this.routes.get(id);
        let showPickr = false;
        if (route === undefined) {
            const animateMarkerPosition = settings.getBool("animateMarkerPosition");
            const showTransitRoutes = settings.getBool("showTransitRoutes");
            const markerType = settings.getStr("markerType") as MarkerType;
            showPickr = true;
            route = new Route({
                id,
                animateMarkerPosition,
                showTransitRoutes,
                shortName,
                longName,
                type,
                color: this.getNewColor(),
                map,
                markerView,
                markerType,
            });
            this.routes.set(id, route);
        }

        const $activeRoute = Render.createActiveRoute(
            { id, shortName, longName, type },
            route.color,
            showPickr,
            this.changeRouteColor.bind(this),
            this.deactivateRoute.bind(this),
        );
        this.$activeRoutes.appendChild($activeRoute);

        await route.activate();
        this.save();
    }

    async loadRouteVehicles(id: Id): Promise<void> {
        const route = this.routes.get(id);
        if (route === undefined) {
            console.error(`Could not reload vehicles for route: ${id}.`);
            return;
        }
        await route.loadVehicles();
    }

    async loadActiveRoutesVehicles(): Promise<void> {
        await Promise.all([...this.routes.values()]
            .filter(r => r.isActive())
            .map(r => this.loadRouteVehicles(r.id)));
    }
}

export default State;

export const state = State.getInstance();
