import { GetRouteGenerator } from "./GetRoute.js";

export const generate204Route = new GetRouteGenerator({
    name: "generate204",
    requiredParams: [] as const,
    optionalParams: [] as const,
    cacheMaxAge: 0,
    executor: async (route, { res }) => {
        res.writeStatus("204 No Content");
        route.finish("success", {});
    },
});
