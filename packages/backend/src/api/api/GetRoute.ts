import { URLSearchParams } from "node:url";
import { HttpResponse } from "uWebSockets.js";
import { md5 } from "~/helpers/";
import type { DataSource, PromiseOr } from "~/types";
import { Route, RouteGen, RouteExecuteOpts, CreateRouteData } from "../Route.js";

const DEFAULT_CACHE_MAX_AGE = 3600; // 1 hour

export type ValidParams<R extends readonly string[], O extends readonly string[]> =
    { [K in R[number]]: string } & Partial<{ [K in O[number]]: string }>;

interface GetRouteExecuteOpts<R extends readonly string[], O extends readonly string[]> extends RouteExecuteOpts {
    getRegion: (region: string) => DataSource | null;
    params: ValidParams<R, O>;
}

export interface GetRouteOpts<R extends readonly string[], O extends readonly string[]> {
    cacheMaxAge: number;
    executor: ((route: GetRoute<R, O>, data: GetRouteExecuteOpts<R, O>) => PromiseOr<void>);
    headers: Record<string, string>;
    name: string;
    optionalParams: O;
    requiredParams: R;
    res: HttpResponse;
}

export class GetRoute<R extends readonly string[], O extends readonly string[]> extends Route {
    private aborted = false;
    private readonly executor: ((route: GetRoute<R, O>, data: GetRouteExecuteOpts<R, O>) => PromiseOr<void>);
    private cacheMaxAge: number;
    private readonly headers: Record<string, string>;
    private readonly optionalParams: O;
    private readonly requiredParams: R;
    private readonly res: HttpResponse;

    constructor (opts: GetRouteOpts<R, O>) {
        super(opts.name);
        this.executor = opts.executor;
        this.cacheMaxAge = opts.cacheMaxAge;
        this.headers = opts.headers;
        this.optionalParams = opts.optionalParams;
        this.requiredParams = opts.requiredParams;
        this.res = opts.res;

        this.res.onAborted(() => {
            this.aborted = true;
        });
    }

    public async execute(data: Omit<GetRouteExecuteOpts<R, O>, "params"> & { params: URLSearchParams }): Promise<void> {
        const [params, errors] = this.validateParams(data.params);
        if (errors.length > 0) {
            return this.finish("error", { errors });
        }
        await this.executor(this, { ...data, params });
    }

    private validateParams(params: URLSearchParams): [ValidParams<R, O>, readonly string[]] {
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

        return [Object.fromEntries(params.entries()) as any, errors];
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
            status,
            route: this.name,
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
    headers: Record<string, string>,
    res: HttpResponse,
}

export interface GetRouteGeneratorOpts<R extends readonly string[], O extends readonly string[]> {
    name: string;
    executor: ((route: GetRoute<R, O>, data: GetRouteExecuteOpts<R, O>) => PromiseOr<void>);
    cacheMaxAge?: number;
    optionalParams: O;
    requiredParams: R;
}

export class GetRouteGenerator<R extends readonly string[], O extends readonly string[]> extends RouteGen {
    private readonly cacheMaxAge: number;
    private readonly executor: ((route: GetRoute<R, O>, data: GetRouteExecuteOpts<R, O>) => PromiseOr<void>);
    private readonly optionalParams: O;
    private readonly requiredParams: R;

    constructor (opts: GetRouteGeneratorOpts<R, O>) {
        super(opts.name);
        this.cacheMaxAge = opts.cacheMaxAge ?? DEFAULT_CACHE_MAX_AGE;
        this.executor = opts.executor;
        this.optionalParams = opts.optionalParams;
        this.requiredParams = opts.requiredParams;
    }

    public createRoute({ headers, res }: CreateGetRouteData): GetRoute<R, O> {
        return new GetRoute({
            cacheMaxAge: this.cacheMaxAge,
            executor: this.executor,
            headers,
            name: this.name,
            optionalParams: this.optionalParams,
            requiredParams: this.requiredParams,
            res,
        });
    }
}
