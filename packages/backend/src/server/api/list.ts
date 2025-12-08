import type { ListRoutesResult } from "@commutelive/common";
import { GetRouteGenerator } from "./GetRoute";

export const listRoute = new GetRouteGenerator<["region"], [], ListRoutesResult>({
    name: "list",
    requiredParams: ["region"],
    optionalParams: [],
    requiresRegion: true,
    executor: async (route, { region }) => {
        if (region == null) {
            throw new Error("Region is expected.");
        }

        const routes = await region.getRoutesSummary();
        return route.finish("success", {
            message: "See routes attached.",
            routes,
        });
    },
});
