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
 * Changes ugly numbers like `0.30000000000000004` to `0.3`.
 */
export function fixPrecisionError(val: number): number {
    const rounded = Math.round(val * 1000) / 1000;
    if (Math.abs(val - rounded) < 1e-12) {
        return rounded;
    }
    return val;
}