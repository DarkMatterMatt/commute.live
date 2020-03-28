const API_URL = "https://mattm.win/atlive/api/v1/";
const WS_URL = "ws://mattm.win/atlive/api/v1/websocket";

// eslint-disable-next-line max-len
type QueryRouteInfo = "shortName" | "longName" | "longNames" | "routeIds" | "shapeIds" | "vehicles" | "type" | "agencyId" | "polylines";


class Api {
    ws: WebSocket;

    apiUrl: string;

    wsUrl: string;

    _onMessage: (data: Record<string, any>) => void;

    constructor() {
        this.ws = null;
        this.apiUrl = API_URL;
        this.wsUrl = WS_URL;
        this._onMessage = null;
    }

    async query(path: string, params: Record<string, string>): Promise<Record<string, any>> {
        const queryStr = `?${new URLSearchParams(params)}`;
        const response: Record<string, any> = await fetch(this.apiUrl + path + queryStr).then(r => r.json());
        if (response.status !== "success") {
            throw new Error(`Failed querying API: ${path}${queryStr}`);
        }
        return response;
    }

    async queryRoutes(shortNames?: string[], fetch?: QueryRouteInfo[]): Promise<Record<string, any>> {
        const query: Record<string, string> = {};
        if (shortNames) query.shortNames = shortNames.join(",");
        if (fetch) query.fetch = fetch.join(",");
        return this.query("routes", query);
    }

    async queryRoute(shortName: string, fetch?: QueryRouteInfo[]): Promise<Record<string, any>> {
        const query: Record<string, string> = { shortNames: shortName };
        if (fetch) query.fetch = fetch.join(",");
        const response = await this.query("routes", query);
        return response.routes[shortName];
    }

    wsConnect(): Promise<void> {
        this.ws = new WebSocket(this.wsUrl);
        let wsHeartbeatInterval: number;

        let resolve: (value?: void | PromiseLike<void>) => void;
        const promise = new Promise<void>(resolve_ => {
            resolve = resolve_;
        });

        this.ws.addEventListener("open", () => {
            resolve();

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

        return promise;
    }

    subscribe(shortName: string): void {
        this.ws.send(JSON.stringify({
            route: "subscribe",
            shortName,
        }));
    }

    unsubscribe(shortName: string): void {
        this.ws.send(JSON.stringify({
            route: "unsubscribe",
            shortName,
        }));
    }

    onMessage(listener: (data: Record<string, any>) => void): void {
        this._onMessage = listener;
    }
}

export default new Api();
