import type { TimerId } from "./time";

interface IteratorResult<T> {
    value: T;
    done?: boolean;
}

interface TimedMapOpts<K, V> {
    /**
     * Each entry is in the format [key, value], or [key, [ttl, value]].
     */
    entries?: [K, V | [number, V]][];

    /**
     * Default time-to-live for each entry. Specified in milliseconds, defaults to one minute.
     */
    defaultTtl?: number;
}

/**
 * Map which automatically evicts entries by time. Uses `setTimeout` for each entry.
 */
export class TimedMap<K, V> implements Map<K, V> {
    private cache: Map<K, [TimerId, V]>;
    private defaultTtl: number;

    public constructor(partialOpts?: TimedMapOpts<K, V>) {
        const opts = {
            entries: null,
            defaultTtl: 60 * 1000,
            ...partialOpts,
        };

        this.defaultTtl = opts.defaultTtl;

        this.cache = new Map(opts.entries?.map(([k, v]) => {
            const [ttl, val] = Array.isArray(v) ? v : [opts.defaultTtl, v];
            return [k, [
                setTimeout(() => this.delete(k), ttl),
                val,
            ]];
        }));
    }

    /* Basic cache functions */

    public clear(): void {
        this.cache.forEach(v => clearTimeout(v[0]));
        this.cache.clear();
    }

    public delete(key: K): boolean {
        const arr = this.cache.get(key);
        if (arr != null) {
            clearTimeout(arr[0]);
        }
        return this.cache.delete(key);
    }

    public get(key: K): undefined | V {
        return this.cache.get(key)?.[1];
    }

    public has(key: K): boolean {
        return this.cache.has(key);
    }

    public set(key: K, value: V, ttl?: number): this {
        const timeout = setTimeout(() => this.delete(key), ttl ?? this.defaultTtl);

        const arr = this.cache.get(key);
        if (arr != null) {
            clearTimeout(arr[0]);
        }
        this.cache.set(key, [timeout, value]);

        return this;
    }

    public get size(): number {
        return this.cache.size;
    }

    /* Cache iteration functions */

    public entries(): IterableIterator<[K, V]> {
        const iter = this.cache.entries();

        return {
            next: () => {
                const { value, done }: IteratorResult<[K, [TimerId, V]]> = iter.next();
                if (done) {
                    return { value: null, done };
                }
                return { value: [value[0], value[1][1]] };
            },
            [Symbol.iterator]() {
                return this;
            },
        };
    }

    public keys(): IterableIterator<K> {
        return this.cache.keys();
    }

    public values(): IterableIterator<V> {
        const iter = this.cache.values();

        return {
            next: () => {
                const { value, done }: IteratorResult<[TimerId, V]> = iter.next();
                if (done) {
                    return { value: null, done };
                }
                return { value: value[1] };
            },
            [Symbol.iterator]() {
                return this;
            },
        };
    }

    public forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void {
        this.cache.forEach((v, k) => callbackfn(v[1], k, this));
    }

    public [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    public get [Symbol.toStringTag](): string {
        return TimedMap.name;
    }
}
