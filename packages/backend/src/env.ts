import { accessSync, constants } from "node:fs";
import dotenv from "dotenv";
import { bool, cleanEnv, makeValidator, port, str } from "envalid";

type NodeEnv = "development" | "production" | "test";

const nodeEnv = makeValidator(x => str({ choices: ["development", "test", "production"] })._parse(x) as NodeEnv);

const file = makeValidator(x => (accessSync(x, constants.R_OK), x));

dotenv.config();

const env = cleanEnv(process.env, {
    LOG_LEVEL: str({ default: "info", choices: ["error", "warn", "info", "verbose"] }),
    LOG_FILE_TEMPLATE: str({ default: "combined_%DATE%.log" }),
    NODE_ENV: nodeEnv({ default: "development" }),
    PORT: port({ default: 9001 }),
    SSL_CERT_FILE: file({ default: undefined }),
    SSL_KEY_FILE: file({ default: undefined }),
    USE_SSL: bool({ default: false }),
    AUCKLAND_TRANSPORT_KEY: str(),
});

if (env.USE_SSL) {
    if (env.SSL_CERT_FILE === "") {
        throw new Error("env.CERT_FILE_NAME must be set when using SSL.");
    }
    if (env.SSL_KEY_FILE === "") {
        throw new Error("env.KEY_FILE_NAME must be set when using SSL.");
    }
}

export default env;
