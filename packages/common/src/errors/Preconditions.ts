export class PreconditionError extends Error {}

export function checkExists<T>(obj: T | null | undefined): NonNullable<T> {
    if (obj == null) {
        throw new PreconditionError(`Object is ${obj}`);
    }
    return obj;
}
