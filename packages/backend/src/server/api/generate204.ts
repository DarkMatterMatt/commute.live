import { GetRouteGenerator } from "./GetRoute";

export const generate204Route = new GetRouteGenerator({
    name: "generate204",
    requiredParams: [] as const,
    optionalParams: [] as const,
    cacheMaxAge: 0,
    executor: (_, { res }) => {
        res.writeStatus("204 No Content");
        res.writeHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.writeHeader("Pragma", "no-cache");
        res.writeHeader("Expires", "0");
        res.writeHeader("Access-Control-Allow-Origin", "*");
        res.endWithoutBody();
    },
});
