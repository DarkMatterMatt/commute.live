import { type Id } from "@commutelive/common";
import { getMQTTForVehicleUpdates, getRegion, parseRegionalId } from "~/datasources/";
import { WebSocketRouteGenerator } from "./WebSocketRoute";

export const subscribeRoute = new WebSocketRouteGenerator({
    name: "subscribe",
    requiredParams: ["id"] as const,
    optionalParams: [] as const,
    executor: async (route, { params, ws }) => {
        const fail = () => route.finish("error", {
            message: `Unknown route id: ${id}.`,
        });

        const id = params.id as Id;
        const [regionStr] = parseRegionalId(id);
        const region = getRegion(regionStr);
        if (region == null) {
            return fail();
        }

        const summary = await region.getRouteSummary(id);
        if (summary == null) {
            return fail();
        }

        ws.subscribe(getMQTTForVehicleUpdates(id));
        return route.finish("success", {
            message: `Subscribed to ${id}.`,
        });
    },
});
