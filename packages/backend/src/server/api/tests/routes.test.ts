import { Preconditions } from "@commutelive/common";
import { aFakeDataSource } from "~/datasources/fake/";
import { routesRoute } from "../routes";
import { executeRoute } from "./base";

describe("routesRoute", () => {
    it("returns basic route information", async () => {
        const regions = [aFakeDataSource];

        const { response, body } = await executeRoute(
            routesRoute,
            { fields: "id,shortName,type", routeIds: "FAKE_FAKE|F1" },
            regions,
        );
        expect(response.status).toBe("200 OK");

        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.message).toBe("See routes attached");
        expect(body.routes).toHaveLength(1);

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|F1");
        expect(route.shortName).toBe("F1");
        expect(route.type).toBe(4); // Ferry
        expect(route.longNames).toBeUndefined();
        expect(route.polylines).toBeUndefined();
    });

    it("returns multiple routes", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,shortName,type", routeIds: "FAKE_FAKE|F1,FAKE_FAKE|B1,FAKE_FAKE|B2" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.routes).toHaveLength(3);

        const [route1, route2, route3] = body.routes;
        expect(route1.id).toBe("FAKE_FAKE|F1");
        expect(route1.shortName).toBe("F1");
        expect(route1.type).toBe(4);

        expect(route2.id).toBe("FAKE_FAKE|B1");
        expect(route2.shortName).toBe("B1");
        expect(route2.type).toBe(3); // Bus

        expect(route3.id).toBe("FAKE_FAKE|B2");
        expect(route3.shortName).toBe("B2");
        expect(route3.type).toBe(3);
    });

    it("returns longNames when requested", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,longNames", routeIds: "FAKE_FAKE|F1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|F1");
        expect(route.longNames).toEqual(["F1 (Direction 0)", "F1 (Direction 1)"]);
        expect(route.shortName).toBeUndefined();
        expect(route.type).toBeUndefined();
    });

    it("returns polylines when requested", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,polylines", routeIds: "FAKE_FAKE|B1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|B1");
        expect(route.polylines).toBeDefined();
        expect(Array.isArray(route.polylines)).toBe(true);
        expect(route.polylines).toHaveLength(2);
    });

    it("returns region when requested", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,region", routeIds: "FAKE_FAKE|F1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|F1");
        expect(route.region).toBe("FAKE_FAKE");
    });

    it("returns vehicles when requested", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,vehicles", routeIds: "FAKE_FAKE|F1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|F1");
        expect(route.vehicles).toBeDefined();
        expect(Array.isArray(route.vehicles)).toBe(true);
    });

    it("reports unknown routes", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,shortName", routeIds: "FAKE_FAKE|F1,FAKE_FAKE|UNKNOWN,FAKE_FAKE|B1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.routes).toHaveLength(2);
        expect(body.routes[0].id).toBe("FAKE_FAKE|F1");
        expect(body.routes[1].id).toBe("FAKE_FAKE|B1");
        expect(body.unknown).toEqual(["FAKE_FAKE|UNKNOWN"]);
    });

    it("reports unknown region", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id", routeIds: "UNKNOWN_REGION|F1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.routes).toHaveLength(0);
        expect(body.unknown).toEqual(["UNKNOWN_REGION|F1"]);
    });

    it("returns error for invalid field", async () => {
        const regions = [aFakeDataSource];

        const { response, body } = await executeRoute(
            routesRoute,
            { fields: "id,invalid_field", routeIds: "FAKE_FAKE|F1" },
            regions,
        );
        expect(response.status).toBe("400 Bad Request");

        expect(body?.status).toBe("error");
        Preconditions.assert(body?.status === "error");

        expect(body.message).toContain("Unknown field: invalid_field");
        expect(body.availableFields).toBeDefined();
    });

    it("returns error for missing fields parameter", async () => {
        const regions = [aFakeDataSource];

        const { response, body } = await executeRoute(
            routesRoute,
            { routeIds: "FAKE_FAKE|F1" },
            regions,
        );
        expect(response.status).toBe("400 Bad Request");

        expect(body?.status).toBe("error");
        Preconditions.assert(body?.status === "error");

        expect(body.errors).toBeDefined();
        expect(body.errors).toContain("Missing required parameter: fields.");
    });

    it("returns error for missing routeIds parameter", async () => {
        const regions = [aFakeDataSource];

        const { response, body } = await executeRoute(
            routesRoute,
            { fields: "id" },
            regions,
        );
        expect(response.status).toBe("400 Bad Request");

        expect(body?.status).toBe("error");
        Preconditions.assert(body?.status === "error");

        expect(body.errors).toBeDefined();
        expect(body.errors).toContain("Missing required parameter: routeIds.");
    });

    it("returns all fields when requested", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,longNames,polylines,region,shortName,stops,type,vehicles", routeIds: "FAKE_FAKE|B2" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|B2");
        expect(route.longNames).toBeDefined();
        expect(route.polylines).toBeDefined();
        expect(route.region).toBe("FAKE_FAKE");
        expect(route.shortName).toBe("B2");
        expect(route.type).toBe(3);
        expect(route.vehicles).toBeDefined();
        expect(route.stops).toBeDefined();
    });

    it("returns stops when requested", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,stops", routeIds: "FAKE_FAKE|B1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|B1");
        expect(route.stops).toBeDefined();
        expect(Array.isArray(route.stops)).toBe(true);
        expect(route.stops).toHaveLength(2);
        const [stops0, stops1] = route.stops!;

        // Check direction 0
        expect(stops0).toHaveLength(3);
        expect(stops0?.[0]).toEqual({
            stopId: "BUS_STOP_1",
            location: { lat: -36.8484, lng: 174.7632 },
            name: "Bus Stop 1",
        });

        // Check direction 1
        expect(stops1).toHaveLength(3);
        expect(stops1?.[0]).toEqual({
            stopId: "BUS_STOP_3",
            location: { lat: -36.8495, lng: 174.7645 },
            name: "Bus Stop 3",
        });
    });

    it("returns null for directions without stops", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,stops", routeIds: "FAKE_FAKE|B2" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.id).toBe("FAKE_FAKE|B2");
        expect(route.stops).toBeDefined();
        expect(route.stops?.[0]).toHaveLength(2);
        expect(route.stops?.[0]?.[0]).toEqual({
            stopId: "CENTRAL_STN",
            location: { lat: -36.8486, lng: 174.7634 },
            name: "Central Station",
        });
        expect(route.stops?.[1]).toBeNull();
    });

    it("includes stops in all fields test", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            routesRoute,
            { fields: "id,longNames,polylines,region,shortName,stops,type,vehicles", routeIds: "FAKE_FAKE|F1" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        const [route] = body.routes;
        expect(route.stops).toBeDefined();
        expect(route.stops?.[0]).toHaveLength(2);
        expect(route.stops?.[1]).toHaveLength(2);
    });
});
