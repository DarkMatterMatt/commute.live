import { describe, expect, it } from "@jest/globals";
import { MANAGER_ID } from "../docker";

describe("docker", () => {
    it("MANAGER_ID is defined and is a string", () => {
        expect(MANAGER_ID).toBeDefined();
        expect(typeof MANAGER_ID).toBe("string");
        expect(MANAGER_ID.length).toBeGreaterThan(0);
    });

    it("MANAGER_ID matches hostname format", () => {
        // Hostname should be alphanumeric with possible hyphens and dots
        expect(MANAGER_ID).toMatch(/^[a-zA-Z0-9.-]+$/);
    });
});
