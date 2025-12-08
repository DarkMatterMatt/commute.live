import { Preconditions } from "@commutelive/common";
import { aFakeDataSource } from "~/datasources/fake/";
import { regionsRoute } from "../regions";
import { executeRoute } from "./base";


describe("regionsRoute", () => {
    it("returns all fields for the fake region when no parameters are provided", async () => {
        const regions = [aFakeDataSource];

        const { response, body } = await executeRoute(regionsRoute, {}, regions);
        expect(response.status).toBe("200 OK");

        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.message).toBe("See regions attached");
        expect(body.regions).toHaveLength(1);

        // Verify fake region data
        const [region] = body.regions;
        expect(region.code).toBe("FAKE_FAKE");
        expect(region.location).toEqual({ lat: -36.8484, lng: 174.7633 });
        expect(region.country).toBe("New Zealand");
        expect(region.region).toBe("Auckland");
        expect(region.attributionHTML).toBe("<b>Fake</b> transit information");
        expect(region.defaultZoom).toBe(12.5);
        expect(region.defaultRouteIds).toEqual(["FAKE_FAKE|F1", "FAKE_FAKE|B1"]);
    });

    it("returns only requested fields for regions", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            regionsRoute,
            { fields: "code,country,region" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.regions).toHaveLength(1);

        // Verify field filtering
        const [region] = body.regions;
        expect(region.code).toBe("FAKE_FAKE");
        expect(region.country).toBe("New Zealand");
        expect(region.region).toBe("Auckland");
        expect(region.location).toBeUndefined();
        expect(region.defaultZoom).toBeUndefined();
        expect(region.defaultRouteIds).toBeUndefined();
    });

    it("returns only requested regions", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            regionsRoute,
            { regions: "fake_fake" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.regions).toHaveLength(1);
        expect(body.regions[0].code).toBe("FAKE_FAKE");
    });

    it("reports unknown regions", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            regionsRoute,
            { regions: "fake_fake,unknown_region" },
            regions,
        );
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.status).toBe("success");
        expect(body.regions).toHaveLength(1);
        expect(body.regions[0].code).toBe("FAKE_FAKE");
        expect(body.unknown).toEqual(["unknown_region"]);
    });

    it("returns error for invalid field", async () => {
        const regions = [aFakeDataSource];

        const { body } = await executeRoute(
            regionsRoute,
            { fields: "code,invalid_field" },
            regions,
        );
        expect(body?.status).toBe("error");
        Preconditions.assert(body?.status === "error");

        expect(body.message).toContain("Unknown field: invalid_field");
        expect(body.availableFields).toBeDefined();
    });
});
