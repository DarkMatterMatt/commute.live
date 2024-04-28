import { accessSync, constants } from "node:fs";
import { Preconditions } from "@commutelive/common";
import dotenv from "dotenv";
import { bool, cleanEnv, makeValidator, port, str } from "envalid";

const dir = makeValidator(x => (accessSync(x, constants.R_OK), x));
const file = makeValidator(x => (accessSync(x, constants.R_OK), x));

dotenv.config();

const rawEnv = cleanEnv(process.env, {
    ENABLED_REGIONS: makeValidator(x => x ? x.split(",") : "all")({ default: "all" }),
    AUCKLAND_TRANSPORT_KEY: str(),
    NSW_KEY: str(),
    CACHE_DIR: dir({ default: "cache" }),
    FETCH_URL_WHEN_LOADED: str({ default: undefined }),
    LOG_FORMAT: str({ default: "%DATE%.log" }),
    PORT: port({ default: 9001 }),
    SSL_CERT_FILE: file({ default: undefined }),
    SSL_KEY_FILE: file({ default: undefined }),
    USE_SSL: bool({ default: false }),
});

const env = validateSSL(rawEnv);

export default env;

type EnvSSL = Readonly<{
    USE_SSL: true,
    SSL_CERT_FILE: string
    SSL_KEY_FILE: string
} | {
    USE_SSL: false,
    SSL_CERT_FILE?: never
    SSL_KEY_FILE?: never
}>

function validateSSL({
    USE_SSL,
    SSL_CERT_FILE,
    SSL_KEY_FILE,
    ...env
}: typeof rawEnv): Omit<typeof rawEnv, keyof EnvSSL> & EnvSSL {
    const ssl: EnvSSL = USE_SSL ? {
        USE_SSL,
        SSL_CERT_FILE: Preconditions.checkExists(
            SSL_CERT_FILE,
            "env.SSL_CERT_FILE must be set when using SSL, received <>",
        ),
        SSL_KEY_FILE: Preconditions.checkExists(
            SSL_KEY_FILE,
            "env.SSL_KEY_FILE must be set when using SSL, received <>",
        ),
    } : {
        USE_SSL,
    };
    return { ...env, ...ssl };
}
