import type { RegionResult } from "@commutelive/common";
import { GetRouteGenerator } from "./GetRoute.js";

export const regionRoute = new GetRouteGenerator({
    name: "region",
    requiredParams: ["region"] as const,
    optionalParams: [] as const,
    requiresRegion: true,
    executor: async (route, { region }) => {
        if (region == null) {
            throw new Error("Region is expected.");
        }

        const result: RegionResult = region;

        return route.finish("success", {
            message: "See region attached.",
            result,
        });
    },
});
