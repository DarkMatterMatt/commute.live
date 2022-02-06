import { WebSocket } from "uWebSockets.js";
import type { DataSource, PromiseOr } from "~/types";
import { Route, RouteGen, RouteExecuteOpts, CreateRouteData } from "../Route.js";

export type ValidParams<R extends readonly string[], O extends readonly string[]> =
    { [K in R[number]]: string } & Partial<{ [K in O[number]]: string }>;

export interface WebSocketRouteExecuteOpts<
    R extends readonly string[],
    O extends readonly string[],
> extends RouteExecuteOpts {
    getRegion: (region: string) => DataSource | null;
    params: ValidParams<R, O>;
    ws: WebSocket;
}

export interface WebSocketRouteOpts<R extends readonly string[], O extends readonly string[]> {
    executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecuteOpts<R, O>) => PromiseOr<void>;
    name: string;
    optionalParams: O;
    requiredParams: R;
    seq: number; // sequence number for WebSocket
    ws: WebSocket;
}

export class WebSocketRoute<R extends readonly string[], O extends readonly string[]> extends Route {
    private readonly executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecuteOpts<R, O>) => PromiseOr<void>;
    private readonly optionalParams: O;
    private readonly requiredParams: R;
    private readonly ws: WebSocket;
    private readonly seq: number;

    constructor (opts: WebSocketRouteOpts<R, O>) {
        super(opts.name);
        this.executor = opts.executor;
        this.optionalParams = opts.optionalParams;
        this.requiredParams = opts.requiredParams;
        this.seq = opts.seq;
        this.ws = opts.ws;
    }

    public async execute(
        data: Omit<WebSocketRouteExecuteOpts<R, O>, "params" | "ws"> & { params: Record<string, unknown> },
    ): Promise<void> {
        const [params, errors] = this.validateParams(data.params);
        if (errors.length > 0) {
            return this.finish("error", { errors });
        }
        await this.executor(this, { ...data, params, ws: this.ws });
    }

    private validateParams(params: Record<string, unknown>): [ValidParams<R, O>, readonly string[]] {
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

        return [params as ValidParams<R, O>, errors];
    }

    public finish(status: "success" | "error", data: Record<string, any>): void {
        const json = JSON.stringify({
            ...data,
            route: this.name,
            seq: this.seq,
            status,
        });
        this.ws.send(json);
    }
}

export interface CreateWebSocketRouteData extends CreateRouteData {
    seq: number; // sequence number for WebSocket
    ws: WebSocket;
}

export interface WebSocketRouteGeneratorOpts<R extends readonly string[], O extends readonly string[]> {
    name: string;
    executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecuteOpts<R, O>) => PromiseOr<void>;
    optionalParams: O;
    requiredParams: R;
}

export class WebSocketRouteGenerator<R extends readonly string[], O extends readonly string[]> extends RouteGen {
    private readonly executor: (route: WebSocketRoute<R, O>, data: WebSocketRouteExecuteOpts<R, O>) => PromiseOr<void>;
    private readonly optionalParams: O;
    private readonly requiredParams: R;

    constructor (opts: WebSocketRouteGeneratorOpts<R, O>) {
        super(opts.name);
        this.executor = opts.executor;
        this.optionalParams = opts.optionalParams;
        this.requiredParams = opts.requiredParams;
    }

    public createRoute({ seq, ws }: CreateWebSocketRouteData): WebSocketRoute<R, O> {
        return new WebSocketRoute({
            executor: this.executor,
            name: this.name,
            optionalParams: this.optionalParams,
            requiredParams: this.requiredParams,
            seq,
            ws,
        });
    }
}
