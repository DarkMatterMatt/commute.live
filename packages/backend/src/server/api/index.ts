import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { GetRouteGenerator, type GetRouteInitializeOpts } from "./GetRoute.js";
import { ipRegionRoute } from "./ipregion.js";
import { listRoute } from "./list.js";
import { regionsRoute } from "./regions.js";
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
    ipRegionRoute,
    regionsRoute,
    routesRoute,
    statusRoute,
].map(r => [r.name, r]));

export default routes;

export async function initialize(opts: GetRouteInitializeOpts): Promise<void> {
    const { cacheDir } = opts;
    for (const route of routes.values()) {
        const dir = join(cacheDir, route.name);
        if (!existsSync(dir)){
            mkdirSync(dir, { recursive: true });
        }
        await route.initialize({
            ...opts,
            cacheDir: dir,
        });
    }
}
