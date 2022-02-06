import { WebSocketRouteGenerator } from "./WebSocketRoute.js";

export const pingRoute = new WebSocketRouteGenerator({
    name: "ping",
    requiredParams: [] as const,
    optionalParams: [] as const,
    executor: route => route.finish("success", {
        message: "pong",
    }),
});
