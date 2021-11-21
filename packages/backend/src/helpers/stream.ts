import { createPromise } from "./";

/**
 * Stream from `ReadableStream` to a `WritableStream`.
 */
export function pipeStreamTo(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): Promise<void> {
    const [promise, resolve, reject] = createPromise<void>();

    input.pipe(output);
    input.on("end", resolve);
    output.on("error", reject);

    return promise;
}
