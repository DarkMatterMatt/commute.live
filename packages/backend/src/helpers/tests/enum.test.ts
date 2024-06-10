import { parseEnum, parseStringEnum } from "..";

describe("parseEnum", () => {
    enum TestNumericEnum {
        A,
        B,
        C,
    }

    test.each([
        [0, TestNumericEnum.A],
        [2, TestNumericEnum.C],
        ["A", TestNumericEnum.A],
        ["C", TestNumericEnum.C],
    ])("parseEnum(%j) = %j", (val, expected) => {
        const result = parseEnum(TestNumericEnum, val);
        expect(result).toBe(expected);
    });

    it("throws when a matching value is not found", () => {
        const fn1 = () => parseEnum(TestNumericEnum, "3");
        expect(fn1).toThrow("Could not resolve enum type for 3, should be one of 0,1,2,A,B,C");

        const fn2 = () => parseEnum(TestNumericEnum, "D");
        expect(fn2).toThrow("Could not resolve enum type for D, should be one of 0,1,2,A,B,C");
    });
});

describe("parseStringEnum", () => {
    enum TestStringEnum {
        A = "a",
        B = "b",
        C = "c",
    }

    test.each([
        ["a", TestStringEnum.A],
        ["c", TestStringEnum.C],
        ["A", TestStringEnum.A],
        ["C", TestStringEnum.C],
    ])("parseStringEnum(%j) = %j", (val, expected) => {
        const result = parseStringEnum(TestStringEnum, val);
        expect(result).toBe(expected);
    });

    it("throws when a matching value is not found", () => {
        const fn1 = () => parseStringEnum(TestStringEnum, "d");
        expect(fn1).toThrow("Could not resolve enum type for d, should be one of a,b,c,A,B,C");

        const fn2 = () => parseStringEnum(TestStringEnum, "D");
        expect(fn2).toThrow("Could not resolve enum type for D, should be one of a,b,c,A,B,C");
    });
});
