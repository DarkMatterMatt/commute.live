import http from "node:http";
import { containerExists, pullImage, removeWorker, renameStartingContainer, startWorker } from "./docker.js";
import { getEnv, getWorkerEnv } from "./env.js";
import { log } from "./log.js";
import { createHttpServer, createHttpsServer, createWebhookMiddleware } from "./webhook.js";

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
    maxMemoryInBytes: null | number,
) {
    // this will be resolved when the worker is loaded
    const loaded = new Promise<void>(res => onWorkerLoad = res);

    if (workerImage.includes("/")) {
        log("Downloading updates");
        await pullImage(workerImage);
    }
    else {
        log(`Using local image: ${workerImage}`);
    }

    // start new worker
    log("Starting new worker");
    await removeWorker(`${workerName}-starting`);
    await startWorker(
        workerImage,
        `${workerName}-starting`,
        await getWorkerEnv(),
        `http://localhost:${workerCallbackPort}/`,
        maxMemoryInBytes,
    );

    // wait for worker to load
    log("Waiting for new worker to load");
    await loaded;
    onWorkerLoad = null;

    // stop and remove old worker
    log("Stopping old worker");
    await removeWorker(workerName);

    // rename new "starting" worker to the actual worker name
    await renameStartingContainer(workerName);
    log("Finished graceful reload");
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

(async () => {
    const env = await getEnv();

    const reload = () => requestReloadWorker(
        env.MANAGER_WORKER_IMAGE,
        env.MANAGER_WORKER_NAME,
        env.MANAGER_INTERNAL_PORT,
        env.MANAGER_WORKER_MAX_MEMORY ?? null,
    );

    // listen for workers being loaded
    log("Starting internal listener");
    startInternalListener(env.MANAGER_INTERNAL_PORT, reload);

    // get middleware for handling GitHub webhooks
    const middleware = createWebhookMiddleware(
        env.MANAGER_GITHUB_WEBHOOK_SECRET,
        env.MANAGER_WORKER_IMAGE,
        reload,
    );

    // create server for handling GitHub webhooks
    log("Starting webhook server");
    if (env.MANAGER_USE_SSL) {
        createHttpsServer(
            env.MANAGER_PORT,
            env.MANAGER_SSL_CERT_FILE!,
            env.MANAGER_SSL_KEY_FILE!,
            env.MANAGER_SSL_CERT_CHECK_FREQ,
            middleware,
        );
    }
    else {
        createHttpServer(env.MANAGER_PORT, middleware);
    }

    // make sure the worker exists (note that this doesn't start a stopped worker)
    if (!await containerExists(env.MANAGER_WORKER_NAME)) {
        log("Starting worker");
        await reload();
    }

    log("Initialization complete");
})();
