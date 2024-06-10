import { WebSocketRouteGenerator } from "./WebSocketRoute";

export const pingRoute = new WebSocketRouteGenerator({
    name: "ping",
    requiredParams: [] as const,
    optionalParams: [] as const,
    executor: route => route.finish("success", {
        message: "pong",
    }),
});
