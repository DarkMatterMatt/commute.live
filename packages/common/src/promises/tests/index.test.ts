import { createPromise } from "..";

describe("createPromise", () => {
    const nextLoop = () => new Promise(r => setTimeout(r, 0));

    it("Creates an unresolved Promise", async () => {
        const [promise] = createPromise<void>();

        // Check if promise is resolved.
        let isResolved = false;
        promise.then(() => isResolved = true);

        await nextLoop();
        expect(isResolved).toBe(false);
    });

    it("Can resolve with a value", async () => {
        const [promise, resolve] = createPromise<number>();

        let val: number | undefined;
        promise.then(v => val = v);

        await nextLoop();
        expect(val).toBe(undefined);

        resolve(1);
        await nextLoop();
        expect(val).toBe(1);
    });

    it("Can reject with a value", async () => {
        const [promise, , reject] = createPromise<number>();

        let val: number | undefined;
        promise.catch(v => val = v);

        await nextLoop();
        expect(val).toBe(undefined);

        reject(1);
        await nextLoop();
        expect(val).toBe(1);
    });
});
