import { WebSocketRouteGenerator } from "./WebSocketRoute.js";

export const unsubscribeRoute = new WebSocketRouteGenerator({
    name: "unsubscribe",
    requiredParams: ["region", "shortName"] as const,
    optionalParams: [] as const,
    executor: async (route, { getRegion, params: { region, shortName }, ws }) => {
        const ds = getRegion(region);
        if (ds == null) {
            return route.finish("error", {
                message: `Unknown region: ${region}`,
            });
        }

        if (!await ds.hasShortName(shortName)) {
            return route.finish("error", {
                message: `Unknown route short name: ${shortName}.`,
            });
        }

        ws.unsubscribe(`${region}/${shortName}`);
        return route.finish("success", {
            message: `Unsubscribed from ${shortName}.`,
        });
    },
});
