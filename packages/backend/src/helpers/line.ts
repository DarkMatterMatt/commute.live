import { Point } from "../types";

/* Magic from https://stackoverflow.com/a/30269960 */

/**
 * Finds closest point on a line to the provided point. Used to 'snap' a point to its polyline.
 * @returns `x`, `y`: A point on the line that is closest to `p`.
 * @returns `i`: The next index on the line. The previous index is `i - 1`.
 * @returns `fTo`: Fraction of distance along line from `i - 1` towards `i`. `0 <= fTo <= 1`.
 * @returns `fFrom`: Fraction of distance along line from `i` towards `i - 1`. `0 <= fFrom <= 1`.
 */
export function getClosestPointOnLine(line: Point[], p: Point) {
    let minDist = Infinity;
    let fTo = 0;
    let fFrom = 0;
    let i = 0;

    if (line.length <= 1) {
        throw new Error("Not enough points.");
    }

    // special case where `p` is the first point on the line
    if (p.x === line[0].x && p.y === line[0].y) {
        return { x: p.x, y: p.y, i: 1, fTo: 0, fFrom: 1 };
    }

    for (let n = 1; n < line.length; n++) {
        // check if `p` is this exactly at this point on the line
        if (p.x === line[n].x && p.y === line[n].y) {
            return { x: p.x, y: p.y, i: n, fTo: 1, fFrom: 0 };
        }

        let dist: number;
        if (line[n].x !== line[n - 1].x) {
            const a = (line[n].y - line[n - 1].y) / (line[n].x - line[n - 1].x);
            const b = line[n].y - (a * line[n].x);
            dist = Math.abs((a * p.x) + b - p.y) / Math.sqrt((a * a) + 1);
        }
        else {
            dist = Math.abs(p.x - line[n].x);
        }

        // length^2 of line segment
        const rl2 = Math.pow(line[n].y - line[n - 1].y, 2) + Math.pow(line[n].x - line[n - 1].x, 2);

        // distance^2 of pt to end line segment
        const ln2 = Math.pow(line[n].y - p.y, 2) + Math.pow(line[n].x - p.x, 2);

        // distance^2 of pt to begin line segment
        const lnm12 = Math.pow(line[n - 1].y - p.y, 2) + Math.pow(line[n - 1].x - p.x, 2);

        // minimum distance^2 of pt to infinite line
        const dist2 = Math.pow(dist, 2);

        // calculated length^2 of line segment
        const calcrl2 = ln2 - dist2 + lnm12 - dist2;

        // redefine minimum distance to line segment (not infinite line) if necessary
        if (calcrl2 > rl2) {
            dist = Math.sqrt(Math.min(ln2, lnm12));
        }

        if (dist < minDist) {
            if (calcrl2 > rl2) {
                if (lnm12 < ln2) {
                    fTo = 0; // nearer to previous point
                    fFrom = 1;
                }
                else {
                    fTo = 1;
                    fFrom = 0; // nearer to current point
                }
            }
            else {
                // perpendicular from point intersects line segment
                fTo = Math.sqrt(lnm12 - dist2) / Math.sqrt(rl2);
                fFrom = Math.sqrt(ln2 - dist2) / Math.sqrt(rl2);
            }
            minDist = dist;
            i = n;
        }
    }

    const dx = line[i - 1].x - line[i].x;
    const dy = line[i - 1].y - line[i].y;

    const x = line[i - 1].x - (dx * fTo);
    const y = line[i - 1].y - (dy * fTo);

    return { x, y, i, fTo, fFrom };
}
