import type { TimerId } from "~/types";
import { clearInterval, clearTimeout, setInterval, setTimeout } from "node:timers";
import WebSocket from "ws";

export const CLOSE_CODE_RESTART = 4002;
export const CLOSE_CODE_STOPPING = 4003;

export const RESTART_DELAY_AFTER_CLOSE = 500;
export const RESTART_DELAY_AFTER_STALL = 100;

/**
 * WebSocket is assumed to have faulted if no message or pong is received for `n` milliseconds.
 */
export const STALL_THRESHOLD_DEFAULT = 2000;

export interface PersistentWebSocketOpts {
    /**
     * Callback function, can optionally return a non-negative number to restart after the specified
     * delay (in milliseconds).
     *
     * Return value is not used if `onError()` has specified a restart delay.
     */
    onClose?: (code: number, reason: Buffer) => undefined | number;

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
    onMessage?: (ws: WebSocket, data: string) => void;

    /**
     * Callback function executed when a new WebSocket connection is opened.
     */
    onOpen?: (ws: WebSocket) => void;

    /**
     * WebSocket is assumed to have faulted if not message or pong is received for `n` milliseconds.
     */
    stallThreshold?: number;

    /**
     * Server address to connect to.
     */
    url: string;
}

export class PersistentWebSocket {
    // user options
    private onClose: null | ((code: number, reason: Buffer) => undefined | number);
    private onError: null | ((err: Error) => undefined | number);
    private onMessage: null | ((ws: WebSocket, data: string) => void);
    private onOpen: null | ((ws: WebSocket) => void);
    private stallThreshold: number;
    private url: string;

    // timeouts & intervals
    private healthCheckInterval: null | TimerId = null;
    private pingInterval: null | TimerId = null;
    private restartTimeout: null | TimerId = null;

    // state
    private terminated = false;
    private lastReceive = 0;
    private ws: null | WebSocket = null;

    constructor(opts: PersistentWebSocketOpts) {
        const defaultOpts = {
            stallThreshold: STALL_THRESHOLD_DEFAULT,
            onClose: null,
            onError: null,
            onMessage: null,
            onOpen: null,
        };
        const o = { ...defaultOpts, ...opts };

        // user options
        this.onClose = o.onClose;
        this.onError = o.onError;
        this.onMessage = o.onMessage;
        this.onOpen = o.onOpen;
        this.stallThreshold = o.stallThreshold;
        this.url = o.url;

        this.start();

        // regularly check if we received data recently
        this.healthCheckInterval = setInterval(() => this.healthCheck(), 100);

        // ping the server regularly
        this.pingInterval = setInterval(() => this.ws?.ping(), this.stallThreshold / 2);
    }

    /**
     * Restart the WebSocket connection after the specified number of milliseconds.
     */
    private restart(ms: number) {
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

        this.restartTimeout = setTimeout(() => {
            this.restartTimeout = null;
            this.start();
        }, ms);
    }

    /**
     * Initializes a new WebSocket connection.
     */
    private start(): void {
        if (this.terminated) {
            // we're shutting down
            return;
        }

        const ws = new WebSocket(this.url);
        this.ws = ws;
        this.lastReceive = Date.now();

        ws.on("close", (code, reason) => {
            this.ws = null;

            // auto restart websocket (500ms by default)
            const autoRestart = this.onClose?.(code, reason);
            this.restart(autoRestart ?? RESTART_DELAY_AFTER_CLOSE);
        });

        ws.on("error", err => {
            this.ws = null;

            // auto restart websocket (500ms by default)
            const autoRestart = this.onError?.(err);
            this.restart(autoRestart ?? RESTART_DELAY_AFTER_CLOSE);
        });

        ws.on("message", data => {
            this.lastReceive = Date.now();

            if (typeof data !== "string") {
                throw new Error("Handling of non-string data is not implemented");
            }

            this.onMessage?.(ws, data);
        });

        ws.on("open", () => {
            this.lastReceive = Date.now();
            this.onOpen?.(ws);
        });

        ws.on("pong", _ => {
            this.lastReceive = Date.now();
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
        if (this.lastReceive > Date.now() - this.stallThreshold) {
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
}
