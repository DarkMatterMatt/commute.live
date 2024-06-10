import { getStatus as getDataSourcesStatus } from "~/datasources/index";
import { GetRouteGenerator } from "./GetRoute";

export const statusRoute = new GetRouteGenerator({
    name: "status",
    requiredParams: [] as const,
    optionalParams: [] as const,
    cacheMaxAge: 0,
    executor: async (route, { activeWebSockets }) => route.finish("success", {
        activeWebSockets: activeWebSockets.size,
        version: process.env.npm_package_version,
        regions: await getDataSourcesStatus(),
    }),
});
