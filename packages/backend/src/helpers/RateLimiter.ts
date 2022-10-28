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
    private readonly requestsPerSecond: number;

    /**
     * Contains the eviction time for `n` (triggerThreshold) recent requests.
     */
    private readonly queue: Queue<number>;

    constructor(opts: RateLimiterOptions) {
        this.requestsPerSecond = opts.requestsPerSecond;
        this.queue = new Queue(opts.triggerThreshold);
    }

    public accept(cb: null | (() => void) = null): boolean {
        // remove old items from queue
        const now = Date.now();
        while (this.queue.size() > 0 && this.queue.element() < now) {
            this.queue.remove();
        }

        if (this.queue.size() < this.queue.maxSize) {
            this.queue.add(this.queue.peekLast(now) + (1000 / this.requestsPerSecond));
            cb?.();
            return true;
        }

        return false;
    }
}
