// Reference the DOM lib to get the setTimeout type
/// <reference lib="DOM" />

/**
 * Sleep for the specified number of milliseconds.
 */
export async function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}
