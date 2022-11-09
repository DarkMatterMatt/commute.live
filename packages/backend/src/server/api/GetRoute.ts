import { URLSearchParams } from "node:url";
import { HttpResponse, WebSocket } from "uWebSockets.js";
import { md5 } from "~/helpers/";
import type { DataSource, PromiseOr, RegionCode } from "~/types";
import { Route, RouteGen, RouteExecuteOpts, CreateRouteData } from "../Route.js";

const DEFAULT_CACHE_MAX_AGE = 3600; // 1 hour

export type ValidParams<R extends readonly string[], O extends readonly string[]> =
    { [K in R[number]]: string } & Partial<{ [K in O[number]]: string }>;

export interface GetRouteExecutorOpts<
    R extends readonly string[],
    O extends readonly string[],
> extends RouteExecuteOpts {
    params: ValidParams<R, O>;
    region: DataSource | null;
}

export interface GetRouteExecuteOpts {
    activeWebSockets: Set<WebSocket>;
    availableRegions: RegionCode[];
    getRegion: (region: string) => DataSource | null;
    params: URLSearchParams;
}

export interface GetRouteOpts<R extends readonly string[], O extends readonly string[]> {
    cacheMaxAge: number;
    executor: (route: GetRoute<R, O>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    headers: Record<string, string>;
    name: string;
    optionalParams: O;
    requiredParams: R;
    requiresRegion: boolean;
    res: HttpResponse;
}

export class GetRoute<R extends readonly string[], O extends readonly string[]> extends Route {
    private aborted = false;
    private readonly executor: (route: GetRoute<R, O>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    private cacheMaxAge: number;
    private readonly headers: Record<string, string>;
    private readonly optionalParams: O;
    private readonly requiredParams: R;
    private readonly requiresRegion: boolean;
    private readonly res: HttpResponse;

    constructor (opts: GetRouteOpts<R, O>) {
        super(opts.name);
        this.executor = opts.executor;
        this.cacheMaxAge = opts.cacheMaxAge;
        this.headers = opts.headers;
        this.optionalParams = opts.optionalParams;
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
        const { activeWebSockets } = opts;
        const [params, errors] = this.validateParams(opts.params, opts.availableRegions);
        if (errors != null) {
            return this.finish("error", { errors });
        }

        const regionName = opts.params.get("region");
        const region = regionName == null ? null : opts.getRegion(regionName);
        await this.executor(this, { activeWebSockets, params, region });
    }

    private validateParams(params: URLSearchParams, availableRegions: string[]): [ValidParams<R, O>, null];
    private validateParams(params: URLSearchParams, availableRegions: string[]): [null, string[]];
    private validateParams(
        params: URLSearchParams, availableRegions: string[],
    ): [ValidParams<R, O> | null, null | string[]] {
        const errors = [];

        for (const key of this.requiredParams) {
            if (params.get(key) === null) {
                errors.push(`Missing required parameter: ${key}.`);
            }
        }
        for (const key of params.keys()) {
            if (!this.requiredParams.includes(key) && !this.optionalParams.includes(key)) {
                errors.push(`Unknown parameter: ${key}.`);
            }
        }

        // don't do parameter validation if there are missing/unknown parameters
        if (errors.length > 0) {
            return [null, errors];
        }

        if (this.requiresRegion) {
            const region = params.get("region")?.toLowerCase();
            if (region == null || !availableRegions.includes(region)) {
                errors.push(`Unknown region: ${region}.`);
            }
        }

        if (errors.length > 0) {
            return [null, errors];
        }
        return [Object.fromEntries(params.entries()) as ValidParams<R, O>, null];
    }

    public setCacheMaxAge(secs: number): this {
        // not inside a request, set for all requests to this route
        this.cacheMaxAge = secs;
        return this;
    }

    public finish(status: "success" | "error", data: Record<string, any>): void {
        if (this.aborted) {
            return;
        }

        const json = JSON.stringify({
            ...data,
            route: this.name,
            status,
        });

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
    res: HttpResponse;
}

export interface GetRouteGeneratorOpts<R extends readonly string[], O extends readonly string[]> {
    name: string;
    executor: (route: GetRoute<R, O>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    cacheMaxAge?: number;
    optionalParams: O;
    requiredParams: R;
    requiresRegion?: boolean;
}

export class GetRouteGenerator<R extends readonly string[], O extends readonly string[]> extends RouteGen {
    private readonly cacheMaxAge: number;
    private readonly executor: (route: GetRoute<R, O>, data: GetRouteExecutorOpts<R, O>) => PromiseOr<void>;
    private readonly optionalParams: O;
    private readonly requiredParams: R;
    private readonly requiresRegion: boolean;

    constructor (opts: GetRouteGeneratorOpts<R, O>) {
        super(opts.name);
        this.cacheMaxAge = opts.cacheMaxAge ?? DEFAULT_CACHE_MAX_AGE;
        this.executor = opts.executor;
        this.optionalParams = opts.optionalParams;
        this.requiredParams = opts.requiredParams;
        this.requiresRegion = opts.requiresRegion ?? false;
    }

    public createRoute({ headers, res }: CreateGetRouteData): GetRoute<R, O> {
        return new GetRoute({
            cacheMaxAge: this.cacheMaxAge,
            executor: this.executor,
            headers,
            name: this.name,
            optionalParams: this.optionalParams,
            requiredParams: this.requiredParams,
            requiresRegion: this.requiresRegion,
            res,
        });
    }
}
