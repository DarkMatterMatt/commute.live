import { makeRegionalId } from "~/datasources";
import { unsubscribeRoute } from "../unsubscribe";
import { executeWebSocketRoute } from "./base";

describe("unsubscribeRoute", () => {
    it("unsubscribes when not previously subscribed", async () => {
        const routeId = makeRegionalId("TEST_REGION", "ROUTE1");

        const { response } = await executeWebSocketRoute(
            unsubscribeRoute,
            { id: routeId },
            [],
            1,
        );

        expect(response?.status).toBe("success");
        expect(response?.route).toBe("unsubscribe");
        expect(response?.seq).toBe(1);
        expect(response?.message).toBe(`Already unsubscribed from ${routeId}.`);
    });

    it("verifies unsubscribe was called on the WebSocket", async () => {
        const routeId = makeRegionalId("TEST_REGION", "ROUTE2");

        const { ws } = await executeWebSocketRoute(
            unsubscribeRoute,
            { id: routeId },
            [],
            1,
        );

        expect(ws.unsubscribe).toHaveBeenCalledWith(`vehicles/${routeId}`);
        expect(ws.unsubscribe).toHaveBeenCalledTimes(1);
    });
});
