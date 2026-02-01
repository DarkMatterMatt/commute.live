import { Preconditions } from "~/errors";

/**
 * Sleep for the specified number of milliseconds.
 */
export async function sleep(ms: number) {
    Preconditions.assert(ms >= 0);
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}
