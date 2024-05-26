import { type SetTimeout, TimedMap } from "~/time";
import { memo, timedMemo } from "..";

describe("memo", () => {
    const setup = <R = void, T extends any[] = never[]>(impl?: (...args: T) => R) => {
        const fn = jest.fn<R, T>(impl);
        const memoFn = memo(fn);
        return { fn, memoFn };
    };

    it("can memoize `null` results", () => {
        const { fn, memoFn } = setup(() => null);
        expect(fn).toHaveBeenCalledTimes(0);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("can memoize `undefined` results", () => {
        const { fn, memoFn } = setup(() => {});
        expect(fn).toHaveBeenCalledTimes(0);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("only calls the memoized function with new args", () => {
        const { fn, memoFn } = setup((v: number) => 2 * v);
        expect(memoFn(3)).toBe(6);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(memoFn(3)).toBe(6);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(memoFn(4)).toBe(8);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("can memoize object args", () => {
        const { fn, memoFn } = setup((o: { v: number }) => o.v);
        expect(memoFn({ v: 3 })).toBe(3);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(memoFn({ v: 3 })).toBe(3);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe("timedMemo", () => {
    const setup = <R = void, T extends any[] = never[]>(impl?: (...args: T) => R) => {
        const fn = jest.fn<R, T>(impl);
        const setTimeout = jest.fn();
        const clearTimeout = jest.fn();

        const createTimedMap = <R>(defaultTtl: number) =>
            new TimedMap<string, R>({ defaultTtl }, setTimeout as unknown as SetTimeout, clearTimeout);
        const memoFn = timedMemo(fn, undefined, createTimedMap);

        return { fn, setTimeout, clearTimeout, createTimedMap, memoFn };
    };

    it("default TTL is 60 seconds", () => {
        const { setTimeout, memoFn } = setup(() => null);
        expect(setTimeout).toHaveBeenCalledTimes(0);
        memoFn();
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60 * 1000);
    });

    it("default TTL is 60 seconds", () => {
        const { setTimeout, memoFn } = setup(() => null);
        expect(setTimeout).toHaveBeenCalledTimes(0);
        memoFn();
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60 * 1000);
    });

    it("can override the TTL", () => {
        const createTimedMap = jest.fn(() => new TimedMap<any, any>());
        timedMemo(() => {}, 5, createTimedMap);
        expect(createTimedMap).toHaveBeenLastCalledWith(5);
    });

    it("evicts cached values after the TTL expires", () => {
        const { fn, setTimeout, memoFn } = setup((_: number) => {});
        memoFn(1);
        memoFn(2);
        expect(fn).toHaveBeenCalledTimes(2);

        memoFn(1);
        memoFn(2);
        expect(fn).toHaveBeenCalledTimes(2);

        // Evict the first memoized result, for `memoFn(1)`.
        // This is usually called by setTimeout after some time.
        setTimeout.mock.calls[0][0]();

        memoFn(1);
        expect(fn).toHaveBeenCalledTimes(3);
        memoFn(2);
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it("can memoize `null` results", () => {
        const { fn, memoFn } = setup(() => null);
        expect(fn).toHaveBeenCalledTimes(0);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("can memoize `undefined` results", () => {
        const { fn, memoFn } = setup(() => {});
        expect(fn).toHaveBeenCalledTimes(0);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
        memoFn();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("only calls the memoized function with new args", () => {
        const { fn, memoFn } = setup((v: number) => 2 * v);
        expect(memoFn(3)).toBe(6);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(memoFn(3)).toBe(6);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(memoFn(4)).toBe(8);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("can memoize object args", () => {
        const { fn, memoFn } = setup((o: { v: number }) => o.v);
        expect(memoFn({ v: 3 })).toBe(3);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(memoFn({ v: 3 })).toBe(3);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
