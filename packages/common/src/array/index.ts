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
