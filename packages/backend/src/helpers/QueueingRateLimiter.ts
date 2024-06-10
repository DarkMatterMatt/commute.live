import { createPromise } from "@commutelive/common";
import type { TimerId } from "~/types/timer";
import { Queue } from "./Queue";
import { RateLimiter, type RateLimiterOptions } from "./RateLimiter";

export type QueueingRateLimiterOptions = RateLimiterOptions;

export class QueueingRateLimiter extends RateLimiter {
    /**
     * Timeout for triggering next waiting request.
     */
    protected updateQueueTimeout: null | TimerId = null;

    /**
    * Callbacks waiting to be executed.
     */
    protected readonly waiting = new Queue<() => void>;

    constructor(opts: QueueingRateLimiterOptions) {
        super(opts);
    }

    private removeOldest(): void {
        if (this.updateQueueTimeout != null) {
            clearTimeout(this.updateQueueTimeout);
            this.updateQueueTimeout = null;
        }

        // remove the oldest element from the queue, and update the update timeout
        this.recent.remove();
        if (this.recent.size() > 0) {
            this.updateQueueTimeout = setTimeout(() => this.removeOldest(), this.recent.element() - Date.now());
        }

        // execute the next waiting callback
        if (this.waiting.size() > 0) {
            const cb = this.waiting.remove();
            this.accept(cb);
        }
    }

    public accept(cb: null | (() => void) = null): boolean {
        if (this.recent.size() < this.recent.maxSize) {
            const now = Date.now();
            this.recent.add(this.recent.peekLast(now) + (1000 / this.requestsPerSecond));

            // we just added the first element to the queue
            if (this.updateQueueTimeout == null) {
                this.updateQueueTimeout = setTimeout(() => this.removeOldest(), this.recent.element() - now);
            }

            cb?.();
            return true;
        }

        return false;
    }

    public async queue(cb: null | (() => void) = null): Promise<void> {
        if (this.accept(cb)) {
            return;
        }

        const [promise, resolve] = createPromise<void>();
        this.waiting.add(() => {
            cb?.();
            resolve();
        });
        return promise;
    }
}
