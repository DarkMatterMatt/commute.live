import type { PromiseOr, RegionCode } from "@commutelive/common";
import type { HttpResponse } from "uWebSockets.js";
import { md5 } from "~/helpers/";
import type { DataSource, WebSocket } from "~/types";
import { type CreateRouteData, Route, type RouteExecuteOpts, RouteGen, type RouteInitializeOpts } from "../Route";

const DEFAULT_CACHE_MAX_AGE = 3600; // 1 hour

export type ValidParams<R extends readonly string[], O extends readonly string[]> =
    { [K in R[number]]: string } & Partial<{ [K in O[number]]: string }>;

export interface GetRouteExecutorOpts<
    R extends readonly string[],
    O extends readonly string[],
> extends RouteExecuteOpts {
    getRegion: (region: string) => DataSource | null;
    headers: Record<string, string>;
    params: ValidParams<R, O>;
    region: DataSource | null;
    res: HttpResponse;
}

export type GetRouteInitializeOpts = RouteInitializeOpts;

export interface GetRouteExecuteOpts {
    activeWebSockets: Set<WebSocket>;
    availableRegions: RegionCode[];
    getRegion: (region: string) => DataSource | null;
    regions: DataSource[];
}

export interface GetRouteOpts<R extends readonly string[], O extends readonly string[], T extends Record<string, any>> {
    cacheMaxAge: number;
    executor: (route: GetRoute<R, O, T>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    headers: Record<string, string>;
    name: string;
    optionalParams: O;
    params: Record<string, string>;
    requiredParams: R;
    requiresRegion: boolean;
    res: HttpResponse;
}

export class GetRoute<
    R extends readonly string[],
    O extends readonly string[],
    T extends Record<string, any>,
> extends Route {
    private aborted = false;
    private readonly executor: (route: GetRoute<R, O, T>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    private cacheMaxAge: number;
    private readonly headers: Record<string, string>;
    private readonly optionalParams: O;
    private readonly params: Record<string, string>;
    private readonly prettyJson: boolean;
    private readonly requiredParams: R;
    private readonly requiresRegion: boolean;
    private readonly res: HttpResponse;

    constructor(opts: GetRouteOpts<R, O, T>) {
        super(opts.name);

        const { pretty: prettyJson, ...params } = opts.params;

        this.executor = opts.executor;
        this.cacheMaxAge = opts.cacheMaxAge;
        this.headers = opts.headers;
        this.optionalParams = opts.optionalParams;
        this.params = params;
        this.prettyJson = !["undefined", "null", "0", "false"].includes(`${prettyJson}`);
        this.requiredParams = opts.requiredParams;
        this.requiresRegion = opts.requiresRegion;
        this.res = opts.res;

        if (this.requiresRegion && !this.requiredParams.includes("region")) {
            throw new Error("Region is required, but is missing from required parameters.");
        }

        this.res.onAborted(() => {
            this.aborted = true;
        });
    }

    public async execute(opts: GetRouteExecuteOpts): Promise<void> {
        const { activeWebSockets, getRegion, regions } = opts;

        const [params, errors] = this.validateParams(this.params, opts.availableRegions);
        if (errors != null) {
            return this.finish("error", { errors });
        }

        const regionName = this.params.region;
        const region = regionName == null ? null : getRegion(this.params.region);
        await this.executor(this, {
            activeWebSockets,
            getRegion,
            headers: this.headers,
            params,
            region,
            regions,
            res: this.res,
        });
    }

    private validateParams(params: Record<string, string>, availableRegions: string[]): [ValidParams<R, O>, null];
    private validateParams(params: Record<string, string>, availableRegions: string[]): [null, string[]];
    private validateParams(
        params: Record<string, string>, availableRegions: string[],
    ): [ValidParams<R, O> | null, null | string[]] {
        const errors = [];

        const keys = Object.keys(params);
        for (const key of this.requiredParams) {
            if (!keys.includes(key)) {
                errors.push(`Missing required parameter: ${key}.`);
            }
        }
        for (const key of keys) {
            if (!this.requiredParams.includes(key) && !this.optionalParams.includes(key)) {
                errors.push(`Unknown parameter: ${key}.`);
            }
        }

        // don't do parameter validation if there are missing/unknown parameters
        if (errors.length > 0) {
            return [null, errors];
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

    public setCacheMaxAge(secs: number): this {
        // not inside a request, set for all requests to this route
        this.cacheMaxAge = secs;
        return this;
    }

    public finish(status: "success", data: T): void;
    public finish(status: "error", data: Record<string, any>): void;
    public finish(status: "success" | "error", data: T | Record<string, any>): void {
        if (this.aborted) {
            return;
        }

        if (status === "error") {
            this.res.writeStatus("400 Bad Request");
        }

        const json = JSON.stringify({
            ...data,
            route: this.name,
            status,
        }, null, this.prettyJson ? 4 : 0);

        if (this.cacheMaxAge <= 0) {
            this.res.writeHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            this.res.writeHeader("Pragma", "no-cache");
            this.res.writeHeader("Expires", "0");
        }
        else {
            const tag = `W/"${md5(json)}"`;

            if (tag === this.headers["if-none-match"]) {
                this.res.writeStatus("304 Not Modified");
                this.res.end();
                return;
            }
            this.res.writeHeader("ETag", tag);

            const d = new Date();
            d.setSeconds(d.getSeconds() + this.cacheMaxAge);
            this.res.writeHeader("Cache-Control", `max-age=${this.cacheMaxAge}`);
            this.res.writeHeader("Expires", d.toUTCString());
        }

        this.res.writeHeader("Content-Type", "application/json");
        this.res.writeHeader("Access-Control-Allow-Origin", "*");
        this.res.end(json);
    }
}

export interface CreateGetRouteData extends CreateRouteData {
    headers: Record<string, string>;
    params: Record<string, string>;
    res: HttpResponse;
}

export interface GetRouteGeneratorOpts<
    R extends readonly string[],
    O extends readonly string[],
    T extends Record<string, any>,
> {
    name: string;
    executor: (route: GetRoute<R, O, T>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    initialize?: (data: GetRouteInitializeOpts) => PromiseOr<void>;
    cacheMaxAge?: number;
    optionalParams: O;
    requiredParams: R;
    requiresRegion?: boolean;
}

export class GetRouteGenerator<
    R extends readonly string[],
    O extends readonly string[],
    T extends Record<string, any>,
> extends RouteGen {
    private readonly cacheMaxAge: number;
    private readonly executor: (route: GetRoute<R, O, T>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    private readonly initialize_?: (data: GetRouteInitializeOpts) => PromiseOr<void>;
    private readonly optionalParams: O;
    private readonly requiredParams: R;
    private readonly requiresRegion: boolean;

    constructor(opts: GetRouteGeneratorOpts<R, O, T>) {
        super(opts.name);
        this.cacheMaxAge = opts.cacheMaxAge ?? DEFAULT_CACHE_MAX_AGE;
        this.executor = opts.executor;
        this.initialize_ = opts.initialize;
        this.optionalParams = opts.optionalParams;
        this.requiredParams = opts.requiredParams;
        this.requiresRegion = opts.requiresRegion ?? false;
    }

    public createRoute({ headers, params, res }: CreateGetRouteData): GetRoute<R, O, T> {
        return new GetRoute({
            cacheMaxAge: this.cacheMaxAge,
            executor: this.executor,
            headers,
            name: this.name,
            optionalParams: this.optionalParams,
            params,
            requiredParams: this.requiredParams,
            requiresRegion: this.requiresRegion,
            res,
        });
    }

    public async initialize(opts: GetRouteInitializeOpts): Promise<void> {
        await this.initialize_?.(opts);
    }
}
