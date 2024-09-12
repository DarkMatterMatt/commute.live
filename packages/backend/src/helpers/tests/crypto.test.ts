import { md5 } from "../crypto";

describe("md5", () => {
    it("matches expected hash output", () => {
        expect(md5("Hello, world!")).toBe("6cd3556deb0da54bca060b4c39479839");
    });
});
