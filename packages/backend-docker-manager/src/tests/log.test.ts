import { describe, expect, it, jest } from "@jest/globals";
import * as logModule from "../log";

describe("log", () => {
    it("log module can be imported", () => {

        expect(logModule.log).toBeDefined();
        expect(logModule.warn).toBeDefined();
        expect(logModule.error).toBeDefined();

        expect(typeof logModule.log).toBe("function");
        expect(typeof logModule.warn).toBe("function");
        expect(typeof logModule.error).toBe("function");
    });

    it("log functions format messages with timestamp", () => {
        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        logModule.log("test message");

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        const callArgs = consoleLogSpy.mock.calls[0];
        expect(callArgs[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]$/);
        expect(callArgs[1]).toBe("test message");

        consoleLogSpy.mockRestore();
    });

    it("warn function formats messages with timestamp", () => {
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

        logModule.warn("warning message");

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        const callArgs = consoleWarnSpy.mock.calls[0];
        expect(callArgs[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]$/);
        expect(callArgs[1]).toBe("warning message");

        consoleWarnSpy.mockRestore();
    });

    it("error function formats messages with timestamp", () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        logModule.error("error message");

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const callArgs = consoleErrorSpy.mock.calls[0];
        expect(callArgs[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]$/);
        expect(callArgs[1]).toBe("error message");

        consoleErrorSpy.mockRestore();
    });
});
