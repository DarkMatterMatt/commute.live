/**
 * Tests a function with multiple test cases.
 * @param fn Function to test.
 * @param testCases Array of [...params, result].
 * @param matcher Name of Jest matcher.
 */
export function simpleTest<T extends (...args: any[]) => any>(
    fn: T,
    testCases: [...params: Parameters<T>, result: ReturnType<T>][],
    matcher: "toBe" | "toBeCloseTo" | "toEqual" | "toMatchObject" = "toBe",
): void {
    const argsFormat = new Array(testCases[0].length - 1).fill("%j").join(", ");
    test.each(testCases)(`${fn.name}(${argsFormat}) = %j`, (...args) => {
        const expected = args.pop() as ReturnType<T>;
        const result = fn(...args);

        // TS doesn't like accessing expect(result)[matcher](expected), so we help it out here.
        switch (matcher) {
            case "toMatchObject":
                expect(result)[matcher](expected);
                break;
            default:
                expect(result)[matcher](expected);
                break;
        }
    });
}
