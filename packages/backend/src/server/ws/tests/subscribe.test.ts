import { makeRegionalId } from "~/datasources";
import { aFakeDataSource } from "~/datasources/fake/";
import { subscribeRoute } from "../subscribe";
import { executeWebSocketRoute } from "./base";

describe("subscribeRoute", () => {
    it("subscribes to a valid route", async () => {
        const routeId = makeRegionalId("FAKE_FAKE", "F1");
        const regions = [aFakeDataSource];

        const { ws, response } = await executeWebSocketRoute(
            subscribeRoute,
            { id: routeId },
            regions,
            1,
        );

        expect(response?.status).toBe("success");
        expect(response?.route).toBe("subscribe");
        expect(response?.seq).toBe(1);
        expect(response?.message).toBe(`Subscribed to ${routeId}.`);

        expect(ws.subscribe).toHaveBeenCalledWith(`vehicles/${routeId}`);
        expect(ws.subscribe).toHaveBeenCalledTimes(1);
    });

    it("returns error for unknown region", async () => {
        const routeId = makeRegionalId("UNKNOWN_REGION", "ROUTE1");
        const regions = [aFakeDataSource];

        const { ws, response } = await executeWebSocketRoute(
            subscribeRoute,
            { id: routeId },
            regions,
            1,
        );

        expect(response?.status).toBe("error");
        expect(response?.message).toBe(`Unknown route id: ${routeId}.`);
        expect(ws.subscribe).not.toHaveBeenCalled();
    });

    it("returns error for unknown route in valid region", async () => {
        const routeId = makeRegionalId("FAKE_FAKE", "UNKNOWN_ROUTE");
        const regions = [aFakeDataSource];

        const { ws, response } = await executeWebSocketRoute(
            subscribeRoute,
            { id: routeId },
            regions,
            1,
        );

        expect(response?.status).toBe("error");
        expect(response?.message).toBe(`Unknown route id: ${routeId}.`);
        expect(ws.subscribe).not.toHaveBeenCalled();
    });
});
