import type { TimerId } from "~/types";
import { clearInterval, clearTimeout, setInterval, setTimeout } from "node:timers";
import WebSocket from "ws";
import { getLogger, Logger } from "~/log";
import { PersistentWebSocket, SendCb, SendOpts } from "./PersistentWebSocket";

export interface MultiPersistentWebSocketOpts {
    /**
     * One WebSocket is restarted if no messages have been received from any connection in the last
     * `n` milliseconds.
     */
    allConnectionsSilentThreshold: number;

    /**
     * Number of concurrent WebSocket connections.
     */
    concurrentConnections: number;

    /**
     * WebSocket is assumed to have faulted if the latest update is `n` milliseconds behind the
     * latest update across all connections.
     */
    lagThreshold: number;

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
    onClose?: (wsIdx: number, code: number, reason: string) => undefined | number;

    /**
     * Callback function, can optionally return a non-negative number to restart after the specified
     * delay (in milliseconds).
     *
     * `onClose()` will always be called after this.
     */
    onError?: (wsIdx: number, err: Error) => undefined | number;

    /**
     * Callback function executed when the WebSocket receives a message.
     */
    onMessage?: (wsIdx: number, data: string) => void;

    /**
     * Callback function executed when a new WebSocket connection is opened.
     */
    onOpen?: (wsIdx: number) => void;

    /**
     * Override the default logger.
     */
    getPersistentWebSocketLogger?: (wsIdx: number) => Logger;

    /**
     * WebSocket is assumed to have faulted if no message or pong is received for `n` milliseconds.
     */
    stallThreshold: number;

    /**
     * Minimum delay between new connection requests, measured in milliseconds.
     */
    startDelayBetweenConnections: number;

    /**
     * Server address to connect to.
     */
    url: string | URL | ((wsIdx: number) => string | URL);
}

export class MultiPersistentWebSocket {
    // user options
    private onClose: null | ((wsIdx: number, code: number, reason: string) => undefined | number);
    private onError: null | ((wsIdx: number, err: Error) => undefined | number);
    private onMessage: null | ((wsIdx: number, data: string) => void);
    private onOpen: null | ((wsIdx: number) => void);

    private allConnectionsSilentThreshold: number;
    private concurrentConnections: number;
    private lagThreshold: number;
    private getPersistentWebSocketLogger: null | ((wsIdx: number) => Logger);
    private stallThreshold: number;
    private startDelayBetweenConnections: number;
    private url: string | URL | ((wsIdx: number) => string | URL);

    // timeouts & intervals
    private healthCheckInterval: null | TimerId = null;
    private restartTimeouts: (null | [number, TimerId])[];

    // state
    private terminated = false;
    private pws: (null | PersistentWebSocket)[];
    private log: Logger;

    constructor(opts: MultiPersistentWebSocketOpts) {
        if (opts.concurrentConnections <= 0) {
            throw new Error(`concurrentConnections must be greater than 0, received: ${opts.concurrentConnections}`);
        }

        // user options
        this.allConnectionsSilentThreshold = opts.allConnectionsSilentThreshold;
        this.concurrentConnections = opts.concurrentConnections;
        this.lagThreshold = opts.lagThreshold;
        this.log = opts.logger
            ?? getLogger(`MultiPersistentWebSocket [${typeof opts.url === "function" ? opts.url(0) : opts.url}]`);
        this.onClose = opts.onClose ?? null;
        this.onError = opts.onError ?? null;
        this.onMessage = opts.onMessage ?? null;
        this.onOpen = opts.onOpen ?? null;
        this.getPersistentWebSocketLogger = opts.getPersistentWebSocketLogger ?? null;
        this.stallThreshold = opts.stallThreshold;
        this.startDelayBetweenConnections = opts.startDelayBetweenConnections;
        this.url = opts.url;

        this.restartTimeouts = new Array(this.concurrentConnections).fill(null);
        this.pws = new Array(this.concurrentConnections).fill(null);

        for (let wsIdx = 0; wsIdx < this.concurrentConnections; wsIdx++) {
            this.restart(wsIdx);
        }

        // regularly check if we received data recently
        this.healthCheckInterval = setInterval(() => this.healthCheck(), 100);
    }

    /**
    * Send a message to the server.
    */
    public send(wsIdx: number, data: any, cb?: SendCb): void;
    public send(wsIdx: number, data: any, options: SendOpts, cb?: SendCb): void;
    public send(wsIdx: number, data: any, cbOrOptions?: SendCb | SendOpts, cb?: SendCb): void {
        const pws = this.pws[wsIdx];
        if (pws == null) {
            throw new Error(`WebSocket[${wsIdx}] has not started yet`);
        }

        if (cb) {
            pws.send(data, cbOrOptions as SendOpts, cb);
        }
        else {
            pws.send(data, cbOrOptions as SendCb);
        }
    }

    /**
     * Restart the WebSocket connection after the specified number of milliseconds.
     */
    public restart(wsIdx: number, ms = 0) {
        if (ms < 0) {
            throw new Error(`Invalid restart delay: ${ms}ms`);
        }

        if (this.terminated) {
            // we're shutting down
            return;
        }

        if (this.restartTimeouts[wsIdx] != null) {
            // already restarting
            return;
        }

        // schedule restart for at least `startDelayBetweenConnections` ms after the last timeout
        const now = Date.now();
        const target = Math.max(
            now + ms,
            this.getLastCreated() + this.startDelayBetweenConnections,
            ...this.restartTimeouts.map(t => t ? t[0] + this.startDelayBetweenConnections : 0),
        );

        const startOrRestart = () => {
            this.restartTimeouts[wsIdx] = null;
            const pws = this.pws[wsIdx];
            if (pws == null) {
                this.start(wsIdx);
            }
            else {
                pws.restart();
            }
        };

        if (target === now) {
            startOrRestart();
        }
        else {
            this.restartTimeouts[wsIdx] = [target, setTimeout(startOrRestart, target - now)];
        }
    }

    /**
     * Permanently stop all connections. Further restart requests will be ignored.
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
        for (const restartTimeout of this.restartTimeouts) {
            if (restartTimeout != null) {
                clearTimeout(restartTimeout[1]);
            }
        }
        for (const pws of this.pws) {
            pws?.terminate(closeCode, closeData);
        }
    }

    public getLastReceive() {
        return Math.max(
            this.getLastCreated(),
            this.getLastOpen() ?? 0,
            this.getLastMessage()?.[0] ?? 0,
            this.getLastPong() ?? 0,
        );
    }

    public getLastCreated() {
        return Math.max(...this.pws.map(pws => pws?.getLastCreated() ?? 0));
    }

    public getLastOpen() {
        let result: null | number = null;
        for (const pws of this.pws) {
            const lastOpen = pws?.getLastOpen();
            if (lastOpen != null && (result == null || lastOpen > result)) {
                result = lastOpen;
            }
        }
        return result;
    }

    public getLastMessage() {
        let result: null | [number, WebSocket.RawData] = null;
        for (const pws of this.pws) {
            const lastMessage = pws?.getLastMessage();
            if (lastMessage != null && (result == null || lastMessage[0] > result[0])) {
                result = lastMessage;
            }
        }
        return result;
    }

    public getLastPong() {
        let result: null | number = null;
        for (const pws of this.pws) {
            const lastPong = pws?.getLastPong();
            if (lastPong != null && (result == null || lastPong > result)) {
                result = lastPong;
            }
        }
        return result;
    }

    public getLastClose() {
        let result: null | [number, number, Buffer] = null;
        for (const pws of this.pws) {
            const lastClose = pws?.getLastClose();
            if (lastClose != null && (result == null || lastClose[0] > result[0])) {
                result = lastClose;
            }
        }
        return result;
    }

    public getLastError() {
        let result: null | [number, Error] = null;
        for (const pws of this.pws) {
            const lastError = pws?.getLastError();
            if (lastError != null && (result == null || lastError[0] > result[0])) {
                result = lastError;
            }
        }
        return result;
    }

    public get readyState(): number {
        if (this.terminated) {
            return PersistentWebSocket.TERMINATED;
        }

        const pwsReadyStates = this.pws.map(pws => pws?.readyState ?? -1);
        if (pwsReadyStates.some(s => s === WebSocket.OPEN)) {
            return WebSocket.OPEN;
        }
        if (pwsReadyStates.some(s => s === WebSocket.CONNECTING)) {
            return WebSocket.CONNECTING;
        }
        if (pwsReadyStates.some(s => s === PersistentWebSocket.RESTARTING)) {
            return PersistentWebSocket.RESTARTING;
        }

        return -1;
    }

    /**
     * Initializes a new WebSocket connection.
     */
    private start(wsIdx: number): void {
        if (wsIdx >= this.concurrentConnections) {
            throw new Error(`Invalid WebSocket index: ${wsIdx} (${this.concurrentConnections} concurrent connections)`);
        }

        if (this.terminated) {
            // we're shutting down
            return;
        }

        if (this.pws[wsIdx] != null) {
            // we've already got a PersistentWebSocket
            this.log.warn(`PersistentWebSocket[${wsIdx}] already exists, status:`, this.pws[wsIdx]?.readyState);
            return;
        }

        this.log.verbose(`Starting PersistentWebSocket[${wsIdx}]`);

        this.pws[wsIdx] = new PersistentWebSocket({
            logger: this.getPersistentWebSocketLogger?.(wsIdx) ?? getLogger(`${this.log.label}[PWS#${wsIdx}]`),
            url: typeof this.url === "function" ? this.url(wsIdx) : this.url,
            stallThreshold: this.stallThreshold,
            onClose: (code, reason) => {
                // auto restart websocket (500ms by default)
                const autoRestart = this.onClose?.(wsIdx, code, reason.toString());
                return autoRestart;
            },
            onError: err => {
                // auto restart websocket (500ms by default)
                const autoRestart = this.onError?.(wsIdx, err);
                return autoRestart;
            },
            onMessage: data => {
                this.onMessage?.(wsIdx, data);
            },
            onOpen: () => {
                this.onOpen?.(wsIdx);
            },
        });
    }

    /**
     * Restarts WebSocket if no data has been received recently.
     */
    private healthCheck(): void {
        if (this.pws.some(pws => pws?.readyState === PersistentWebSocket.RESTARTING)) {
            // we're already restarting a connection
            return;
        }

        // find websocket that has least recently received data
        let oldestPws: null | [number, number] = null;
        for (let i = 0; i < this.pws.length; i++) {
            const pws = this.pws[i];
            if (pws == null || pws.readyState !== WebSocket.OPEN) {
                continue;
            }

            const latestMessage = Math.max(
                pws.getLastCreated(),
                pws.getLastOpen() ?? 0,
                pws.getLastMessage()?.[0] ?? 0,
            );
            if (oldestPws == null || latestMessage < oldestPws[0]) {
                oldestPws = [latestMessage, i];
            }
        }

        if (oldestPws == null) {
            // no websockets are open
            return;
        }

        const now = Date.now();
        const latestMessage = this.getLastMessage()?.[0];
        const [oldestMessage, pwsIdx] = oldestPws;

        if ((latestMessage ?? this.getLastCreated()) < now - this.allConnectionsSilentThreshold) {
            // restart the slowest websocket
            this.log.verbose(`All connections are silent, restarting the #${pwsIdx} connection`);
            this.pws[pwsIdx]?.restart();
            return;
        }

        // check for lagging websockets
        if (latestMessage != null && oldestMessage < latestMessage - this.lagThreshold) {
            // restart the slowest websocket
            this.log.verbose(`WebSocket was lagging, restarting the #${pwsIdx} connection`);
            this.pws[pwsIdx]?.restart();
            return;
        }
    }
}
