import { getLogger } from "~/log";
import type { SqlDatabase } from "~/types";

const log = getLogger("SQLBatcher");

export interface SqlBatcherOpts<T extends any[]>{
    db: SqlDatabase;
    table: string;
    columns: { [K in keyof T]: string }; // array of strings, same length as T
    SQLITE_MAX_VARIABLE_NUMBER?: number;
}

/**
 * Provides bulk insert support for SQLite.
 * @param T Datatype of values for each column.
 */
export class SqlBatcher<T extends any[]>{
    private readonly db: SqlDatabase;
    private readonly table: string;
    private readonly columns: { [K in keyof T]: string };
    private readonly placeholders: any[] = [];
    private readonly values: any[] = [];
    private readonly initialized: Promise<void>;
    private maxVariables = -1;

    /** Create a new SqlBatcher. Values will be inserted into the specified table columns. */
    public constructor({
        db,
        table,
        columns,
        SQLITE_MAX_VARIABLE_NUMBER,
    }: SqlBatcherOpts<T>) {
        this.db = db;
        this.table = table;
        this.columns = columns;

        if (db.readonly) {
            throw new Error("Cannot use SqlBatcher with a readonly database");
        }

        if (SQLITE_MAX_VARIABLE_NUMBER != null) {
            this.maxVariables = SQLITE_MAX_VARIABLE_NUMBER;
        }

        this.initialized = new Promise(r =>
            this.init()
                .then(r)
                .catch(err => {
                    log.error("Failed to initialize SqlBatcher", err);
                    throw err;
                }));
    }

    private async init() {
        if (this.maxVariables === -1) {
            this.maxVariables = await this.findMaxVariables();
        }
    }

    private async findMaxVariables() {
        // Search for MAX_VARIABLE_NUMBER compile option.
        const compileOptions: { compile_options: string }[] = this.db.pragma("compile_options");
        const maxVariables = compileOptions
            .map(row => row.compile_options)
            .find(row => row.startsWith("MAX_VARIABLE_NUMBER="));
        if (maxVariables != null) {
            return Number.parseInt(maxVariables.split("=")[1]);
        }

        // Default is 999 before v3.32.0 (2020-05-22), and 32766 from v3.32.0.
        const sqliteVersion: { version: string } = this.db.prepare("SELECT sqlite_version() AS version").get();
        const parts = sqliteVersion.version
            .split(".")
            .map(part => Number.parseInt(part));
        if (parts.length === 3 && (parts[0] > 3 || (parts[0] === 3 && parts[1] >= 32))) {
            return 32766;
        }
        return 999;
    }

    private async actionBatch() {
        if (this.values.length > 0) {
            this.db.prepare(`
                INSERT INTO ${this.table} (${this.columns.join(", ")})
                VALUES ${this.placeholders.join(",")}
            `).run(...this.values);
        }

        // clear arrays
        this.values.length = 0;
        this.placeholders.length = 0;
    }

    public async queue(...items: T) {
        await this.initialized;

        if (this.columns.length !== items.length) {
            log.error("Incorrect number of items", { expected: this.columns, received: items });
            throw new Error(`Expected ${this.columns.length} items, got ${items.length}`);
        }

        this.placeholders.push(`(${this.columns.map(() => "?").join(", ")})`);
        this.values.push(...items);

        // have filled up this batch, insert them now
        if (this.values.length + items.length > this.maxVariables) {
            await this.actionBatch();
        }
    }

    public async flush() {
        await this.initialized;
        await this.actionBatch();
    }
}
