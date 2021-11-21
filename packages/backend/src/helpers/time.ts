import { createPromise } from "./";

/**
 * Sleep for the specified number of milliseconds.
 */
export async function sleep(ms: number) {
    const [promise, resolve] = createPromise<void>();
    setTimeout(resolve, ms);
    return promise;
}
