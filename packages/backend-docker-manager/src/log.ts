export function log(...args: any[]) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

export function warn(...args: any[]) {
    console.warn(`[${new Date().toISOString()}]`, ...args);
}

export function error(...args: any[]) {
    console.error(`[${new Date().toISOString()}]`, ...args);
}

process.on("unhandledRejection", err => {
    error("unhandledRejection", err);
});

process.on("uncaughtException", err => {
    error("uncaughtException", err);
});
