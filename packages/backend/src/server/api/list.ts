import { GetRouteGenerator } from "./GetRoute.js";

export const listRoute = new GetRouteGenerator({
    name: "list",
    requiredParams: ["region"] as const,
    optionalParams: [] as const,
    requiresRegion: true,
    executor: async (route, { region }) => {
        if (region == null) {
            throw new Error("Region is expected.");
        }

        const data = await region.getRoutesSummary();
        return route.finish("success", {
            message: "See routes attached.",
            routes:  Object.fromEntries(data.entries()),
        });
    },
});
