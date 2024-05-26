import { getClosestPointOnLine, type Point } from "..";
import { fixPrecisionError } from "../../number";

function fixPrecision<T extends Record<string, number>>(obj: T): T {
    const entries = Object.entries(obj).map(([k, v]) => [k, fixPrecisionError(v)] as const);
    return Object.fromEntries(entries) as T;
}

describe("getClosestPointOnLine", () => {
    /**
     * Test line with the following shape (the line goes from 0, then 1, then 2, ...):
     *
     * 0 1     4
     *     2
     *     3
     */
    const TEST_LINE: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 4, y: 0 },
    ];

    it("interpolates between horizontal line points", () => {
        const point = { x: 0.4, y: 0 };
        const expected = { x: 0.4, y: 0, i: 1, fTo: 0.4, fFrom: 0.6 };
        const result = getClosestPointOnLine(TEST_LINE, point);
        expect(fixPrecision(result)).toMatchObject(expected);
    });

    it("interpolates between horizontal line points", () => {
        const point = { x: 0.4, y: 0 };
        const expected = { x: 0.4, y: 0, i: 1, fTo: 0.4, fFrom: 0.6 };
        const result = getClosestPointOnLine(TEST_LINE, point);
        expect(fixPrecision(result)).toMatchObject(expected);
    });

    it("interpolates between vertical line points", () => {
        const point = { x: 2, y: 1.7 };
        const expected = { x: 2, y: 1.7, i: 3, fTo: 0.7, fFrom: 0.3 };
        const result = getClosestPointOnLine(TEST_LINE, point);
        expect(fixPrecision(result)).toMatchObject(expected);
    });

    it("finds a matching point", () => {
        const point = { x: 0, y: 0 };
        const expected = { x: 0, y: 0, i: 1, fTo: 0, fFrom: 1 };
        const result = getClosestPointOnLine(TEST_LINE, point);
        expect(fixPrecision(result)).toMatchObject(expected);
    });

    it("snaps a point that is beyond the last point", () => {
        const point = { x: 8, y: 1 };
        const expected = { x: 4, y: 0, i: 4, fTo: 1, fFrom: 0 };
        const result = getClosestPointOnLine(TEST_LINE, point);
        expect(fixPrecision(result)).toMatchObject(expected);
    });

    it("snaps a point that isn't quite on the line", () => {
        const point = { x: 0.4, y: 0.1 };
        const expected = { x: 0.4, y: 0, i: 1, fTo: 0.4, fFrom: 0.6 };
        const result = getClosestPointOnLine(TEST_LINE, point);
        expect(fixPrecision(result)).toMatchObject(expected);
    });
});
