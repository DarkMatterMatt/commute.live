import { generate204Route } from "../generate204";
import { executeRoute } from "./base";

describe("generate204Route", () => {
    it("returns 204 No Content with correct headers", async () => {
        const { response, body } = await executeRoute(
            generate204Route,
            {},
            [],
        );

        expect(response.status).toBe("204 No Content");
        expect(body).toBeNull();

        expect(response.headers["Cache-Control"]).toBe("no-cache, no-store, must-revalidate");
        expect(response.headers["Pragma"]).toBe("no-cache");
        expect(response.headers["Expires"]).toBe("0");
        expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
});
