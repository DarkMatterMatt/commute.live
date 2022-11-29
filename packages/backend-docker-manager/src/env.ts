import { accessSync, constants } from "node:fs";
import dotenv from "dotenv";
import { bool, cleanEnv, makeValidator, num, port, str } from "envalid";
import { getEnvBind } from "./docker.js";

const file = makeValidator(x => (accessSync(x, constants.R_OK), x));

export async function getEnv() {
    const [, envDir] = (await getEnvBind()).split(":");
    dotenv.config({ path: `${envDir}/.env`, override: true });

    const env = cleanEnv(process.env, {
        MANAGER_PORT: port(),
        MANAGER_INTERNAL_PORT: port(),
        MANAGER_GITHUB_WEBHOOK_SECRET: str(),
        MANAGER_SSL_CERT_CHECK_FREQ: num({ default: 10 * 60 * 1000 }),
        MANAGER_SSL_CERT_FILE: file(),
        MANAGER_SSL_KEY_FILE: file(),
        MANAGER_USE_SSL: bool(),
        MANAGER_WORKER_IMAGE: str(),
        MANAGER_WORKER_NAME: str(),
    });

    if (env.MANAGER_USE_SSL) {
        if (env.MANAGER_SSL_CERT_FILE === "") {
            throw new Error("env.MANAGER_SSL_CERT_FILE must be set when using SSL.");
        }
        if (env.MANAGER_SSL_KEY_FILE === "") {
            throw new Error("env.MANAGER_SSL_KEY_FILE must be set when using SSL.");
        }
    }

    return env;
}

export async function getWorkerEnv() {
    const [, envDir] = (await getEnvBind()).split(":");
    const { error, parsed: parsedEnvFile } = dotenv.config({ path: `${envDir}/.env`, override: true });
    if (error || parsedEnvFile == null) {
        throw error;
    }

    return Object.fromEntries(
        Object.entries(parsedEnvFile)
            .filter(([k]) => !k.startsWith("MANAGER_")),
    );
}
