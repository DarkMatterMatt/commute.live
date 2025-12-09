import { jest } from "@jest/globals";
import { ReplayTimeline } from "../ReplayTimeline";

describe("ReplayTimeline", () => {
    it("executes callback when advancing to scheduled time", async () => {
        const timeline = new ReplayTimeline<string>();
        const callback = jest.fn(() => { });

        timeline.queueAt(100, "event1", callback);
        await timeline.advanceTo(100);

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not execute callback before scheduled time", async () => {
        const timeline = new ReplayTimeline<string>();
        const callback = jest.fn(() => { });

        timeline.queueAt(100, "event1", callback);
        await timeline.advanceTo(50);

        expect(callback).not.toHaveBeenCalled();
    });

    it("only executes last callback when same ID is queued multiple times", async () => {
        const timeline = new ReplayTimeline<string>();
        const callback1 = jest.fn(() => { });
        const callback2 = jest.fn(() => { });
        const callback3 = jest.fn(() => { });

        timeline.queueAt(100, "event1", callback1);
        timeline.queueAt(100, "event1", callback2);
        timeline.queueAt(100, "event1", callback3);

        await timeline.advanceTo(100);

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
        expect(callback3).toHaveBeenCalledTimes(1);
    });

    it("executes all callbacks with different IDs", async () => {
        const timeline = new ReplayTimeline<string>();
        const callback1 = jest.fn(() => { });
        const callback2 = jest.fn(() => { });
        const callback3 = jest.fn(() => { });

        timeline.queueAt(50, "event1", callback1);
        timeline.queueAt(100, "event2", callback2);
        timeline.queueAt(150, "event3", callback3);

        await timeline.advanceTo(200);

        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
        expect(callback3).toHaveBeenCalledTimes(1);
    });
});
