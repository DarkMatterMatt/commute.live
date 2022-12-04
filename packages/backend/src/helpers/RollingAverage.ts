import { UnreachableError } from "@commutelive/common";
import { Queue } from "./Queue";

interface RollingAverageOpts {
    /** Number of values/time in milliseconds to average over. */
    windowSize: number;

    /**
     * Type of sliding window:
     * - `count` sets a maximum number of elements.
     * - `time` sets a maximum age in milliseconds.
     */
    windowType: "count" | "time";
}

export class RollingAverage {
    private readonly queue = new Queue<[number, number]>();
    private sum = 0;
    private readonly windowSize: number;
    private readonly windowType: "count" | "time";

    public constructor(opts: RollingAverageOpts) {
        this.windowSize = opts.windowSize;
        this.windowType = opts.windowType;
    }

    public add(value: number) {
        this.queue.add([Date.now(), value]);
        this.sum += value;

        this.update();
    }

    /**
     * Returns the average of the values in the window, or `NaN` if the window is empty.
     */
    public getAverage() {
        this.update();
        return this.sum / this.queue.size();
    }
    public size() {
        this.update();
        return this.queue.size();
    }

    private remove(): void {
        const [, value] = this.queue.remove();
        this.sum -= value;
    }

    private update(): void {
        switch (this.windowType) {
            case "count": {
                while (this.queue.size() > this.windowSize) {
                    this.remove();
                }
                break;
            }
            case "time": {
                const now = Date.now();
                while (this.queue.size() > 0 && this.queue.element()[0] < now - this.windowSize) {
                    this.remove();
                }
                break;
            }
            default:
                throw new UnreachableError(this.windowType);
        }
    }
}
