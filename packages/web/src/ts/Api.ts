import { createPromise, type Id, type IpLocationResult, type LatLng, type ListRoutesResult, memo, type PartialRouteDataResult, type PartialRoutesDataResult, type RegionCode, type RegionDataResult, type RegionsDataResult, type RouteDataResult, type TimerId } from "@commutelive/common";

let instance: Api | null = null;

const fetchJson = (...args: Parameters<typeof fetch>) => fetch(...args).then(r => r.json());

const fetchJsonMemo = memo(fetchJson);

class Api {
    private ws: WebSocket | null = null;

    private apiUrl: string;

    private wsUrl: string;

    private wsSeq = 0;

    private wsResponseHandlers = new Map<number, (...args: any[]) => void>();

    private webSocketConnectedPreviously = false;

    private _onWebSocketReconnect: ((ws: WebSocket, ev: Event) => void) | null = null;

    private _onMessage: ((data: Record<string, any>) => void) | null = null;

    private promiseWsConnect: Promise<void>;

    private resolveWhenWsConnect: ((value?: void | Promise<void>) => void);

    private subscriptions: Id[] = [];

    private constructor() {
        if (!process.env.API_URL || !process.env.WS_URL) {
            throw new Error("API_URL and WS_URL must be set");
        }

        this.apiUrl = process.env.API_URL;
        this.wsUrl = process.env.WS_URL;

        const [promiseWsConnect, resolveWhenWsConnect] = createPromise<void>();
        this.promiseWsConnect = promiseWsConnect;
        this.resolveWhenWsConnect = resolveWhenWsConnect;
    }

    public static getInstance(): Api {
        if (instance == null) {
            instance = new Api();
        }
        return instance;
    }

    private async query<T>(path: string, params?: Record<string, string>, cache = true): Promise<T> {
        const queryStr = params == null ? "" : `?${new URLSearchParams(params)}`;
        const response = await (cache ? fetchJsonMemo : fetchJson)(this.apiUrl + path + queryStr);
        if (response.status !== "success") {
            throw new Error(`Failed querying API: ${path}${queryStr}`);
        }
        return response;
    }

    /**
     * Test if there is a working connection to the API.
     */
    public async isOnline(): Promise<boolean> {
        try {
            const result = await fetch(`${this.apiUrl}generate204`);
            if (result.status === 204) {
                return true;
            }
            throw new Error(`Unexpected status code: ${result.status} ${result.statusText}`);
        }
        catch (err) {
            console.warn("Failed querying API", err);
            return false;
        }
    }

    /**
     * Returns the closest region to the current IP address. Used when first visiting commute.live
     */
    public async queryIpLocation(): Promise<null | LatLng> {
        try {
            const response = await this.query<{ result: IpLocationResult }>("iplocation");
            return response.result.userLocation;
        }
        catch (err) {
            if (err instanceof Error && err.message.includes("Failed querying API")) {
                // this is raised when the IP address cannot be resolved,
                // e.g. due to a private IP during development
                console.warn("Failed guessing region by IP address");
                return null;
            }
            throw err;
        }
    }

    public async queryRegion(regionCode: RegionCode): Promise<RegionDataResult> {
        const regions = await this.queryRegions();
        const region = regions.find(r => r.code === regionCode);
        if (region == null) {
            throw new Error(`Region not found: ${regionCode}`);
        }
        return region;
    }

    public async queryRegions(regionCodes?: RegionCode[]): Promise<RegionsDataResult> {
        const response = await this.query<{
            regions: RegionsDataResult;
        }>("regions", {
            fields: "", // all fields
            regions: "", // all regions
        });

        if (regionCodes == null) {
            return response.regions;
        }

        const result = response.regions.filter(r => regionCodes.includes(r.code));
        if (result.length === regionCodes.length) {
            return result;
        }

        // try to fetch the missing regions (usually hidden regions, or might be old region codes)
        const missingRegions = regionCodes.filter(c => !result.some(r => r.code === c));
        const newResponse = await this.query<{
            regions: RegionsDataResult;
            unknown: RegionCode[];
        }>("regions", {
            fields: "", // all fields
            regions: missingRegions.join(","),
        });

        if (newResponse.unknown.length > 0) {
            console.warn("Some regions were not found", newResponse.unknown);
        }

        return [...result, ...newResponse.regions];
    }

    public async listRoutes(region: RegionCode): Promise<ListRoutesResult> {
        const response = await this.query<{ routes: ListRoutesResult }>("list", { region });
        return response.routes;
    }

    public async queryRoute<T extends keyof RouteDataResult>(
        id: Id,
        fields: T[],
    ): Promise<PartialRouteDataResult<T>> {
        const query: Record<string, string> = {
            fields: fields.join(","),
            routeIds: id,
        };
        const shouldCache = !fields.includes("vehicles" as T);
        const response = await this.query<{ routes: PartialRoutesDataResult<T> }>("routes", query, shouldCache);
        if (response.routes.length === 0) {
            throw new Error(`Route not found: ${id}`);
        }
        return response.routes[0];
    }

    public async queryRoutes<T extends keyof RouteDataResult>(
        ids: Id[],
        fields: T[],
    ): Promise<PartialRoutesDataResult<T>> {
        const shouldCache = !fields.includes("vehicles" as T);
        const response = await this.query<{
            routes: PartialRoutesDataResult<T>;
            unknown?: Id[];
        }>("routes", {
            fields: fields.join(","),
            routeIds: ids.join(","),
        }, shouldCache);
        if (response.unknown?.length) {
            console.warn("Some routes were not found", response.unknown);
        }
        return response.routes;
    }

    private wsSend<T = void>(data: Record<string, any>): Promise<undefined | T> {
        if (this.ws == null || this.ws.readyState !== this.ws.OPEN) {
            throw new Error("WebSocket is not connected");
        }
        const seq = this.wsSeq++;
        this.ws.send(JSON.stringify({ ...data, seq }));
        return new Promise<T>(resolve => {
            this.wsResponseHandlers.set(seq, resolve);
        });
    }

    public wsConnect(): Promise<void> {
        const ws = this.ws = new WebSocket(this.wsUrl);
        let wsHeartbeatInterval: TimerId;

        ws.addEventListener("open", ev => {
            this.resolveWhenWsConnect();

            this.subscriptions.forEach(id => {
                this.wsSend({ route: "subscribe", id });
            });

            if (this.webSocketConnectedPreviously && this._onWebSocketReconnect !== null) {
                this._onWebSocketReconnect(ws, ev);
            }
            this.webSocketConnectedPreviously = true;

            // send a heartbeat every 5 seconds
            wsHeartbeatInterval = setInterval(() => {
                this.wsSend({ route: "ping" });
            }, 5000);
        });

        ws.addEventListener("close", ev => {
            if (!ev.wasClean) {
                console.warn("WebSocket closed", ev);
            }
            clearInterval(wsHeartbeatInterval);
            setTimeout(() => this.wsConnect(), 500);
        });

        ws.addEventListener("message", ev => {
            const data = JSON.parse(ev.data);
            if (data.seq) {
                // resolve promise
                this.wsResponseHandlers.get(data.seq)?.();
                this.wsResponseHandlers.delete(data.seq);
            }
            if (this._onMessage === null) return;
            if (!data.status || !data.route) return;
            this._onMessage(data as Record<string, any>);
        });

        return this.promiseWsConnect;
    }

    public subscribe(id: Id): void {
        if (this.subscriptions.includes(id)) {
            return;
        }

        this.subscriptions.push(id);
        if (this.ws != null && this.ws.readyState === this.ws.OPEN) {
            this.wsSend({ route: "subscribe", id });
        }
    }

    public unsubscribe(id: Id): void {
        if (!this.subscriptions.includes(id)) {
            return;
        }

        this.subscriptions = this.subscriptions.filter(n => n !== id);
        if (this.ws != null && this.ws.readyState === this.ws.OPEN) {
            this.wsSend({ route: "unsubscribe", id });
        }
    }

    public onWebSocketReconnect(listener: (ws: WebSocket, ev: Event) => void): void {
        this._onWebSocketReconnect = listener;
    }

    public onMessage(listener: (data: Record<string, any>) => void): void {
        this._onMessage = listener;
    }
}

export default Api;

export const api = Api.getInstance();
