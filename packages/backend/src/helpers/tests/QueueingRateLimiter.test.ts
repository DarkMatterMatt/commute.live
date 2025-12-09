import { jest } from "@jest/globals";
import { QueueingRateLimiter } from "../QueueingRateLimiter";

describe("QueueingRateLimiter", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("accepts callback immediately when under rate limit", () => {
        const limiter = new QueueingRateLimiter({ requestsPerSecond: 10, triggerThreshold: 5 });
        const callback = jest.fn(() => { });

        const accepted = limiter.accept(callback);

        expect(accepted).toBe(true);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("rejects callback when at rate limit", () => {
        const limiter = new QueueingRateLimiter({ requestsPerSecond: 10, triggerThreshold: 2 });

        // Fill up the rate limiter
        limiter.accept();
        limiter.accept();

        const callback = jest.fn(() => { });
        const accepted = limiter.accept(callback);

        expect(accepted).toBe(false);
        expect(callback).not.toHaveBeenCalled();
    });

    it("queues callback and executes when rate limit frees up", async () => {
        const limiter = new QueueingRateLimiter({ requestsPerSecond: 10, triggerThreshold: 2 });

        // Fill up the rate limiter
        limiter.accept();
        limiter.accept();

        const callback = jest.fn(() => { });
        const queuePromise = limiter.queue(callback);

        // Callback should not have executed yet
        expect(callback).not.toHaveBeenCalled();

        // Advance time to free up the rate limiter (100ms = 1/10 second at 10 req/s)
        jest.advanceTimersByTime(100);

        await queuePromise;

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
