import { jest } from "@jest/globals";
import { RollingAverageByCount, RollingAverageByTime } from "../RollingAverage";

describe("RollingAverage", () => {
    it("can compute average for `count` window", () => {
        const avg = new RollingAverageByCount(3);
        expect(avg.getAverage()).toBe(NaN);

        avg.add(5); // 5
        expect(avg.getAverage()).toBe(5);

        avg.add(2); // 5, 2
        expect(avg.getAverage()).toBe(7 / 2);

        avg.add(6); // 5, 2, 6
        expect(avg.getAverage()).toBe(13 / 3);

        avg.add(3); // 2, 6, 3
        expect(avg.getAverage()).toBe(11 / 3);
    });

    it("can compute average for `time` window", () => {
        const getTime = jest.fn<() => number>();

        const avg = new RollingAverageByTime(3, getTime);
        expect(avg.getAverage()).toBe(NaN);

        getTime.mockReturnValue(1); // T = 1.
        avg.add(5); // 5
        expect(avg.getAverage()).toBe(5);

        getTime.mockReturnValue(1); // T = 1.
        avg.add(2); // 5, 2
        expect(avg.getAverage()).toBe(7 / 2);

        getTime.mockReturnValue(2); // T = 2.
        avg.add(6); // 5, 2, 6
        expect(avg.getAverage()).toBe(13 / 3);

        getTime.mockReturnValue(3); // T = 3.
        avg.add(3); // 5, 2, 6, 3
        expect(avg.getAverage()).toBe(16 / 4);

        getTime.mockReturnValue(5); // T = 5.
        avg.add(11); // 6, 3, 11
        expect(avg.getAverage()).toBe(20 / 3);

        getTime.mockReturnValue(8); // T = 8.
        // now it should only contain 11
        expect(avg.getAverage()).toBe(11);
    });
});
