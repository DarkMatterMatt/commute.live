import { defaultProjection, type Id, type LatLng, type LiveVehicle, type PartialRegionDataResult, type Path, type PathValue, type RegionDataResult } from "@commutelive/common";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { api } from "./Api";
import { isEmptyObject, localStorageEnabled } from "./Helpers";
import type HtmlMarkerView from "./HtmlMarkerView";
import Render, { render } from "./Render";
import Route from "./Route";
import { settings, type SettingsType } from "./Settings";
import type { SearchRoute } from "./types";

const STATE_VERSION = 4;

interface ParsedState {
    version: number;

    /** routes: array of [routeId, active, color] */
    routes: [routeId: Id, active: boolean, color: string][];

    /** map of <settingName, value> */
    settings: SettingsType;

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

    private persistentState: ParsedState | null = null;

    private constructor() {
        //
    }

    public static getInstance(): State {
        if (instance == null) {
            instance = new State();
        }
        return instance;
    }

    private static migrate(data: Record<string, any>): ParsedState | null {
        const version = data.version as number;

        if (version === STATE_VERSION) {
            return data as ParsedState;
        }

        // on first load, show route 25B and 70
        if (isEmptyObject(data)) {
            return null;
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
            version: STATE_VERSION,
            routes: data.routes,
            settings: data.settings,
            map: data.map,
        };
    }

    public setMap(map: google.maps.Map): State {
        this.map = map;
        this.routes.forEach(r => r.setMap(map));
        return this;
    }

    public setMarkerView(markerView: HtmlMarkerView): State {
        this.markerView = markerView;
        this.routes.forEach(r => r.setMarkerView(markerView));
        return this;
    }

    public setActiveRegionsElem($new: HTMLElement): State {
        render.setActiveRegionsElem($new);
        return this;
    }

    public setActiveRegionAttributionsElem($new: HTMLElement): State {
        render.setActiveRegionAttributionsElem($new);
        return this;
    }

    public save<K extends Path<ParsedState, false>>(key: K, val: undefined | PathValue<ParsedState, K>): void {
        if (this.persistentState == null) {
            throw new Error("State is not initialized");
        }

        // get path describing what part of the state to update
        const path = key.split(".");
        const last = path.pop();
        if (last == null) {
            throw new Error(`Invalid key: ${key}`);
        }

        // update state
        let cursor: any = this.persistentState;
        for (const part of path) {
            cursor = cursor[part];
        }
        if (val === undefined) {
            delete cursor[last];
        }
        else {
            cursor[last] = val;
        }

        // save to local storage
        if (localStorageEnabled()) {
            localStorage.setItem("state", JSON.stringify(this.persistentState));
            window.location.hash = "";
        }
        else {
            // only keep active routes
            const state: ParsedState = {
                ...this.persistentState,
                routes: this.persistentState.routes.filter(r => r[1] === true),
            };
            window.location.hash = compressToEncodedURIComponent(JSON.stringify(state));
        }
    }

    public async loadRoutes(): Promise<void> {
        if (this.persistentState == null) {
            throw new Error("State is not initialized");
        }

        const { routes } = this.persistentState;
        const animateMarkerPosition = settings.getVal("animateMarkerPosition");
        const showTransitRoutes = settings.getVal("showTransitRoutes");
        const snapToRoute = settings.getVal("snapToRoute");
        const markerType = settings.getVal("markerType");

        const { map, markerView } = this;
        if (map == null || markerView == null) {
            throw new Error("Map or markerView is not set");
        }

        const activeAndColorMap = new Map(routes.map(([id, active, color]) => [id, [active, color] as const]));
        const foundRoutes = await api.queryRoutes(
            routes.map(r => r[0]),
            ["region", "id", "shortName", "longNames", "type"],
        );
        const regions = await api.queryRegions(foundRoutes.map(r => r.region));
        const regionsMap = new Map(regions.map(r => [r.code, r]));

        await Promise.all(foundRoutes.map(async ({ region: regionCode, id, shortName, longNames, type }) => {
            const activeAndColor = activeAndColorMap.get(id);
            if (activeAndColor == null) {
                // this should never happen
                console.warn(`Route ${id} not found`);
                return;
            }

            const region = regionsMap.get(regionCode);
            if (region == null) {
                // this should never happen
                console.warn(`Region ${regionCode} not found`);
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
                snapToRoute,
            });
            this.routes.set(id, route);

            if (active) {
                const $activeRoute = Render.createActiveRoute(
                    { id, type, shortName, longName },
                    color,
                    false,
                    this.changeRouteColor.bind(this),
                    this.deactivateRoute.bind(this, region),
                );
                render.addActiveRoute($activeRoute, region);
                await route.activate();
            }
        }));
    }

    private async getFirstVisitState(): Promise<ParsedState> {
        // guesstimate where the user is based on their IP address
        const [userLocation, regions] = await Promise.all([
            api.queryIpLocation(),
            api.queryRegions(),
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

    public async load() {
        // trim leading # off location.hash
        const hash = window.location.hash.replace(/^#/, "");

        let data;
        if (hash) {
            data = decompressFromEncodedURIComponent(hash);
        }
        if (!data && localStorageEnabled()) {
            data = localStorage.getItem("state");
        }
        const parsedState = State.migrate(data ? JSON.parse(data) : {});
        this.bIsFirstVisit = parsedState == null;

        const state = parsedState == null ? await this.getFirstVisitState() : parsedState;
        this.persistentState = state;

        settings.import(state.settings);
        for (const [name, setting] of settings.getAll()) {
            setting.addChangeListener(val => this.save(`settings.${name}`, val), false);
        }

        return {
            map: {
                center: { lat: state.map[0], lng: state.map[1] },
                zoom: state.map[2],
            },
        };
    }

    public getNewColor(): string {
        return Render.getNewColor([...this.routes.values()].map(r => r.getColor()));
    }

    public getRoutesByShortName(): Map<string, Route> {
        return this.routes;
    }

    public isActive({ id }: SearchRoute): boolean {
        const route = this.routes.get(id);
        return route ? route.isActive() : false;
    }

    /** Is the user's first visit (i.e. user has never modified the default routes & settings). */
    public isFirstVisit(): boolean {
        return this.bIsFirstVisit;
    }

    public showVehicle(data: LiveVehicle): void {
        const route = this.routes.get(data.id);
        if (route === undefined) {
            console.log("Skipping vehicle update because the route does not exist", data);
            return;
        }
        route.showVehicle(data);
    }

    private saveRoutes(): void {
        this.save("routes", [...this.routes.values()].map(r => [r.id, r.isActive(), r.getColor()]));
    }

    private changeRouteColor(id: Id, color: string): void {
        const route = this.routes.get(id);
        if (route) {
            route.setColor(color);
        }
        this.saveRoutes();
    }

    private deactivateRoute(
        region: PartialRegionDataResult<"code">,
        id: Id, $activeRoute: HTMLDivElement,
    ): void {
        const route = this.routes.get(id);
        if (route !== undefined) {
            route.deactivate();
        }
        render.removeActiveRoute($activeRoute, region);
        this.saveRoutes();
    }

    public async activateRoute({ region: regionCode, id, shortName, longName, type }: SearchRoute): Promise<void> {
        const { map, markerView } = this;
        if (map == null || markerView == null) {
            throw new Error("Map or markerView is not set");
        }
        const region = await api.queryRegion(regionCode);

        let route = this.routes.get(id);
        let showPickr = false;
        if (route === undefined) {
            const animateMarkerPosition = settings.getVal("animateMarkerPosition");
            const showTransitRoutes = settings.getVal("showTransitRoutes");
            const snapToRoute = settings.getVal("snapToRoute");
            const markerType = settings.getVal("markerType");
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
                snapToRoute,
            });
            this.routes.set(id, route);
        }

        const $activeRoute = Render.createActiveRoute(
            { id, shortName, longName, type },
            route.getColor(),
            showPickr,
            this.changeRouteColor.bind(this),
            this.deactivateRoute.bind(this, region),
        );
        render.addActiveRoute($activeRoute, region);

        await route.activate();
        this.saveRoutes();
    }

    private async loadRouteVehicles(id: Id): Promise<void> {
        const route = this.routes.get(id);
        if (route === undefined) {
            console.error(`Could not reload vehicles for route: ${id}.`);
            return;
        }
        await route.loadVehicles();
    }

    public async loadActiveRoutesVehicles(): Promise<void> {
        await Promise.all([...this.routes.values()]
            .filter(r => r.isActive())
            .map(r => this.loadRouteVehicles(r.id)));
    }

    public getMapCenterAndZoom(): { center: LatLng; zoom: number } {
        if (this.map == null) {
            throw new Error("Map is not set");
        }

        const center = this.map.getCenter();
        return {
            center: { lat: center.lat(), lng: center.lng() },
            zoom: this.map.getZoom(),
        };
    }

    public async getClosestRegion(pos: LatLng): Promise<RegionDataResult> {
        const regions = await api.queryRegions();
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
