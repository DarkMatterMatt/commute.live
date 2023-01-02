import { GetRouteGenerator } from "./GetRoute.js";
import { listRoute } from "./list.js";
import { regionRoute } from "./region.js";
import { routesRoute } from "./routes.js";
import { statusRoute } from "./status.js";

export const defaultRoute = new GetRouteGenerator({
    name: "default",
    requiredParams: [] as const,
    optionalParams: [] as const,
    executor: route => route.finish("error", {
        message: "Unknown route.",
        availableRoutes: [...routes.keys()],
    }),
});

const routes = new Map([
    listRoute,
    regionRoute,
    routesRoute,
    statusRoute,
].map(r => [r.name, r]));

export default routes;
