import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { removeWorker, renameStartingContainer, startWorker, stopWorker } from "./docker.js";
import { getEnv, getWorkerEnv } from "./env.js";

type Middleware = ReturnType<typeof createNodeMiddleware>;

let restartQueued = false;
let onWorkerLoad: null | (() => void) = null;

async function requestReloadWorker(...args: Parameters<typeof gracefullyReloadWorker>) {
    if (onWorkerLoad != null) {
        restartQueued = true;
        return;
    }

    restartQueued = false;
    await gracefullyReloadWorker(...args);

    if (restartQueued) {
        await requestReloadWorker(...args);
    }
}

async function gracefullyReloadWorker(
    workerImage: string,
    workerName: string,
    workerCallbackPort: number,
) {
    // this will be resolved when the worker is loaded
    const loaded = new Promise<void>(res => onWorkerLoad = res);

    console.log("Starting new worker");
    await startWorker(
        workerImage,
        workerName,
        await getWorkerEnv(),
        `http://localhost:${workerCallbackPort}/`,
    );

    console.log("Waiting for new worker to load");
    await loaded;
    onWorkerLoad = null;

    console.log("Stopping old worker");
    await stopWorker(workerName);
    await removeWorker(workerName);

    await renameStartingContainer(workerName);
    console.log("Finished graceful reload");
}

function startInternalListener(workerCallbackPort: number, reload: () => void) {
    http.createServer((req, res) => {
        if (req.url === "/reload") {
            // development/debugging request to reload the worker
            // not exposed externally
            reload();
            res.writeHead(204);
            res.end();
            return;
        }

        // listen for workers being loaded
        onWorkerLoad?.();
        res.writeHead(204);
        res.end();
    }).listen(workerCallbackPort);
}

function createWebhookMiddleware(secret: string, workerImage: string, reload: () => void) {
    const webhooks = new Webhooks({ secret });

    webhooks.on("ping", () => {
        // listen for pings :)
    });

    webhooks.on("package", ({ payload }) => {
        if (!["docker", "container"].includes(payload.package.package_type.toLowerCase())) {
            return;
        }
        if (!payload.package.package_version.installation_command.includes(workerImage)) {
            return;
        }
        reload();
    });

    return createNodeMiddleware(webhooks, { path: "/" });
}

function createHttpsServer(
    port: number,
    certFile: string,
    keyFile: string,
    sslRefreshFreq: number,
    webhookMiddleware: Middleware,
) {
    let key = fs.readFileSync(keyFile);
    let cert = fs.readFileSync(certFile);
    const server = https.createServer({ key, cert }, webhookMiddleware).listen(port);

    if (sslRefreshFreq > 0) {
        setInterval(async () => {
            const newKey = fs.readFileSync(keyFile);
            const newCert = fs.readFileSync(certFile);
            if (!newKey.equals(key) || !newCert.equals(cert)) {
                console.log("SSL certificate changed, updating server");
                key = newKey;
                cert = newCert;
                server.setSecureContext({ key, cert });
            }
        }, sslRefreshFreq);
    }
}

function createHttpServer(port: number, webhookMiddleware: Middleware) {
    http.createServer(webhookMiddleware).listen(port);
}

(async () => {
    const env = await getEnv();

    const reload = () => requestReloadWorker(
        env.MANAGER_WORKER_IMAGE,
        env.MANAGER_WORKER_NAME,
        env.MANAGER_INTERNAL_PORT,
    );

    // listen for workers being loaded
    startInternalListener(env.MANAGER_INTERNAL_PORT, reload);

    // get middleware for handling GitHub webhooks
    const middleware = createWebhookMiddleware(
        env.MANAGER_GITHUB_WEBHOOK_SECRET,
        env.MANAGER_WORKER_IMAGE,
        reload,
    );

    if (env.MANAGER_USE_SSL) {
        createHttpsServer(
            env.MANAGER_PORT,
            env.MANAGER_SSL_CERT_FILE,
            env.MANAGER_SSL_KEY_FILE,
            env.MANAGER_SSL_CERT_CHECK_FREQ,
            middleware,
        );
    }
    else {
        createHttpServer(env.MANAGER_PORT, middleware);
    }

    await reload();
})();
