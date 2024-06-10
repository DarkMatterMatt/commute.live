import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pingRoute } from "./ping";
import { subscribeRoute } from "./subscribe";
import { unsubscribeRoute } from "./unsubscribe";
import { WebSocketRouteGenerator, type WebSocketRouteInitializeOpts } from "./WebSocketRoute";

export const defaultRoute = new WebSocketRouteGenerator({
    name: "default",
    requiredParams: [] as const,
    optionalParams: [] as const,
    executor: route => route.finish("error", {
        message: "Unknown route.",
        availableRoutes: [...routes.keys()],
    }),
});

const routes = new Map([
    pingRoute,
    subscribeRoute,
    unsubscribeRoute,
].map(r => [r.name, r]));

export default routes;

export async function initialize(opts: WebSocketRouteInitializeOpts): Promise<void> {
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
