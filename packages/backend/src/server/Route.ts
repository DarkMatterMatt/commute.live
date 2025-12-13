import type { PromiseOr } from "@commutelive/common";
import type { DataSource, WebSocket } from "~/types";

export interface RouteExecuteOpts {
    activeWebSockets: Set<WebSocket>;
    regions: DataSource[];
}

export interface RouteInitializeOpts {
    cacheDir: string;
    regions: DataSource[];
}


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

    public abstract initialize(opts: RouteInitializeOpts): PromiseOr<void>;
}
