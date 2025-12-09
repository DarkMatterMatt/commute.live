import type { StatusDataResult } from "@commutelive/common";
import { getStatus as getDataSourcesStatus } from "~/datasources/index";
import { GetRouteGenerator } from "./GetRoute";

export const statusRoute = new GetRouteGenerator<[], [], StatusDataResult>({
    name: "status",
    requiredParams: [],
    optionalParams: [],
    cacheMaxAge: 0,
    executor: async (route, { activeWebSockets, regions }) => route.finish("success", {
        activeWebSockets: activeWebSockets.size,
        version: process.env.npm_package_version,
        regions: await getDataSourcesStatus(regions),
    }),
});
