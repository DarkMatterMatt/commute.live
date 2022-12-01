import { accessSync, constants } from "node:fs";
import dotenv from "dotenv";
import { bool, cleanEnv, makeValidator, port, str } from "envalid";

const file = makeValidator(x => (accessSync(x, constants.R_OK), x));

dotenv.config();

const env = cleanEnv(process.env, {
    FETCH_URL_WHEN_LOADED: str({ default: undefined }),
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
