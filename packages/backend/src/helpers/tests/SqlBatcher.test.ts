import { jest } from "@jest/globals";
import type { SqlDatabase } from "~/types";
import { SqlBatcher } from "../SqlBatcher";

function createMockDb(): SqlDatabase {
    const preparedStatements: any[] = [];

    return {
        readonly: false,
        pragma: jest.fn(() => [
            { compile_options: "MAX_VARIABLE_NUMBER=999" },
        ]),
        prepare: jest.fn((sql: string) => {
            const stmt = {
                sql,
                get: jest.fn(() => ({ version: "3.40.0" })),
                run: jest.fn((...args: any[]) => {
                    preparedStatements.push({ sql, args });
                }),
            };
            return stmt;
        }),
    } as any;
}

describe("SqlBatcher", () => {
    it("throws error when database is readonly", () => {
        const db = createMockDb();
        db.readonly = true;

        expect(() => {
            new SqlBatcher({
                db,
                table: "test_table",
                columns: ["col1", "col2"],
            });
        }).toThrow("Cannot use SqlBatcher with a readonly database");
    });

    it("queues and flushes items to database", async () => {
        const db = createMockDb();
        const runSpy = jest.fn();
        (db.prepare as any).mockReturnValue({
            get: jest.fn(() => ({ version: "3.40.0" })),
            run: runSpy,
        });

        const batcher = new SqlBatcher({
            db,
            table: "test_table",
            columns: ["col1", "col2"],
        });

        await batcher.queue("value1", "value2");
        await batcher.queue("value3", "value4");
        await batcher.flush();

        expect(runSpy).toHaveBeenCalledWith("value1", "value2", "value3", "value4");
    });

    it("throws error when queueing wrong number of items", async () => {
        const db = createMockDb();

        const batcher = new SqlBatcher({
            db,
            table: "test_table",
            columns: ["col1", "col2"],
        });

        await expect(batcher.queue("value1")).rejects.toThrow("Expected 2 items, got 1");
        await expect(batcher.queue("value1", "value2", "value3")).rejects.toThrow("Expected 2 items, got 3");
    });
});
