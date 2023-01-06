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
