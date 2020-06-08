import { LiveVehicle, TransitType } from "./types";

// eslint-disable-next-line max-len
type QueryRouteInfo = "shortName" | "longName" | "longNames" | "routeIds" | "shapeIds" | "vehicles" | "type" | "agencyId" | "polylines";

interface RoutesResult {
    shortName?: string;
    longName?: string;
    longNames?: string[];
    routeIds?: string[];
    shapeIds?: string[];
    vehicles?: Record<string, LiveVehicle>;
    type?: TransitType;
    agencyId?: string;
    polylines?: google.maps.LatLngLiteral[][];
}

let instance: Api = null;

class Api {
    ws: WebSocket = null;

    apiUrl = process.env.API_URL;

    wsUrl = process.env.WS_URL;

    webSocketConnectedPreviously = false;

    _onWebSocketReconnect: (ws: WebSocket, ev: Event) => void = null;

    _onMessage: (data: Record<string, any>) => void = null;

    promiseWsConnect: Promise<void>;

    resolveWhenWsConnect: (value?: void | PromiseLike<void>) => void;

    subscriptions: string[] = [];

    private constructor() {
        this.promiseWsConnect = new Promise<void>(resolve => {
            this.resolveWhenWsConnect = resolve;
        });
    }

    static getInstance(): Api {
        if (instance == null) {
            instance = new Api();
        }
        return instance;
    }

    async query(path: string, params: Record<string, string>): Promise<Record<string, any>> {
        const queryStr = `?${new URLSearchParams(params)}`;
        const response: Record<string, any> = await fetch(this.apiUrl + path + queryStr).then(r => r.json());
        if (response.status !== "success") {
            throw new Error(`Failed querying API: ${path}${queryStr}`);
        }
        return response;
    }

    async queryRoutes(shortNames?: string[], fetch?: QueryRouteInfo[]): Promise<Record<string, RoutesResult>> {
        const query: Record<string, string> = {};
        if (shortNames) query.shortNames = shortNames.join(",");
        if (fetch) query.fetch = fetch.join(",");
        const response = await this.query("routes", query);
        return response.routes;
    }

    async queryRoute(shortName: string, fetch?: QueryRouteInfo[]): Promise<RoutesResult> {
        const query: Record<string, string> = { shortNames: shortName };
        if (fetch) query.fetch = fetch.join(",");
        const response = await this.query("routes", query);
        return response.routes[shortName] as RoutesResult;
    }

    wsConnect(): Promise<void> {
        this.ws = new WebSocket(this.wsUrl);
        let wsHeartbeatInterval: NodeJS.Timeout;

        this.ws.addEventListener("open", ev => {
            this.resolveWhenWsConnect();

            this.subscriptions.forEach(shortName => {
                this.ws.send(JSON.stringify({
                    route: "subscribe",
                    shortName,
                }));
            });

            if (this.webSocketConnectedPreviously && this._onWebSocketReconnect !== null) {
                this._onWebSocketReconnect(this.ws, ev);
            }
            this.webSocketConnectedPreviously = true;

            // send a heartbeat every 5 seconds
            wsHeartbeatInterval = setInterval(() => {
                this.ws.send(JSON.stringify({ route: "ping" }));
            }, 5000);
        });

        this.ws.addEventListener("close", ev => {
            if (!ev.wasClean) {
                console.warn("WebSocket closed", ev);
            }
            clearInterval(wsHeartbeatInterval);
            setTimeout(() => this.wsConnect(), 500);
        });

        this.ws.addEventListener("message", ev => {
            const data = JSON.parse(ev.data);
            if (this._onMessage === null) return;
            if (!data.status || !data.route) return;
            this._onMessage(data as Record<string, any>);
        });

        return this.promiseWsConnect;
    }

    subscribe(shortName: string): void {
        if (this.subscriptions.includes(shortName)) {
            return;
        }

        this.subscriptions.push(shortName);
        if (this.ws != null && this.ws.readyState === this.ws.OPEN) {
            this.ws.send(JSON.stringify({
                route: "subscribe",
                shortName,
            }));
        }
    }

    unsubscribe(shortName: string): void {
        if (!this.subscriptions.includes(shortName)) {
            return;
        }

        this.subscriptions = this.subscriptions.filter(n => n !== shortName);
        if (this.ws != null && this.ws.readyState === this.ws.OPEN) {
            this.ws.send(JSON.stringify({
                route: "unsubscribe",
                shortName,
            }));
        }
    }

    onWebSocketReconnect(listener: (ws: WebSocket, ev: Event) => void): void {
        this._onWebSocketReconnect = listener;
    }

    onMessage(listener: (data: Record<string, any>) => void): void {
        this._onMessage = listener;
    }
}

export default Api;

export const api = Api.getInstance();
