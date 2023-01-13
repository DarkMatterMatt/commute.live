import { TimedMap } from "~/time";

export function memo<A extends any[], R>(method: (...args: A) => R) {
    const cache: Record<string, R> = {};

    return (...args: A) => {
        const json = JSON.stringify(args);
        if (cache[json] == null) {
            cache[json] = method(...args);
        }
        return cache[json];
    };
}

export function timedMemo<A extends any[], R>(method: (...args: A) => R, defaultTtl = 60 * 1000) {
    const cache = new TimedMap<string, R>({ defaultTtl });

    return (...args: A) => {
        const json = JSON.stringify(args);
        const cached = cache.get(json);
        if (cached != null) {
            return cached;
        }
        const result = method(...args);
        cache.set(json, result);
        return result;
    };
}
