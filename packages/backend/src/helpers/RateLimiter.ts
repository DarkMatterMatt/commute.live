import { Queue } from "./Queue.js";

export interface RateLimiterOptions {
    /**
     * Number of requests to trigger rate limiting.
     */
    triggerThreshold: number;

    /**
     * Maximum continuous throughput, in requests per second.
     */
    requestsPerSecond: number;
}

export class RateLimiter {
    /**
     * Maximum continuous throughput, in requests per second.
     */
    protected readonly requestsPerSecond: number;

    /**
     * Contains the eviction time for `n` (triggerThreshold) recent requests.
     */
    protected readonly recent: Queue<number>;

    constructor(opts: RateLimiterOptions) {
        this.requestsPerSecond = opts.requestsPerSecond;
        this.recent = new Queue(opts.triggerThreshold);
    }

    public accept(cb: null | (() => void) = null): boolean {
        // remove old items from queue
        const now = Date.now();
        while (this.recent.size() > 0 && this.recent.element() < now) {
            this.recent.remove();
        }

        if (this.recent.size() < this.recent.maxSize) {
            this.recent.add(this.recent.peekLast(now) + (1000 / this.requestsPerSecond));
            cb?.();
            return true;
        }

        return false;
    }
}
