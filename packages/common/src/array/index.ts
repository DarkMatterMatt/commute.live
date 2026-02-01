import { Preconditions } from "~/errors";

/**
 * Comparator function for sorting numbers in ascending order.
 *
 * Usage: `[11, 2].sort(asc)`
 */
export function asc(a: number, b: number) {
    return a - b;
}

/**
 * Sum the numbers in an array.
 *
 * Usage: `sum([11, 2])`
 */
export function sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0);
}

/**
 * Get the q'th quantile of an array.
 *
 * Uses the R‑7 type of calculation. For more details see Wikipedia
 * @see https://en.wikipedia.org/wiki/Quantile#Estimating_quantiles_from_a_sample
 *
 * Modified from https://stackoverflow.com/a/55297611.
 * @param q quantile to get, in range 0 - 1.0.
 */
export function quantile(arr: number[], q: number) {
    const sorted = [...arr].sort(asc);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (base + 1 < sorted.length) {
        return sorted[base] + (rest * (sorted[base + 1] - sorted[base]));
    }
    return sorted[base];
}

/**
 * Binary search in array.
 *
 * @param arr Array to search through.
 * @param target Target value to search for.
 * @returns `result.found` is the target index if the target was found, -1 otherwise.
 */
export function binarySearch(arr: number[], target: number) {
    let low = 0;
    let high = arr.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] < target) {
            low = mid + 1;
        }
        else if (arr[mid] > target) {
            high = mid - 1;
        }
        else {
            return {
                above: mid + 1,
                below: mid - 1,
                found: mid,
            };
        }
    }
    return {
        above: low,
        below: high,
        found: -1,
    };
}

/**
 * Returns an array of T[], where each of T[] contains `chunkSize` items.
 * The last array may have less than `chunkSize` items.
 */
export function chunk<T>(arr: T[], chunkSize: number): T[][] {
    Preconditions.assert(Number.isInteger(chunkSize));
    let numChunks = Math.ceil(arr.length / chunkSize);
    return [...range(0, numChunks)].map(i => arr.slice(chunkSize * i, chunkSize * (i + 1)));
}

/**
 * Returns a sequence of numbers, from `start`, incrementing by 1, stopping before `end`.
 */
export function* range(start: number, end: number): Generator<number, void, unknown> {
    Preconditions.assert(Number.isInteger(start));
    Preconditions.assert(Number.isInteger(end));
    for (let i = start; i < end; i++) {
        yield i;
    }
}
