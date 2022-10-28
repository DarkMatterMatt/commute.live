/**
 * Clamp a value into a range, such that min <= result <= max.
 * @param val value to clamp into a range
 * @param min minimum value to be returned
 * @param max maximum value to be returned
 */
export function clamp(val: number, min: number | null, max: number | null): number {
    if (min != null && val < min) {
        return min;
    }
    if (max != null && val > max) {
        return max;
    }
    return val;
}

/**
 * Convert angle in degrees to radians.
 */
export function degreesToRadians(deg: number): number {
    return deg * Math.PI / 180;
}

/**
 * Convert angle in radians to degrees.
 */
export function radiansToDegrees(rad: number): number {
    return 180 * rad / Math.PI;
}

/**
 * Round number to specified number of decimal places.
 */
export function round(num: number, decimalPlaces = 0): number {
    const multiplier = 10 ** decimalPlaces;
    return Math.round((num + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * Comparator function for sorting numbers in ascending order.
 *
 * Usage: `[11, 2].sort(asc)`
 */
export function asc(a: number, b: number) {
    return a - b;
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
