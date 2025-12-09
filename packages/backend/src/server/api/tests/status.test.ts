import { Preconditions } from "@commutelive/common";
import { aFakeDataSource } from "~/datasources/fake/";
import { statusRoute } from "../status";
import { executeRoute } from "./base";

describe("statusRoute", () => {
    it("returns status information", async () => {
        const regions = [aFakeDataSource];

        const { response, body } = await executeRoute(
            statusRoute,
            {},
            regions,
        );

        expect(response.status).toBe("200 OK");
        expect(body?.status).toBe("success");
        Preconditions.assert(body?.status === "success");

        expect(body.activeWebSockets).toBe(0);
        expect(Object.keys(body.regions)).toEqual(["FAKE_FAKE"]);
        expect(body.version).toBeDefined();
    });
});
