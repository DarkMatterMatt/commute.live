// @ts-check

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    moduleNameMapper: {
        "^~/(.*)$": "<rootDir>/src/$1",
    },
    extensionsToTreatAsEsm: [".ts"],
};
