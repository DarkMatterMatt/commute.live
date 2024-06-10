import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generate204Route } from "./generate204";
import { GetRouteGenerator, type GetRouteInitializeOpts } from "./GetRoute";
import { iplocationRoute } from "./iplocation";
import { listRoute } from "./list";
import { regionsRoute } from "./regions";
import { routesRoute } from "./routes";
import { statusRoute } from "./status";

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
    generate204Route,
    listRoute,
    iplocationRoute,
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
