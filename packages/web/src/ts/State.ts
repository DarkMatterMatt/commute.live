import { defaultProjection, type Id, type LatLng, type LiveVehicle, type RegionCode, type RegionDataResult, type RegionsDataResult } from "@commutelive/common";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { api } from "./Api";
import { isEmptyObject, localStorageEnabled } from "./Helpers";
import type HtmlMarkerView from "./HtmlMarkerView";
import Render, { render } from "./Render";
import Route from "./Route";
import { settings } from "./Settings";
import type { MarkerType, SearchRoute } from "./types";

const STATE_VERSION = 4;

interface ParsedState {
    version: number;

    /** routes: array of [routeId, active, color] */
    routes: [routeId: Id, active: boolean, color: string][];

    /** map of <settingName, value> */
    settings: Record<string, any>;

    /** map settings, array of [lat, lng, zoom] */
    map: [lat: number, lng: number, zoom: number];
}

let instance: State | null = null;

class State {
    /** Is the user's first visit (i.e. user has never modified the default routes & settings). */
    private bIsFirstVisit = true;

    private map: google.maps.Map | null = null;

    private markerView: HtmlMarkerView | null = null;

    private routes = new Map<Id, Route>();

    private regionsCache: null | RegionsDataResult = null;

    private constructor() {
        //
    }

    static getInstance(): State {
        if (instance == null) {
            instance = new State();
        }
        return instance;
    }

    static migrate(data: Record<string, any>): (ParsedState & { isFirstVisit: false }) | { isFirstVisit: true } {
        const version = data.version as number;

        // on first load, show route 25B and 70
        if (isEmptyObject(data)) {
            return { isFirstVisit: true };
        }

        if (version < 2) {
            // remove type from route
            (data.routes as [string, string, boolean, string][]).forEach(r => r.splice(0, 1));
            data.settings = {};
        }

        if (version < 3) {
            // convert shortName to routeId
            data.routes = (data.routes as [string, boolean, string][])
                .map(r => [`NZL_AKL|${r[0]}` as Id, ...r.slice(1)]);
        }

        if (version < 4) {
            // add NZL_AKL map settings
            data.map = [-36.8484, 174.7633, 13];
            data.settings.currentRegion = "SMART";
        }

        return {
            isFirstVisit: false,
            version: STATE_VERSION,
            routes: data.routes,
            settings: data.settings,
            map: data.map,
        };
    }

    private async getRegions(): Promise<RegionsDataResult> {
        if (this.regionsCache != null) {
            return this.regionsCache;
        }
        this.regionsCache = await api.queryRegions(
            "all",
            ["code", "location", "country", "region", "attributionHTML", "defaultZoom", "defaultRouteIds"],
        );
        return this.regionsCache;
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
        render.setActiveRoutesElem($new);
        return this;
    }

    toJSON(onlyActive = false): ParsedState {
        if (!this.map) {
            throw new Error("Map is not set");
        }

        const routes = [...this.routes.values()].filter(r => !onlyActive || r.active);
        return {
            version: STATE_VERSION,
            routes: routes.map(r => [r.id, r.active, r.color]),
            settings,
            map: [this.map.getCenter().lat(), this.map.getCenter().lng(), this.map.getZoom()],
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
        const foundRoutes = await api.queryRoutes(
            routes.map(r => r[0]),
            ["region", "id", "shortName", "longNames", "type"],
        );

        foundRoutes.forEach(({ region, id, shortName, longNames, type }) => {
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
                    this.deactivateRoute.bind(this, region),
                );
                render.addActiveRoute($activeRoute, region);
                route.activate();
            }
        });
    }

    async getFirstVisitState(): Promise<ParsedState> {
        // guesstimate where the user is based on their IP address
        const [userLocation, regions] = await Promise.all([
            api.queryIpLocation(),
            this.getRegions(),
        ]);

        // find the closest region to the user, defaulting to NZ if unknown
        const closestRegion = userLocation
            ? await this.getClosestRegion(userLocation)
            : regions.find(r => r.code === "NZL_AKL") ?? [...regions.values()][0];

        const defaultColors = ["#9400D3", "#E67C13", "#1DCE1D", "#5555FF"];
        const routes = closestRegion.defaultRouteIds
            .slice(0, defaultColors.length)
            .map((id, i) => [id, true, defaultColors[i]] as [Id, boolean, string]);

        return {
            version: STATE_VERSION,
            routes,
            settings: {
                currentRegion: closestRegion.code,
            },
            map: [closestRegion.location.lat, closestRegion.location.lng, closestRegion.defaultZoom],
        };
    }

    async load() {
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

        const state = parsed.isFirstVisit ? await this.getFirstVisitState() : parsed;

        settings.import(state.settings);
        settings.getNames().forEach(n => settings.addChangeListener(n, () => this.save(), false));

        // return function to load routes
        return {
            loadRoutes: () => this.loadRoutes(state.routes),
            map: {
                center: { lat: state.map[0], lng: state.map[1] },
                zoom: state.map[2],
            },
        };
    }

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

    deactivateRoute(region: RegionCode, id: Id, $activeRoute: HTMLDivElement): void {
        const route = this.routes.get(id);
        if (route !== undefined) {
            route.deactivate();
        }
        render.removeActiveRoute($activeRoute, region);
        this.save();
    }

    async activateRoute({ region, id, shortName, longName, type }: SearchRoute): Promise<void> {
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
            this.deactivateRoute.bind(this, region),
        );
        render.addActiveRoute($activeRoute, region);

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

    public async getClosestRegion(pos: LatLng): Promise<RegionDataResult> {
        const regions = await this.getRegions();
        if (regions.length === 0) {
            throw new Error("No regions loaded");
        }

        let closest = [regions[0], Infinity] as const;
        for (const region of regions) {
            const dist = defaultProjection.getDistBetweenLatLngs(pos, region.location);
            if (dist < closest[1]) {
                closest = [region, dist];
            }
        }
        return closest[0];
    }
}

export default State;

export const state = State.getInstance();
