import { getMQTTForVehicleUpdates } from "~/datasources/";
import { WebSocketRouteGenerator } from "./WebSocketRoute.js";

export const unsubscribeRoute = new WebSocketRouteGenerator({
    name: "unsubscribe",
    requiredParams: ["region", "shortName"] as const,
    optionalParams: [] as const,
    requiresRegion: true,
    executor: async (route, { region, params: { shortName }, ws }) => {
        if (region == null) {
            throw new Error("Region is expected.");
        }

        const wasSubscribed = await ws.unsubscribe(getMQTTForVehicleUpdates(region.code, shortName));
        return route.finish("success", {
            message: `${wasSubscribed ? "Unsubscribed" : "Already unsubscribed"} from ${shortName}.`,
        });
    },
});
