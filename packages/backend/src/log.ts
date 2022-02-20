import chalk from "chalk";
import { createLogger, format, transports } from "winston";
import { inspect } from "util";
import { SPLAT } from "triple-beam";
import jsonStringify_ from "fast-safe-stringify";
import "winston-daily-rotate-file";

const colors = {
    error: "redBright",
    warn: "yellowBright",
    info: "greenBright",
    http: "greenBright",
    verbose: "cyanBright",
};

type Colour = keyof typeof colors;

const isPrimitive = (val: any) => val === null || (typeof val !== "object" && typeof val !== "function");

const formatWithInspect = (val: any): string => {
    if (typeof val === "string") {
        return val;
    }
    const newLine = isPrimitive(val) ? "" : "\n";
    return newLine + inspect(val, { depth: null, colors: true });
};

export const colorize = (color: string, s: string): string => {
    if (!color) {
        return s;
    }
    // Chalk is designed to be indexed by a string
    const bold = (chalk.bold as unknown) as Record<string, (s: string) => string>;
    if (typeof bold[color] !== "function") {
        throw new Error(`Invalid console text color: '${color}'`);
    }
    return bold[color](s);
};

const jsonStringifyErrors = (_key: string, value: any) => {
    if (value instanceof Error) {
        return Object.fromEntries(Object.entries(value));
    }
    return value;
};

const jsonStringify = (obj: any) => jsonStringify_(obj, jsonStringifyErrors);

const log = createLogger({
    transports: [
        new transports.DailyRotateFile({
            level: "info",
            filename: "%DATE%.log",
            maxFiles: "14d",
            format: format.combine(
                format.timestamp(),
                format.errors({ stack: true }),
                format.printf(info => {
                    // SPLAT is always a valid index for TransformableInfo
                    const splatArgs = info[SPLAT as any];
                    if (splatArgs) {
                        const messagesArr = [info.message].concat(splatArgs);
                        // this is NOT a string but jsonStringify isn't fussy
                        info.message = messagesArr as any;
                    }
                    return jsonStringify(info);
                }),
            ),
        }),
        new transports.Console({
            level:  "debug",
            format: format.combine(
                format.timestamp({ format: "MMM DD, HH:mm:ss" }),
                format.printf(info => {
                    const label: string = info.label ?? "";
                    const coloredLabelLevel = colorize(colors[info.level as Colour], `${label}:${info.level}`);
                    const msg = formatWithInspect(info.message);
                    // SPLAT is always a valid index for TransformableInfo
                    const splatArgs = info[(SPLAT as unknown) as string] || [];
                    const rest = splatArgs.map(formatWithInspect).join(" ");
                    return `${info.timestamp}  ${coloredLabelLevel}  ${msg} ${rest}`;
                }),
            ),
        }),
    ],
});

export function getLogger(label: string) {
    return log.child({ label });
}
