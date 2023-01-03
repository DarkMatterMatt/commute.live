import type { PromiseOr } from "@commutelive/common";
import type { WebSocket } from "uWebSockets.js";
import type { DataSource } from "~/types";

export interface RouteExecuteOpts {
    activeWebSockets: Set<WebSocket>;
    regions: DataSource[];
}

export interface RouteInitializeOpts {
    cacheDir: string;
    regions: DataSource[];
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

    public abstract initialize(opts: RouteInitializeOpts): PromiseOr<void>;
}
