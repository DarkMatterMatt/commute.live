import { Readable, Writable } from "node:stream";
import { pipeStreamTo } from "../stream";

describe("pipeStreamTo", () => {
    it("resolves when stream ends successfully", async () => {
        const input = new Readable({
            read() {
                this.push("test data");
                this.push(null); // End the stream
            },
        });

        const chunks: Buffer[] = [];
        const output = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(chunk);
                callback();
            },
        });

        await pipeStreamTo(input, output);

        expect(chunks.length).toBeGreaterThan(0);
        expect(Buffer.concat(chunks).toString()).toBe("test data");
    });

    it("rejects when output stream has an error", async () => {
        const input = new Readable({
            read() {
                this.push("test data");
            },
        });

        const output = new Writable({
            write(_chunk, _encoding, callback) {
                callback(new Error("Write failed"));
            },
        });

        await expect(pipeStreamTo(input, output)).rejects.toThrow("Write failed");
    });
});
