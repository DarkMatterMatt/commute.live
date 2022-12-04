import { URLSearchParams } from "node:url";
import Graceful from "node-graceful";
import uWS, { type us_listen_socket, type WebSocket } from "uWebSockets.js";
import { getStatus as getDataSourcesStatus, getMQTTForTripUpdates, getMQTTForVehicleUpdates } from "~/datasources/";
import env from "~/env.js";
import { getLogger } from "~/log.js";
import type { DataSource, RegionCode, TripUpdate, VehiclePosition } from "~/types";
import apiRoutes, { defaultRoute as defaultApiRoute } from "./api/";
import { convertTripUpdate, convertVehiclePosition } from "./transmission";
import wsRoutes, { defaultRoute as defaultWsRoute } from "./ws/";

const WS_CODE_CLOSE_GOING_AWAY = 1001;

const log = getLogger("server");

export interface StartOpts {
    availableRegions: RegionCode[];
    getRegion: (region: string) => DataSource | null;
}

const app = env.USE_SSL ? uWS.SSLApp({
    key_file_name: env.SSL_KEY_FILE,
    cert_file_name: env.SSL_CERT_FILE,
}) : uWS.App();

export async function startServer({ availableRegions, getRegion }: StartOpts): Promise<void> {
    const activeWebSockets = new Set<WebSocket>();
    let listenSocket: us_listen_socket;

    Graceful.on("exit", async () => {
        log.debug("Current status.", {
            activeWebSockets: activeWebSockets.size,
            version: process.env.npm_package_version,
            regions: await getDataSourcesStatus(),
        });

        for (const ws of activeWebSockets.values()) {
            ws.end(WS_CODE_CLOSE_GOING_AWAY, "Server is shutting down");
        }
        uWS.us_listen_socket_close(listenSocket);
    });

    app.ws("/v3/websocket", {
        open: ws => {
            activeWebSockets.add(ws);
        },

        close: ws => {
            activeWebSockets.delete(ws);
        },

        message: (ws, message) => {
            if (!message.byteLength) {
                ws.send(JSON.stringify({
                    status:  "error",
                    message: "No data received. Expected data in a JSON format.",
                }));
                return;
            }
            let json;
            try {
                json = JSON.parse(new TextDecoder("utf8").decode(message));
                if (typeof json !== "object" || json == null) {
                    throw new Error("Expected an object.");
                }
            }
            catch {
                ws.send(JSON.stringify({
                    status:  "error",
                    message: "Invalid JSON data received.",
                }));
                return;
            }

            const { route: routeName, seq } = json;
            delete json.route;
            delete json.seq;

            if (typeof routeName !== "string" || routeName === "") {
                ws.send(JSON.stringify({
                    status:  "error",
                    message: "Missing required field: route.",
                }));
                return;
            }

            if (typeof seq !== "number") {
                ws.send(JSON.stringify({
                    status:  "error",
                    message: "Missing required field: seq.",
                }));
                return;
            }

            const route = wsRoutes.get(routeName) || defaultWsRoute;
            route.createRoute({ params: json, seq, ws })
                .execute({
                    activeWebSockets,
                    availableRegions,
                    getRegion,
                });
        },
    });

    app.get("/v3/:route", (res, req) => {
        const routeName = req.getParameter(0);
        const params = Object.fromEntries(new URLSearchParams(req.getQuery()));
        const headers: Record<string, string> = {};
        req.forEach((k, v) => headers[k] = v);

        const route = apiRoutes.get(routeName) || defaultApiRoute;
        route.createRoute({ headers, params, res })
            .execute({
                activeWebSockets,
                availableRegions,
                getRegion,
            });
    });

    app.any("/generate_204", res => {
        res.writeStatus("204 No Content").end();
    });

    app.any("/*", res => {
        res.writeStatus("404 Not Found");
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
            status:  "error",
            message: "404 Not Found.",
        }));
    });

    app.listen(env.PORT, token => {
        if (token) {
            listenSocket = token;
            log.info(`Listening to port ${env.PORT}.`);
        }
    });
}

export function publishVehiclePosition(region: string, shortName: string, vp: VehiclePosition): void {
    const mqtt = getMQTTForVehicleUpdates(region, shortName);
    const data = JSON.stringify(convertVehiclePosition(region, shortName, vp));
    app.publish(mqtt, data);
}

export function publishTripUpdate(region: string, shortName: string, tu: TripUpdate): void {
    const mqtt = getMQTTForTripUpdates(region, shortName);
    const data = JSON.stringify(convertTripUpdate(region, shortName, tu));
    app.publish(mqtt, data);
}
