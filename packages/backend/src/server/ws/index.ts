import { pingRoute } from "./ping.js";
import { subscribeRoute } from "./subscribe.js";
import { unsubscribeRoute } from "./unsubscribe.js";
import { WebSocketRouteGenerator } from "./WebSocketRoute.js";

export const defaultRoute = new WebSocketRouteGenerator({
    name: "default",
    requiredParams: [] as const,
    optionalParams: [] as const,
    executor: route => route.finish("error", {
        message: "Unknown route.",
        availableRoutes: [...routes.keys()],
    }),
});

const routes = new Map([
    pingRoute,
    subscribeRoute,
    unsubscribeRoute,
].map(r => [r.name, r]));

export default routes;
