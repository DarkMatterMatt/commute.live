import { Queue } from "./Queue";

abstract class RollingAverage<T = void> {
    private readonly queue = new Queue<[number, T]>();
    private sum = 0;

    public add(value: number, data: T): void {
        this.addElement(value, data);
    }

    protected addElement(value: number, data: T): void {
        this.queue.add([value, data]);
        this.sum += value;

        this.update();
    }

    /**
     * Returns the average (mean) of the values in the window, or `NaN` if the window is empty.
     */
    public getAverage(): number {
        this.update();
        return this.sum / this.queue.size();
    }

    /**
     * Return the number of elements being averaged.
     */
    public getSize(): number {
        this.update();
        return this.queue.size();
    }

    private removeOldest(): void {
        const [value] = this.queue.remove();
        this.sum -= value;
    }

    protected update(): void {
        while (this.queue.size() > 0 && !this.isElementValid(this.queue.element()[1], this.queue.size())) {
            this.removeOldest();
        }
    }

    /**
     * Returns true if the rolling average should keep the element.
     */
    protected abstract isElementValid(data: T, queueSize: number): boolean
}

export class RollingAverageByCount extends RollingAverage {
    public constructor(
        private readonly windowSize: number,
    ) {
        super();
    }

    protected override isElementValid(_: void, queueSize: number) {
        return queueSize <= this.windowSize;
    }
}

export class RollingAverageByTime extends RollingAverage<number> {
    public constructor(
        private readonly windowSizeInMs: number,
        private readonly getTime = Date.now,
    ) {
        super();
    }

    public override add(value: number): void {
        this.addElement(value, this.getTime());
    }

    override isElementValid(timeAdded: number): boolean {
        return timeAdded >= this.getTime() - this.windowSizeInMs;
    }
}
