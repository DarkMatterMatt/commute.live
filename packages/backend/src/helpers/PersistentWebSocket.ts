import type { TimerId } from "~/types";
import { clearInterval, clearTimeout, setInterval, setTimeout } from "node:timers";
import WebSocket from "ws";
import { getLogger, Logger } from "~/log";

export const CLOSE_CODE_RESTART = 4002;
export const CLOSE_CODE_STOPPING = 4003;

export const RESTART_DELAY_AFTER_CLOSE = 500;
export const RESTART_DELAY_AFTER_STALL = 100;

export type SendOpts = Parameters<WebSocket["send"]>[1];
export type SendCb = Parameters<WebSocket["send"]>[2];

export interface PersistentWebSocketOpts {
    /**
     * Override the default logger.
     */
    logger?: Logger;

    /**
     * Callback function, can optionally return a non-negative number to restart after the specified
     * delay (in milliseconds).
     *
     * Return value is not used if `onError()` has specified a restart delay.
     */
    onClose?: (code: number, reason: string) => undefined | number;

    /**
     * Callback function, can optionally return a non-negative number to restart after the specified
     * delay (in milliseconds).
     *
     * `onClose()` will always be called after this.
     */
    onError?: (err: Error) => undefined | number;

    /**
     * Callback function executed when the WebSocket receives a message.
     */
    onMessage?: (data: string) => void;

    /**
     * Callback function executed when a new WebSocket connection is opened.
     */
    onOpen?: () => void;

    /**
     * WebSocket is assumed to have faulted if no message or pong is received for `n` milliseconds.
     */
    stallThreshold: number;

    /**
     * Server address to connect to.
     */
    url: string | URL;
}

export class PersistentWebSocket {
    /** The connection has been terminated (permanently closed). */
    static readonly TERMINATED = 5;
    /** The connection is restarted. */
    static readonly RESTARTING = 4;

    // user options
    private onClose: null | ((code: number, reason: string) => undefined | number);
    private onError: null | ((err: Error) => undefined | number);
    private onMessage: null | ((data: string) => void);
    private onOpen: null | (() => void);
    private stallThreshold: number;
    private url: string;

    // timeouts & intervals
    private healthCheckInterval: null | TimerId = null;
    private pingInterval: null | TimerId = null;
    private restartTimeout: null | TimerId = null;

    // state
    private terminated = false;
    private ws: null | WebSocket = null;
    private pendingMessages: [data: any, cbOrOptions?: SendCb | SendOpts, cb?: SendCb][] = [];
    private log: Logger;

    // recent event tracking
    private lastCreated = 0; // this is immediately set when the class is instantiated
    private lastClose: null | [number, number, Buffer] = null;
    private lastError: null | [number, Error] = null;
    private lastMessage: null | [number, WebSocket.RawData] = null;
    private lastOpen: null | number = null;
    private lastPong: null | number = null;

    constructor(opts: PersistentWebSocketOpts) {
        // user options
        this.log = opts.logger ?? getLogger(`PersistentWebSocket [${opts.url}]`);
        this.onClose = opts.onClose ?? null;
        this.onError = opts.onError ?? null;
        this.onMessage = opts.onMessage ?? null;
        this.onOpen = opts.onOpen ?? null;
        this.stallThreshold = opts.stallThreshold;
        this.url = opts.url.toString().replace(/#.*/, ""); // remove hash ("fragment identifier")

        this.start();

        // regularly check if we received data recently
        this.healthCheckInterval = setInterval(() => this.healthCheck(), 100);

        // ping the server regularly
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, this.stallThreshold / 3);
    }

    /**
     * Send a message to the server. Queues messages until the WebSocket is opened.
     */
    public send(data: any, cb?: SendCb): void;
    public send(data: any, options: SendOpts, cb?: SendCb): void;
    public send(data: any, cbOrOptions?: SendCb | SendOpts, cb?: SendCb): void {
        if (this.readyState === PersistentWebSocket.TERMINATED) {
            throw new Error("WebSocket is terminated");
        }

        if (this.ws == null || this.readyState === PersistentWebSocket.RESTARTING) {
            // queue message until WebSocket is ready
            this.pendingMessages.push([data, cbOrOptions, cb]);
            return;
        }

        if (cb) {
            this.ws.send(data, cbOrOptions as SendOpts, cb);
        }
        else {
            this.ws.send(data, cbOrOptions as SendCb);
        }
    }

    /**
     * Restart the WebSocket connection after the specified number of milliseconds.
     */
    public restart(ms = 0) {
        if (ms < 0) {
            throw new Error(`Invalid restart delay: ${ms}ms`);
        }

        if (this.terminated) {
            // we're shutting down
            return;
        }

        if (this.restartTimeout != null) {
            // already restarting
            return;
        }

        if (this.ws?.readyState === WebSocket.CONNECTING) {
            // close websocket before connection has been opened
            this.ws.terminate();
        }
        else if (this.ws?.readyState === WebSocket.OPEN) {
            // close websocket if it is open
            this.ws.close(CLOSE_CODE_RESTART, "Restarting websocket");
        }
        this.ws = null;

        if (ms === 0) {
            this.start();
        }
        else {
            this.restartTimeout = setTimeout(() => {
                this.restartTimeout = null;
                this.start();
            }, ms);
        }
    }

    /**
     * Initializes a new WebSocket connection.
     */
    private start(): void {
        if (this.terminated) {
            // we're shutting down
            return;
        }
        if (this.ws != null) {
            // we've already got a WebSocket
            this.log.warn("WebSocket object already exists, status:", this.ws.readyState);
            return;
        }

        const ws = new WebSocket(this.url);
        this.ws = ws;
        this.lastCreated = Date.now();

        ws.on("close", (code, reason) => {
            if (this.ws === ws) {
                this.lastClose = [Date.now(), code, reason];

                // auto restart websocket (500ms by default)
                const autoRestart = this.onClose?.(code, reason.toString());
                this.restart(autoRestart ?? RESTART_DELAY_AFTER_CLOSE);
            }
        });

        ws.on("error", err => {
            if (this.ws === ws) {
                this.lastError = [Date.now(), err];

                // auto restart websocket (500ms by default)
                const autoRestart = this.onError?.(err);
                this.restart(autoRestart ?? RESTART_DELAY_AFTER_CLOSE);
            }
        });

        ws.on("message", data => {
            if (this.ws === ws) {
                this.lastMessage = [Date.now(), data];
                this.onMessage?.(data.toString());
            }
        });

        ws.on("open", () => {
            if (this.ws === ws) {
                this.lastOpen = Date.now();
                this.onOpen?.();

                // send pending messages
                for (const [data, cbOrOptions, cb] of this.pendingMessages) {
                    if (cb) {
                        this.ws.send(data, cbOrOptions as SendOpts, cb);
                    }
                    else {
                        this.ws.send(data, cbOrOptions as SendCb);
                    }
                }
                this.pendingMessages = [];
            }
        });

        ws.on("pong", _ => {
            if (this.ws === ws) {
                this.lastPong = Date.now();
            }
        });
    }

    /**
     * Restarts WebSocket if no data has been received recently.
     */
    private healthCheck(): void {
        if (this.restartTimeout != null) {
            // no point in checking health if a restart is already in progress
            return;
        }
        if (this.getLastReceive() > Date.now() - this.stallThreshold) {
            // we received data recently
            return;
        }
        this.restart(RESTART_DELAY_AFTER_STALL);
    }

    /**
     * Permanently stop the persistent WebSocket. Further restart requests will be ignored.
     */
    public terminate(closeCode?: number, closeData?: string | Buffer): void {
        if (this.terminated) {
            // already stopped
            return;
        }
        this.terminated = true;

        // remove timeouts & intervals
        if (this.healthCheckInterval != null) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.pingInterval != null) {
            clearInterval(this.pingInterval);
        }
        if (this.restartTimeout != null) {
            clearTimeout(this.restartTimeout);
        }

        if (this.ws?.readyState === WebSocket.CONNECTING) {
            // close websocket before connection has been opened
            this.ws.terminate();
        }
        else if (this.ws?.readyState === WebSocket.OPEN) {
            // close websocket if it is open
            this.ws.close(closeCode, closeData);
        }
    }

    public getLastReceive() {
        return Math.max(
            this.lastCreated,
            this.lastOpen ?? 0,
            this.lastMessage?.[0] ?? 0,
            this.lastPong ?? 0,
        );
    }

    public getLastCreated() {
        return this.lastCreated;
    }

    public getLastOpen() {
        return this.lastOpen;
    }

    public getLastMessage() {
        return this.lastMessage;
    }

    public getLastPong() {
        return this.lastPong;
    }

    public getLastClose() {
        return this.lastClose;
    }

    public getLastError() {
        return this.lastError;
    }

    public get readyState(): number {
        if (this.terminated) {
            return PersistentWebSocket.TERMINATED;
        }
        if (this.restartTimeout != null) {
            return PersistentWebSocket.RESTARTING;
        }
        return this.ws?.readyState ?? -1;
    }
}
