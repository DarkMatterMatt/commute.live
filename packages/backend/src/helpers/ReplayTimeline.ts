import { PromiseOr } from "~/types";
import { Queue } from "./Queue.js";

/**
 * ReplayTimeline is used when replaying realtime events.
 *
 * Schedule a callback function to occur after a certain amount of time with
 * `queueAt(time, id, callback)`. Adding a new callback for the same id will
 * replace the old one. Callbacks are only executed when `advanceTo(time)` is called.
 */
export class ReplayTimeline<T> {
    private readonly counter = new Map<T, number>();
    private readonly list = new Queue<[number, T, () => PromiseOr<void>]>();

    public async advanceTo(time: number) {
        let next = this.list.peek();
        while (next != null && next[0] <= time) {
            this.list.poll();

            const [, id, cb] = next;
            const currentCount = this.counter.get(id);
            if (currentCount == null ) {
                throw new Error(`ReplayTimeline: advanceTo: counter for ${id} is null`);
            }

            if (currentCount > 1) {
                this.counter.set(id, currentCount - 1);
            }
            else {
                this.counter.delete(id);
                await cb();
            }

            next = this.list.peek();
        }
    }

    public queueAt(time: number, id: T, cb: () => PromiseOr<void>) {
        this.list.offer([time, id, cb]);
        this.counter.set(id, (this.counter.get(id) ?? 0) + 1);
    }
}
