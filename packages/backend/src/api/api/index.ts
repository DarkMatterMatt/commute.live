import { GetRouteGenerator } from "./GetRoute.js";
import { listRoute } from "./list.js";
import { routesRoute } from "./routes.js";
import { statusRoute } from "./status.js";

export const defaultRoute = new GetRouteGenerator({
    name: "default",
    requiredParams: ["region"] as const,
    optionalParams: [] as const,
    executor: route => route.finish("error", {
        message: `Invalid route. Must be one of ${[...routes.keys()].join(", ")}.`,
    }),
});

const routes = new Map([
    listRoute,
    routesRoute,
    statusRoute,
].map(r => [r.name, r]));

export default routes;
