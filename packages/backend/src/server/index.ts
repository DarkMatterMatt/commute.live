import { URLSearchParams } from "node:url";
import type { Id, RegionCode } from "@commutelive/common";
import Graceful from "node-graceful";
import uWS, { type us_listen_socket, type WebSocket } from "uWebSockets.js";
import { getStatus as getDataSourcesStatus, getMQTTForTripUpdates, getMQTTForVehicleUpdates } from "~/datasources/";
import env from "~/env.js";
import { getLogger } from "~/log.js";
import type { DataSource, TripUpdate, VehiclePosition } from "~/types";
import apiRoutes, { defaultRoute as defaultApiRoute, initialize as initializeGetRoutes } from "./api/";
import type { GetRouteInitializeOpts } from "./api/GetRoute";
import { convertTripUpdate, convertVehiclePosition } from "./transmission";
import wsRoutes, { defaultRoute as defaultWsRoute, initialize as initializeWsRoutes } from "./ws/";
import type { WebSocketRouteInitializeOpts } from "./ws/WebSocketRoute";

const WS_CODE_CLOSE_GOING_AWAY = 1001;

const log = getLogger("server");

export interface StartOpts {
    availableRegions: RegionCode[];
    getRegion: (region: string) => DataSource | null;
    regions: DataSource[];
    initializeGetRouteOpts: GetRouteInitializeOpts;
    initializeWebSocketRouteOpts: WebSocketRouteInitializeOpts;
}

const app = env.USE_SSL ? uWS.SSLApp({
    key_file_name: env.SSL_KEY_FILE,
    cert_file_name: env.SSL_CERT_FILE,
}) : uWS.App();

export async function startServer({
    availableRegions,
    getRegion,
    regions,
    initializeGetRouteOpts,
    initializeWebSocketRouteOpts,
}: StartOpts): Promise<void> {
    await initializeGetRoutes(initializeGetRouteOpts);
    await initializeWsRoutes(initializeWebSocketRouteOpts);

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
                    status: "error",
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
                    status: "error",
                    message: "Invalid JSON data received.",
                }));
                return;
            }

            const { route: routeName, seq } = json;
            delete json.route;
            delete json.seq;

            if (typeof routeName !== "string" || routeName === "") {
                ws.send(JSON.stringify({
                    status: "error",
                    message: "Missing required field: route.",
                }));
                return;
            }

            if (typeof seq !== "number") {
                ws.send(JSON.stringify({
                    status: "error",
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
                    regions,
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
                regions,
            });
    });

    app.any("/*", res => {
        res.writeStatus("404 Not Found");
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
            status: "error",
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

export function publishVehiclePosition(id: Id, vp: VehiclePosition): void {
    const mqtt = getMQTTForVehicleUpdates(id);
    const data = JSON.stringify(convertVehiclePosition(id, vp));
    app.publish(mqtt, data);
}

export function publishTripUpdate(id: Id, tu: TripUpdate): void {
    const mqtt = getMQTTForTripUpdates(id);
    const data = JSON.stringify(convertTripUpdate(id, tu));
    app.publish(mqtt, data);
}
