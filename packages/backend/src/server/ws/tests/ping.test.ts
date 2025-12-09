import { pingRoute } from "../ping";
import { executeWebSocketRoute } from "./base";

describe("pingRoute", () => {
    it("responds with pong", async () => {
        const { response } = await executeWebSocketRoute(
            pingRoute,
            {},
            [],
            1,
        );

        expect(response).not.toBeNull();
        expect(response?.status).toBe("success");
        expect(response?.route).toBe("ping");
        expect(response?.seq).toBe(1);
        expect(response?.message).toBe("pong");
    });
});
