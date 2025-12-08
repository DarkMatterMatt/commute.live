import { Preconditions } from "@commutelive/common";
import { aFakeDataSource } from "~/datasources/fake/";
import { listRoute } from "../list";
import { executeRoute } from "./base";

describe("listRoute", () => {
    it("returns routes for a valid region", async () => {
        // Use the fake data source
        const regions = [aFakeDataSource];

        // Execute route
        const { response, body } = await executeRoute(
            listRoute,
            { region: "FAKE_FAKE" },
            regions,
        );
        expect(response.status).toBe("200 OK");

        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        // Verify response
        expect(body.message).toBe("See routes attached.");
        expect(body.routes).toHaveLength(3); // The fake data source has 3 routes (F1, B1, B2)

        const [route1, route2, route3] = body.routes;
        expect(route1.id).toBe("FAKE_FAKE|F1");
        expect(route2.id).toBe("FAKE_FAKE|B1");
        expect(route3.id).toBe("FAKE_FAKE|B2");

        expect(route1.longNames).toEqual(["F1 (Direction 0)", "F1 (Direction 1)"]);
        expect(route1.shapeIds).toEqual(["F1", "F1"]);
        expect(route1.shortName).toBe("F1");
        expect(route1.type).toBe(4);
    });

    it("returns error for unknown region", async () => {
        // Use the fake data source for a region that doesn't exist
        const regions = [aFakeDataSource];

        // Execute route
        const { response, body } = await executeRoute(
            listRoute,
            { region: "unknown_region" },
            regions,
        );
        expect(response.status).toBe("400 Bad Request");

        expect(body?.status).toBe("error");
        Preconditions.assert(body?.status === "error");

        // Verify response
        expect(body.errors).toBeDefined();
        expect(body.errors).toEqual(["Unknown region: unknown_region."]);
    });
});
