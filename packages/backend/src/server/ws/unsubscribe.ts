import type { Id } from "@commutelive/common";
import { getMQTTForVehicleUpdates } from "~/datasources/";
import { WebSocketRouteGenerator } from "./WebSocketRoute";

export const unsubscribeRoute = new WebSocketRouteGenerator({
    name: "unsubscribe",
    requiredParams: ["id"] as const,
    optionalParams: [] as const,
    executor: async (route, { params, ws }) => {
        const id = params.id as Id;
        const wasSubscribed = ws.unsubscribe(getMQTTForVehicleUpdates(id));
        return route.finish("success", {
            message: `${wasSubscribed ? "Unsubscribed" : "Already unsubscribed"} from ${id}.`,
        });
    },
});
