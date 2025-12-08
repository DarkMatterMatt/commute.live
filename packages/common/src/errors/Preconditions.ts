export class PreconditionError extends Error { }

/**
 * Throws error if `obj` is nullish.
 * @param messageTemplate Error message to throw, replacing `<>` with the stringified object.
 */
export function checkExists<T>(obj: T | null | undefined, messageTemplate = "Object is <>"): NonNullable<T> {
    if (obj == null) {
        throw new PreconditionError(messageTemplate.replace("<>", `${obj}`));
    }
    return obj;
}

/**
 * Throws error if `assertion` is not true.
 * @param message Error message to throw.
 */
export function assert(assertion: boolean, message = "Assertion failed."): asserts assertion {
    if (assertion !== true) {
        throw new PreconditionError(message);
    }
}
