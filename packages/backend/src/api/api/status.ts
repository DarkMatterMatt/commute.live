import { GetRouteGenerator } from "./GetRoute.js";

export const statusRoute = new GetRouteGenerator({
    name: "status",
    requiredParams: [] as const,
    optionalParams: [] as const,
    cacheMaxAge: 0,
    executor: (route, { activeWebSockets }) => route.finish("success", {
        activeWebSockets: activeWebSockets.size,
        version: process.env.npm_package_version,
    }),
});
