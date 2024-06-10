import type { ListRoutesResult } from "@commutelive/common";
import { GetRouteGenerator } from "./GetRoute";

export const listRoute = new GetRouteGenerator({
    name: "list",
    requiredParams: ["region"] as const,
    optionalParams: [] as const,
    requiresRegion: true,
    executor: async (route, { region }) => {
        if (region == null) {
            throw new Error("Region is expected.");
        }

        const routes: ListRoutesResult = await region.getRoutesSummary();
        return route.finish("success", {
            message: "See routes attached.",
            routes,
        });
    },
});
