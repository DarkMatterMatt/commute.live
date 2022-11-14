// eslint-disable-next-line no-undef
module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/typescript",
    ],
    env: {
        es6: true,
    },
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
        "import",
    ],
    settings: {
        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },
        "import/resolver": {
            typescript: {
                project: ["tsconfig.json", "package/tsconfig.json"],
            },
            node: {
                project: ["tsconfig.json", "package/tsconfig.json"],
            },
        },
    },
    rules: {
        "array-bracket-spacing": ["warn", "never"],
        "arrow-parens": ["warn", "as-needed"],
        "arrow-spacing": "warn",
        "brace-style": "off",
        "@typescript-eslint/brace-style": ["warn", "stroustrup"],
        "@typescript-eslint/camelcase": "off",
        "comma-dangle": "off",
        "@typescript-eslint/comma-dangle": ["warn", "always-multiline"],
        "eqeqeq": ["error", "smart"],
        "@typescript-eslint/indent": ["warn", 4, {
            SwitchCase: 1,
        }],
        "keyword-spacing": "warn",
        "max-len": ["warn", {
            code: 120,
            comments: 100,
            ignorePattern: "^\\s*import.*from.*;$", // ignore long imports
        }],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-inferrable-types": ["warn", {
            ignoreParameters: true,
        }],
        "no-mixed-operators": "error",
        "no-trailing-spaces": "warn",
        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_+",
            varsIgnorePattern: "^_+",
        }],
        "object-curly-newline": ["warn", {
            consistent: true,
        }],
        "object-curly-spacing": ["warn", "always"],
        "operator-linebreak": ["warn", "before"],
        "prefer-destructuring": "warn",
        "prefer-template": "warn",
        "quotes": "off",
        "@typescript-eslint/quotes": ["warn", "double", {
            avoidEscape: true,
        }],
        "quote-props": ["error", "consistent-as-needed"],
        "semi": ["error", "always"],
    },
};
