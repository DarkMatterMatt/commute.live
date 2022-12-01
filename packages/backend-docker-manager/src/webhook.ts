import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { createNodeMiddleware, Webhooks } from "@octokit/webhooks";
import { log } from "./log.js";

type Middleware = ReturnType<typeof createNodeMiddleware>;

export function createWebhookMiddleware(secret: string, workerImage: string, reload: () => void) {
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

export function createHttpsServer(
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
                log("SSL certificate changed, updating server");
                key = newKey;
                cert = newCert;
                server.setSecureContext({ key, cert });
            }
        }, sslRefreshFreq);
    }

    return server;
}

export function createHttpServer(port: number, webhookMiddleware: Middleware) {
    return http.createServer(webhookMiddleware).listen(port);
}
