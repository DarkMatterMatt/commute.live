import type { StrOrNull } from "~/types";
import { GetRouteGenerator } from "./GetRoute.js";

interface RouteData {
    longNames: [StrOrNull, StrOrNull];
    shortName: string;
    type: number;
}

export const listRoute = new GetRouteGenerator({
    name: "list",
    requiredParams: ["region"] as const,
    optionalParams: [] as const,
    executor: async (route, { getRegion, params: { region } }) => {
        const ds = getRegion(region);
        if (ds == null) {
            return route.finish("error", {
                message: `Invalid region: ${region}`,
            });
        }

        const data: Map<string, RouteData> = await ds.getRoutesSummary();

        return route.finish("success", {
            message: "See routes attached",
            routes:  Object.fromEntries(data.entries()),
        });
    },
});
