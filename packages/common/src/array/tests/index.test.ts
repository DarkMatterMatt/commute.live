import { simpleTest } from "~/test-helpers";
import { binarySearch, quantile } from "..";

describe("quantile", () => {
    const TEST_ARR = [5, 7, 4, 4, 6, 2, 8];
    simpleTest(quantile, [
        [TEST_ARR, 0.00, 2],
        [TEST_ARR, 0.20, 4],
        [TEST_ARR, 0.25, 4],
        [TEST_ARR, 0.40, 4.4],
        [TEST_ARR, 0.50, 5],
        [TEST_ARR, 0.60, 5.6],
        [TEST_ARR, 0.75, 6.5],
        [TEST_ARR, 0.80, 6.8],
        [TEST_ARR, 1.00, 8],
    ], "toBeCloseTo");
});

describe("binarySearch", () => {
    const TEST_ARR = [2, 4, 5, 6, 7, 8];
    simpleTest(binarySearch, [
        [TEST_ARR, 0, { found: -1, above: 0, below: -1 }],
        [TEST_ARR, 2, { found: 0, above: 1, below: -1 }],
        [TEST_ARR, 3, { found: -1, above: 1, below: 0 }],
        [TEST_ARR, 4, { found: 1, above: 2, below: 0 }],
        [TEST_ARR, 7, { found: 4, above: 5, below: 3 }],
        [TEST_ARR, 9, { found: -1, above: 6, below: 5 }],
    ], "toMatchObject");
});
