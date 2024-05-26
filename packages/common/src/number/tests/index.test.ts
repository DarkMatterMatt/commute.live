import { simpleTest } from "~/tests/helpers";
import { clamp, degreesToRadians, fixPrecisionError, radiansToDegrees, round } from "..";

describe("clamp", () => {
    simpleTest(clamp, [
        [5, 0, 9, 5],
        [5, 0, 4, 4],
        [5, 6, 9, 6],
        [-5, -10, -6, -6],
        [5, 0, null, 5],
        [5, null, 9, 5],
        [5, 6, null, 6],
        [5, null, 4, 4],
    ]);
});

describe("round", () => {
    simpleTest(round, [
        [1.2, undefined, 1],
        [1.2345, 1, 1.2],
        [1.2345, 2, 1.23],
        [1.2345, 3, 1.235],
        [1.2345, 4, 1.2345],
    ]);
});

describe("degreesToRadians", () => {
    simpleTest(degreesToRadians, [
        [-90, -0.5 * Math.PI],
        [0, 0],
        [90, 0.5 * Math.PI],
        [180, 1 * Math.PI],
        [360, 2 * Math.PI],
    ], "toBeCloseTo");
});

describe("radiansToDegrees", () => {
    simpleTest(radiansToDegrees, [
        [-0.5 * Math.PI, -90],
        [0, 0],
        [0.5 * Math.PI, 90],
        [1 * Math.PI, 180],
        [2 * Math.PI, 360],
    ], "toBeCloseTo");
});

describe("fixPrecisionError", () => {
    simpleTest(fixPrecisionError, [
        [0.1 + 0.2, 0.3],
        [0.1 * 0.2, 0.02],
        [0.30000000000000004, 0.3],
        [0.30000000000000004, 0.3],
    ]);

    it("retains 16 significant figures of precision", () => {
        const result = fixPrecisionError(999999.0000000001);
        expect(result).toBe(999999.0000000001);
    });

    it("retains 16 decimal places of precision", () => {
        const result = fixPrecisionError(0.9876543210123456);
        expect(result).toBe(0.9876543210123456);
    });

    it("javascript loses the 17th decimal place of precision", () => {
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        expect(0.98765432101234567).toBe(0.9876543210123456);
    });
});
