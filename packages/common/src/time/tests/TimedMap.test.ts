import { type ClearTimeout, type SetTimeout, TimedMap, type TimedMapOpts, type TimerId } from "..";

describe("TimedMap", () => {
    const setup = <K = string, V = number>(partialOpts?: TimedMapOpts<K, V>) => {
        const setTimeout = jest.fn<TimerId, Parameters<SetTimeout>>();
        const clearTimeout = jest.fn<TimerId, Parameters<ClearTimeout>>();
        const timedMap = new TimedMap<K, V>(partialOpts, setTimeout as unknown as SetTimeout, clearTimeout);

        return { timedMap, setTimeout, clearTimeout };
    };

    describe("constructor", () => {
        it("Can override the default TTL", () => {
            const { timedMap, setTimeout } = setup({ defaultTtl: 30 * 1000 });
            expect(timedMap.defaultTtl).toBe(30 * 1000);

            timedMap.set("key1", 1);
            expect(setTimeout).toHaveBeenCalledTimes(1);
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 30 * 1000);
        });

        it("Can initialize with existing data", () => {
            const customTtl = 20 * 1000;
            const { timedMap, setTimeout } = setup({ entries: [["key1", [customTtl, 1]], ["key2", 2]] });

            const entries = [...timedMap.entries()];
            expect(entries.length).toBe(2);
            expect(entries.sort((a, b) => a[0].localeCompare(b[0]))).toEqual([["key1", 1], ["key2", 2]]);

            expect(setTimeout).toHaveBeenCalledTimes(2);
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), timedMap.defaultTtl);
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), customTtl);
        });
    });

    describe("clear", () => {
        it("Can clear items", () => {
            const { timedMap, setTimeout, clearTimeout } = setup();

            let timerId = 7;
            setTimeout.mockImplementation(() => timerId++ as unknown as TimerId);

            timedMap.set("key1", 1);
            timedMap.set("key2", 2);
            timedMap.set("key3", 3);
            expect(clearTimeout).toHaveBeenCalledTimes(0);

            timedMap.clear();
            expect(clearTimeout).toHaveBeenCalledTimes(3);
            expect(clearTimeout).toHaveBeenNthCalledWith(1, 7);
            expect(clearTimeout).toHaveBeenNthCalledWith(2, 8);
            expect(clearTimeout).toHaveBeenNthCalledWith(3, 9);

            expect(timedMap.size).toBe(0);
            expect(timedMap.has("key1")).toBe(false);
            expect(timedMap.has("key2")).toBe(false);
            expect(timedMap.has("key3")).toBe(false);
        });
    });

    describe("delete", () => {
        it("Can remove an item", () => {
            const { timedMap, setTimeout, clearTimeout } = setup();

            const timerId: TimerId = Symbol() as unknown as TimerId;
            setTimeout.mockImplementationOnce(() => timerId);

            timedMap.set("key1", 1);
            expect(clearTimeout).toHaveBeenCalledTimes(0);

            timedMap.delete("key1");
            expect(clearTimeout).toHaveBeenCalledTimes(1);
            expect(clearTimeout).toHaveBeenLastCalledWith(timerId);

            expect(timedMap.has("key1")).toBe(false);
            expect(timedMap.get("key1", "default")).toBe("default");
        });

        it("Returns boolean indicating if the item existed", () => {
            const { timedMap } = setup();

            expect(timedMap.delete("key1")).toBe(false);

            timedMap.set("key1", 1);
            expect(timedMap.delete("key1")).toBe(true);
        });
    });

    describe("get", () => {
        it("Can store simple values", () => {
            const { timedMap } = setup();
            expect(timedMap.get("key1")).toBe(undefined);

            timedMap.set("key1", 1);
            expect(timedMap.get("key1")).toBe(1);
        });

        it("Can store nullish values", () => {
            const { timedMap } = setup<string, any>();

            timedMap.set("key1", null);
            expect(timedMap.get("key1")).toBe(null);

            timedMap.set("key2", undefined);
            expect(timedMap.get("key2")).toBe(undefined);
        });

        it("Can return a custom value if the key doesn't exist", () => {
            const { timedMap } = setup();
            expect(timedMap.get("key1", "default")).toBe("default");

            timedMap.set("key1", 1);
            expect(timedMap.get("key1", "default")).toBe(1);
        });
    });

    describe("has", () => {
        it("Detects when items have been set", () => {
            const { timedMap } = setup();
            expect(timedMap.has("key1")).toBe(false);

            timedMap.set("key1", 1);
            expect(timedMap.has("key1")).toBe(true);

            timedMap.set("key1", 1);
            expect(timedMap.has("key1")).toBe(true);

            timedMap.set("key2", 2);
            expect(timedMap.has("key2")).toBe(true);

            timedMap.delete("key2");
            expect(timedMap.has("key2")).toBe(false);

            timedMap.delete("key1");
            expect(timedMap.has("key1")).toBe(false);
        });

        it("Can store nullish values", () => {
            const { timedMap } = setup<string, any>();

            timedMap.set("key1", null);
            expect(timedMap.has("key1")).toBe(true);

            timedMap.set("key2", undefined);
            expect(timedMap.has("key2")).toBe(true);
        });

        it("Evicts items after some time", () => {
            const { timedMap, setTimeout } = setup({ defaultTtl: 30 * 1000 });

            timedMap.set("key1", 1);
            expect(timedMap.has("key1")).toBe(true);

            // Execute the setTimeout callback, i.e. some time has elapsed.
            setTimeout.mock.calls[0][0]();

            expect(timedMap.has("key1")).toBe(false);
        });
    });

    describe("set", () => {
        it("Can set items", () => {
            const { timedMap, setTimeout } = setup({ defaultTtl: 30 * 1000 });

            // Check `timedMap.set` is chainable & setTimeout is correctly called.
            const result = timedMap.set("key1", 1);
            expect(result).toBe(timedMap);
            expect(setTimeout).toHaveBeenCalledTimes(1);
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 30 * 1000);

            timedMap.set("key2", 2);
            expect(setTimeout).toHaveBeenCalledTimes(2);
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 30 * 1000);
        });

        it("Can set items with a custom TTL", () => {
            const { timedMap, setTimeout } = setup({ defaultTtl: 30 * 1000 });

            timedMap.set("key1", 1, 20 * 1000);
            expect(setTimeout).toHaveBeenCalledTimes(1);
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 20 * 1000);
        });

        it("Resets the timeout when updating a key", () => {
            const { timedMap, setTimeout, clearTimeout } = setup();

            const timerId: TimerId = Symbol() as unknown as TimerId;
            setTimeout.mockImplementationOnce(() => timerId);

            timedMap.set("key1", 1);
            expect(setTimeout).toHaveBeenCalledTimes(1);
            expect(clearTimeout).toHaveBeenCalledTimes(0);

            timedMap.set("key1", 1);
            expect(setTimeout).toHaveBeenCalledTimes(2);
            expect(clearTimeout).toHaveBeenCalledTimes(1);
            expect(clearTimeout).toHaveBeenLastCalledWith(timerId);
        });
    });

    describe("size", () => {
        it("Knows its own size", () => {
            const { timedMap } = setup();
            expect(timedMap.size).toBe(0);

            timedMap.set("key1", 1);
            expect(timedMap.size).toBe(1);

            timedMap.set("key1", 1);
            expect(timedMap.size).toBe(1);

            timedMap.set("key2", 2);
            expect(timedMap.size).toBe(2);

            timedMap.delete("key2");
            expect(timedMap.size).toBe(1);

            timedMap.delete("key1");
            expect(timedMap.size).toBe(0);
        });
    });

    describe("entries", () => {
        it("Returns entries when not empty", () => {
            const { timedMap } = setup();
            timedMap.set("key1", 1);
            timedMap.set("key2", 2);

            const entries = [...timedMap.entries()];
            expect(entries.length).toBe(2);
            expect(entries.sort((a, b) => a[0].localeCompare(b[0]))).toEqual([["key1", 1], ["key2", 2]]);
        });

        it("Returns entries when empty", () => {
            const { timedMap } = setup();
            timedMap.clear();
            expect([...timedMap.entries()]).toEqual([]);
        });
    });

    describe("keys", () => {
        it("Returns keys when not empty", () => {
            const { timedMap } = setup();
            timedMap.set("key1", 1);
            timedMap.set("key2", 2);

            const keys = [...timedMap.keys()];
            expect(keys.length).toBe(2);
            expect(keys.sort()).toEqual(["key1", "key2"]);
        });

        it("Returns keys when empty", () => {
            const { timedMap } = setup();
            timedMap.clear();
            expect([...timedMap.keys()]).toEqual([]);
        });
    });

    describe("values", () => {
        it("Returns values when not empty", () => {
            const { timedMap } = setup();
            timedMap.set("key1", 1);
            timedMap.set("key2", 2);

            const values = [...timedMap.values()];
            expect(values.length).toBe(2);
            expect(values.sort()).toEqual([1, 2]);
        });

        it("Returns values when empty", () => {
            const { timedMap } = setup();
            timedMap.clear();
            expect([...timedMap.values()]).toEqual([]);
        });
    });

    describe("iterator", () => {
        it("Is iterable when not empty", () => {
            const { timedMap } = setup<string, number>();
            timedMap.set("key1", 1);
            timedMap.set("key2", 2);

            const entries: [string, number][] = [];
            for (const kv of timedMap) {
                entries.push(kv);
            }
            expect(entries.length).toBe(2);
            expect(entries.sort((a, b) => a[0].localeCompare(b[0]))).toEqual([["key1", 1], ["key2", 2]]);
        });

        it("Is iterable when empty", () => {
            const { timedMap } = setup();
            timedMap.clear();
            for (const _ of timedMap) {
                fail();
            }
        });
    });

    describe("forEach", () => {
        it("Is iterable using forEach when not empty", () => {
            const { timedMap } = setup<string, number>();
            timedMap.set("key1", 1);
            timedMap.set("key2", 2);

            const entries: [string, number][] = [];
            timedMap.forEach((v, k) => entries.push([k, v]));
            expect(entries.length).toBe(2);
            expect(entries.sort((a, b) => a[0].localeCompare(b[0]))).toEqual([["key1", 1], ["key2", 2]]);
        });

        it("Is iterable using forEach when empty", () => {
            const { timedMap } = setup();
            timedMap.clear();
            timedMap.forEach(() => fail());
        });
    });
});
