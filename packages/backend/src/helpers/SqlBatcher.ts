import { SqlDatabase } from "gtfs/@types";

const MAX_INSERT_VARIABLES = 800;

export interface SqlBatcherOpts<T extends any[]>{
    db: SqlDatabase;
    table: string;
    columns: { [K in keyof T]: string }; // array of strings, same length as T
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

    /** Create a new SqlBatcher. Values will be inserted into the specified table columns. */
    public constructor({ db, table, columns }: SqlBatcherOpts<T>) {
        this.db = db;
        this.table = table;
        this.columns = columns;
    }

    private async actionBatch() {
        if (this.values.length > 0) {
            await this.db.run(`
                INSERT INTO ${this.table} (${this.columns.join(", ")})
                VALUES ${this.placeholders.join(",")}
            `, this.values);
        }

        // clear arrays
        this.values.length = 0;
        this.placeholders.length = 0;
    }

    public async queue(...items: T) {
        this.placeholders.push(`(${this.columns.map(() => "?").join(", ")})`);
        this.values.push(...items);

        // have filled up this batch, insert them now
        if (this.values.length + items.length > MAX_INSERT_VARIABLES) {
            await this.actionBatch();
        }
    }

    public async flush() {
        this.actionBatch();
    }
}
