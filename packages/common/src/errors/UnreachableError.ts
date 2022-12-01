export class UnreachableError extends Error {
    constructor(arg: never) {
        super(`Received unexpected value for switch statement: ${arg}`);
    }
}
