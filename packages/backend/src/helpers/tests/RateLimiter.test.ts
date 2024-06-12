import { jest } from "@jest/globals";
import { RateLimiter, type RateLimiterOptions } from "../RateLimiter";

describe("RateLimiter", () => {
    const setup = ({
        triggerThreshold = 2,
        requestsPerSecond = 1,
    }: Partial<RateLimiterOptions> = {}) => {
        const getEpochTime = jest.fn(() => 0);
        const rateLimiter = new RateLimiter({
            triggerThreshold,
            requestsPerSecond,
        }, getEpochTime);
        return { rateLimiter, getEpochTime };
    };

    it("accepts a request", () => {
        const { rateLimiter } = setup();
        expect(rateLimiter.accept()).toBe(true);
    });

    it("accepts the first `n` requests and declines the next", () => {
        const { rateLimiter } = setup({ triggerThreshold: 2 });
        expect(rateLimiter.accept()).toBe(true);
        expect(rateLimiter.accept()).toBe(true);
        expect(rateLimiter.accept()).toBe(false);
    });

    it("after triggering, accepts at most `n` requests per second (max throughput)", () => {
        const { rateLimiter, getEpochTime } = setup({ triggerThreshold: 2, requestsPerSecond: 2 });
        // Hit the trigger threshold.
        expect(rateLimiter.accept()).toBe(true);
        expect(rateLimiter.accept()).toBe(true);
        expect(rateLimiter.accept()).toBe(false);

        // Advance until it's almost ready to accept another request.
        getEpochTime.mockReturnValue(499);
        expect(rateLimiter.accept()).toBe(false);

        // Advance until it's ready to accept another request.
        getEpochTime.mockReturnValue(500);
        expect(rateLimiter.accept()).toBe(true);

        // Another request immediately after should be declined.
        expect(rateLimiter.accept()).toBe(false);

        // Advance until it's almost ready to accept another request.
        getEpochTime.mockReturnValue(999);
        expect(rateLimiter.accept()).toBe(false);

        // Advance until it's ready to accept another request.
        getEpochTime.mockReturnValue(1000);
        expect(rateLimiter.accept()).toBe(true);
    });

    it("after triggering, accepts an average of `n` requests per second", () => {
        const { rateLimiter, getEpochTime } = setup({ triggerThreshold: 2, requestsPerSecond: 2 });
        // Hit the trigger threshold.
        expect(rateLimiter.accept()).toBe(true); // Allows another at T=500.
        expect(rateLimiter.accept()).toBe(true); // Allows another at T=1000.
        expect(rateLimiter.accept()).toBe(false);

        // Advance until it's ready to accept another request.
        getEpochTime.mockReturnValue(750);
        expect(rateLimiter.accept()).toBe(true); // Allows another at T=1500.
        expect(rateLimiter.accept()).toBe(false);

        // Even though it's only been 250ms since the last request, it should allow another
        // request here, because it has been 1000ms since the first two requests were accepted.
        getEpochTime.mockReturnValue(1000);
        expect(rateLimiter.accept()).toBe(true);
        expect(rateLimiter.accept()).toBe(false);
    });

    it("calls the callback function iff it accepts", () => {
        const { rateLimiter, getEpochTime } = setup({ triggerThreshold: 2, requestsPerSecond: 2 });
        const cb = jest.fn();

        // Hit the trigger threshold.
        rateLimiter.accept(cb);
        expect(cb).toHaveBeenCalledTimes(1);
        rateLimiter.accept(cb);
        expect(cb).toHaveBeenCalledTimes(2);
        rateLimiter.accept(cb);
        expect(cb).toHaveBeenCalledTimes(2);

        // Advance until it's ready to accept another request.
        getEpochTime.mockReturnValue(750);
        rateLimiter.accept(cb);
        expect(cb).toHaveBeenCalledTimes(3);
        rateLimiter.accept(cb);
        expect(cb).toHaveBeenCalledTimes(3);

        // Even though it's only been 250ms since the last request, it should allow another
        // request here, because it has been 1000ms since the first two requests were accepted.
        getEpochTime.mockReturnValue(1000);
        rateLimiter.accept(cb);
        expect(cb).toHaveBeenCalledTimes(4);
        rateLimiter.accept(cb);
        expect(cb).toHaveBeenCalledTimes(4);
    });
});
