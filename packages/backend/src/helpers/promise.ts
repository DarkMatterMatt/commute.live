/**
 * Create an unresolved promise with resolve and reject functions.
 */
export function createPromise<T>(): [Promise<T>, (value: T | PromiseLike<T>) => void, (reason?: any) => void] {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;

    const promise = new Promise<T>((resolve_, reject_) => {
        resolve = resolve_;
        reject = reject_;
    });

    // @ts-expect-error: resolve & reject variables are assigned during promise creation
    return [promise, resolve, reject];
}
