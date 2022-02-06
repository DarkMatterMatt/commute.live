import { GetRouteGenerator } from "./GetRoute.js";

export const listRoute = new GetRouteGenerator({
    name: "list",
    requiredParams: ["region"] as const,
    optionalParams: [] as const,
    executor: async (route, { getRegion, params: { region } }) => {
        const ds = getRegion(region);
        if (ds == null) {
            return route.finish("error", {
                message: `Unknown region: ${region}.`,
            });
        }

        const data = await ds.getRoutesSummary();
        return route.finish("success", {
            message: "See routes attached.",
            routes:  Object.fromEntries(data.entries()),
        });
    },
});
