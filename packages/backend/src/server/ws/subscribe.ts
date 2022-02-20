import { getMQTTForVehicleUpdates } from "~/datasources/";
import { WebSocketRouteGenerator } from "./WebSocketRoute.js";

export const subscribeRoute = new WebSocketRouteGenerator({
    name: "subscribe",
    requiredParams: ["region", "shortName"] as const,
    optionalParams: [] as const,
    requiresRegion: true,
    executor: async (route, { region, params: { shortName }, ws }) => {
        if (region == null) {
            throw new Error("Region is expected.");
        }

        if (!await region.hasShortName(shortName)) {
            return route.finish("error", {
                message: `Unknown route short name: ${shortName}.`,
            });
        }

        ws.subscribe(getMQTTForVehicleUpdates(region.code, shortName));
        return route.finish("success", {
            message: `Subscribed to ${shortName}.`,
        });
    },
});
