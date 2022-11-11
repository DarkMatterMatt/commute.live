// eslint-disable-next-line max-len
type QueryRouteInfo = "shortName" | "longNames" | "vehicles" | "type" | "polylines";

interface RoutesResult {
    shortName?: string;
    longNames?: [string | null, string | null];
    vehicles?: Record<string, LiveVehicle>;
    type?: TransitType;
    polylines?: [LatLng[], LatLng[]];
}

let instance: Api = null;

class Api {
    ws: WebSocket = null;

    apiUrl = process.env.API_URL;

    wsUrl = process.env.WS_URL;

    wsSeq = 0;

    wsResponseHandlers: [number, (...args: any[]) => void][] = [];

    webSocketConnectedPreviously = false;

    _onWebSocketReconnect: (ws: WebSocket, ev: Event) => void = null;

    _onMessage: (data: Record<string, any>) => void = null;

    promiseWsConnect: Promise<void>;

    resolveWhenWsConnect: (value?: void | Promise<void>) => void;

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

    private static convertToTransitType(type: number): TransitType {
        // convert numerical enum to TransitType
        // see `route_type` in https://developers.google.com/transit/gtfs/reference#routestxt
        switch (type) {
            case 2: return "rail";
            case 3: return "bus";
            case 4: return "ferry";
            default: throw new Error(`Unknown transit type: ${type}`);
        }
    }

    private async query<T>(path: string, params: Record<string, string>): Promise<T> {
        const queryStr = `?${new URLSearchParams({ region: "NZL_AKL", ...params })}`;
        const response = await fetch(this.apiUrl + path + queryStr).then(r => r.json());
        if (response.status !== "success") {
            throw new Error(`Failed querying API: ${path}${queryStr}`);
        }
        return response;
    }

    async queryRoutes(): Promise<Map<string, {
        longNames: [string | null, string | null];
        shapeIds: [string | null, string | null];
        shortName: string;
        longName: string;
        type: TransitType;
    }>> {
        type QueryRoutesResponse = Record<string, {
            longNames: [string | null, string | null];
            shapeIds: [string | null, string | null];
            shortName: string;
            type: number;
        }>;

        const response = await this.query<{ routes: QueryRoutesResponse }>("list", {});
        return new Map(Object.values(response.routes).map(r => {
            // convert numerical enum to TransitType
            // see `route_type` in https://developers.google.com/transit/gtfs/reference#routestxt
            const type = Api.convertToTransitType(r.type);

            // find best long name, take the first alphabetically if both are specified
            let longName = "";
            if (r.longNames[0] && r.longNames[1]) {
                longName = r.longNames[0].localeCompare(r.longNames[1]) < 0 ? r.longNames[0] : r.longNames[1];
            }
            else if (!!r.longNames[0] !== !!r.longNames[1]) {
                longName = r.longNames[0] || r.longNames[1];
            }

            return [r.shortName, { ...r, type, longName }];
        }));
    }

    async queryRoute(shortName: string, fields?: QueryRouteInfo[]): Promise<RoutesResult> {
        type QueryRouteResponse = Record<string, {
            longNames?: [string | null, string | null];
            polylines?: [LatLng[], LatLng[]];
            shortName?: string;
            type?: number;
            vehicles?: Record<string, LiveVehicle>;
        }>;

        const query: Record<string, string> = { shortNames: shortName };
        if (fields) query.fields = fields.join(",");
        const response = await this.query<{ routes: QueryRouteResponse }>("routes", query);

        const { type, ...data } = response.routes[shortName];
        const result: RoutesResult = data;
        if (type) result.type = Api.convertToTransitType(type);
        return result;
    }

    wsSend<T = void>(data: Record<string, any>): Promise<undefined | T> {
        if (this.ws == null || this.ws.readyState !== this.ws.OPEN) {
            throw new Error("WebSocket is not connected");
        }
        const seq = this.wsSeq++;
        this.ws.send(JSON.stringify({ ...data, seq }));
        return new Promise<T>(resolve => {
            this.wsResponseHandlers.push([seq, resolve]);
        });
    }

    wsConnect(): Promise<void> {
        this.ws = new WebSocket(this.wsUrl);
        let wsHeartbeatInterval: NodeJS.Timeout;

        this.ws.addEventListener("open", ev => {
            this.resolveWhenWsConnect();

            this.subscriptions.forEach(shortName => {
                this.wsSend({
                    route: "subscribe",
                    region: "NZL_AKL",
                    shortName,
                });
            });

            if (this.webSocketConnectedPreviously && this._onWebSocketReconnect !== null) {
                this._onWebSocketReconnect(this.ws, ev);
            }
            this.webSocketConnectedPreviously = true;

            // send a heartbeat every 5 seconds
            wsHeartbeatInterval = setInterval(() => {
                this.wsSend({ route: "ping" });
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
            if (data.seq) {
                this.wsResponseHandlers.find(([seq]) => seq === data.seq)?.[1](data);
                return;
            }
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
            this.wsSend({
                route: "subscribe",
                region: "NZL_AKL",
                shortName,
            });
        }
    }

    unsubscribe(shortName: string): void {
        if (!this.subscriptions.includes(shortName)) {
            return;
        }

        this.subscriptions = this.subscriptions.filter(n => n !== shortName);
        if (this.ws != null && this.ws.readyState === this.ws.OPEN) {
            this.wsSend({
                route: "unsubscribe",
                region: "NZL_AKL",
                shortName,
            });
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
