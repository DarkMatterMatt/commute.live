import { TimedMap } from "~/time";

const NOT_PRESENT = Symbol("NOT_PRESENT");

/**
 * Memoize a function so that it is only called once for each set of arguments.
 * @param fn Function to memoize. The function's arguments must be safe to JSON.stringify.
 */
export function memo<A extends any[], R>(fn: (...args: A) => R) {
    const cache: Record<string, [R]> = {};
    return (...args: A) => {
        const json = JSON.stringify(args);
        // We cache an array so that this nullish check works
        // even when the memoized function returns null/undefined.
        cache[json] ??= [fn(...args)];
        return cache[json][0];
    };
}

/**
 * Memoize a function so that it is only called once for each set of arguments.
 * The cached results are automatically evicted after some time.
 * @param fn Function to memoize. The function's arguments must be safe to JSON.stringify.
 * @param ttl Time in milliseconds to evict cached results after, defaults to one minute.
 */
export function timedMemo<A extends any[], R>(
    fn: (...args: A) => R,
    ttl = 60 * 1000,
    createTimedMap = defaultCreateTimedMap,
) {
    const cache = createTimedMap<R>(ttl);
    return (...args: A) => {
        const json = JSON.stringify(args);
        const cached = cache.get(json, NOT_PRESENT);
        if (cached !== NOT_PRESENT) {
            return cached;
        }
        const result = fn(...args);
        cache.set(json, result);
        return result;
    };
}

function defaultCreateTimedMap<R>(defaultTtl: number) {
    return new TimedMap<string, R>({ defaultTtl });
}
