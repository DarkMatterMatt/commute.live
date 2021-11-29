module.exports = {
    env: {
        commonjs: true,
        es6: true,
        node: true,
    },
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    parserOptions: {
        ecmaVersion: 2021,
    },
    rules: {
        "array-bracket-spacing": ["warn", "never"],
        "arrow-spacing": "warn",
        "brace-style": ["warn", "stroustrup"],
        "comma-dangle": ["warn", "always-multiline"],
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
        "object-curly-spacing": ["warn", "always"],
        "operator-linebreak": ["warn", "before"],
        "prefer-destructuring": "warn",
        "prefer-template": "warn",
        "quotes": ["warn", "double", {
            avoidEscape: true,
        }],
        "quote-props": ["error", "consistent-as-needed"],
        "semi": ["error", "always"],
    },
};
