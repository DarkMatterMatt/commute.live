import { WebSocket } from "uWebSockets.js";

export interface RouteExecuteOpts {
    activeWebSockets: Set<WebSocket>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateRouteData {
    //
}

export abstract class Route {
    constructor(public readonly name: string) {
        //
    }

    public abstract execute(opts: RouteExecuteOpts): Promise<void>;
}

export abstract class RouteGen {
    constructor(public readonly name: string) {
        //
    }

    public abstract createRoute(data: CreateRouteData): Route;
}
