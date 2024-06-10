import type { PromiseOr, RegionCode } from "@commutelive/common";
import type { DataSource, WebSocket } from "~/types";
import { type CreateRouteData, Route, type RouteExecuteOpts, RouteGen, type RouteInitializeOpts } from "../Route";

export type ValidParams<R extends readonly string[], O extends readonly string[]> =
    { [K in R[number]]: string } & Partial<{ [K in O[number]]: string }>;

export interface WebSocketRouteExecutorOpts<
    R extends readonly string[],
    O extends readonly string[],
> extends RouteExecuteOpts {
    params: ValidParams<R, O>;
    region: DataSource | null;
    ws: WebSocket;
}

export interface WebSocketRouteExecuteOpts {
    activeWebSockets: Set<WebSocket>;
    availableRegions: RegionCode[];
    getRegion: (region: string) => DataSource | null;
    regions: DataSource[];
}

export type WebSocketRouteInitializeOpts = RouteInitializeOpts;

export interface WebSocketRouteOpts<R extends readonly string[], O extends readonly string[]> {
    executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecutorOpts<R, O>) => PromiseOr<void>;
    name: string;
    optionalParams: O;
    params: Record<string, unknown>;
    requiredParams: R;
    requiresRegion: boolean;
    seq: number; // sequence number for WebSocket
    ws: WebSocket;
}

export class WebSocketRoute<R extends readonly string[], O extends readonly string[]> extends Route {
    private readonly executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecutorOpts<R, O>) => PromiseOr<void>;
    private readonly optionalParams: O;
    private readonly params: Record<string, unknown>;
    private readonly prettyJson: boolean;
    private readonly requiredParams: R;
    private readonly requiresRegion: boolean;
    private readonly seq: number;
    private readonly ws: WebSocket;

    constructor (opts: WebSocketRouteOpts<R, O>) {
        super(opts.name);

        const { pretty: prettyJson, ...params } = opts.params;

        this.executor = opts.executor;
        this.optionalParams = opts.optionalParams;
        this.params = params;
        this.prettyJson = !["undefined", "null", "0", "false"].includes(`${prettyJson}`);
        this.requiredParams = opts.requiredParams;
        this.requiresRegion = opts.requiresRegion;
        this.seq = opts.seq;
        this.ws = opts.ws;
    }

    public async execute(opts: WebSocketRouteExecuteOpts): Promise<void> {
        const { activeWebSockets, regions } = opts;

        const [params, errors] = this.validateParams(this.params, opts.availableRegions);
        if (errors != null) {
            return this.finish("error", { errors });
        }

        const regionName = this.params.region as string | undefined;
        const region = regionName == null ? null : opts.getRegion(regionName);
        await this.executor(this, { activeWebSockets, params, ws: this.ws, region, regions });
    }

    private validateParams(params: Record<string, unknown>, availableRegions: string[]): [ValidParams<R, O>, null];
    private validateParams(params: Record<string, unknown>, availableRegions: string[]): [null, string[]];
    private validateParams(
        params: Record<string, unknown>, availableRegions: string[],
    ): [null | ValidParams<R, O>, null | string[]] {
        const errors = [];

        const keys = Object.keys(params);
        for (const key of this.requiredParams) {
            if (!keys.includes(key)) {
                errors.push(`Missing required field: ${key}.`);
            }
        }
        for (const key of keys) {
            if (!this.requiredParams.includes(key) && !this.optionalParams.includes(key)) {
                errors.push(`Unknown field: ${key}.`);
            }
            else if (typeof params[key] !== "string") {
                errors.push(`All parameters must be strings: ${key}.`);
            }
        }

        if (this.requiresRegion) {
            const { region } = params;
            if (typeof region !== "string" || !availableRegions.includes(region.toLowerCase())) {
                errors.push(`Unknown region: ${region}.`);
            }
        }

        if (errors.length > 0) {
            return [null, errors];
        }
        return [params as ValidParams<R, O>, null];
    }

    public finish(status: "success" | "error", data: Record<string, any>): void {
        const json = JSON.stringify({
            ...data,
            route: this.name,
            seq: this.seq,
            status,
        }, null, this.prettyJson ? 4 : 0);
        this.ws.send(json);
    }
}

export interface CreateWebSocketRouteData extends CreateRouteData {
    params: Record<string, unknown>;
    seq: number; // sequence number for WebSocket
    ws: WebSocket;
}

export interface WebSocketRouteGeneratorOpts<R extends readonly string[], O extends readonly string[]> {
    name: string;
    executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecutorOpts<R, O>) => PromiseOr<void>;
    initialize?: (data: WebSocketRouteInitializeOpts) => PromiseOr<void>;
    optionalParams: O;
    requiredParams: R;
    requiresRegion?: boolean;
}

export class WebSocketRouteGenerator<R extends readonly string[], O extends readonly string[]> extends RouteGen {
    private readonly executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecutorOpts<R, O>) => PromiseOr<void>;
    private readonly initialize_?: (data: WebSocketRouteInitializeOpts) => PromiseOr<void>;
    private readonly optionalParams: O;
    private readonly requiredParams: R;
    private readonly requiresRegion: boolean;

    constructor (opts: WebSocketRouteGeneratorOpts<R, O>) {
        super(opts.name);
        this.executor = opts.executor;
        this.optionalParams = opts.optionalParams;
        this.requiredParams = opts.requiredParams;
        this.requiresRegion = opts.requiresRegion ?? false;
    }

    public createRoute({ params, seq, ws }: CreateWebSocketRouteData): WebSocketRoute<R, O> {
        return new WebSocketRoute({
            executor: this.executor,
            name: this.name,
            optionalParams: this.optionalParams,
            params,
            requiredParams: this.requiredParams,
            requiresRegion: this.requiresRegion,
            seq,
            ws,
        });
    }

    public async initialize(opts: WebSocketRouteInitializeOpts): Promise<void> {
        await this.initialize_?.(opts);
    }
}
