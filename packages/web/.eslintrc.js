module.exports = {
    env: {
        browser: true,
        es6: true,
    },
    extends: [
        "plugin:@typescript-eslint/recommended",
        "airbnb-typescript",
    ],
    globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
    },
    ignorePatterns: ["*.js"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2018,
    },
    plugins: [
        "@typescript-eslint",
    ],
    rules: {
        "arrow-parens": ["error", "as-needed"],
        "arrow-spacing": "error",
        "@typescript-eslint/brace-style": ["error", "stroustrup"],
        "comma-dangle": ["error", {
            "arrays": "always-multiline",
            "objects": "always-multiline",
            "imports": "always-multiline",
            "exports": "always-multiline",
            "functions": "never",
        }],
        "@typescript-eslint/indent": ["error", 4, {
            "SwitchCase": 1
        }],
        "key-spacing": ["error", {
            "mode": "minimum",
            "align": "value",
        }],
        "max-len": ["warn", {
            "code": 120
        }],
        "no-bitwise": "off",
        "no-console": "off",
        "no-continue": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "no-plusplus": ["error", {
            "allowForLoopAfterthoughts": true
        }],
        "no-underscore-dangle": "off",
        "@typescript-eslint/no-unused-vars": ["error", {
            "argsIgnorePattern": "^_+$",
        }],
        "object-curly-newline": ["error", {
            "consistent": true
        }],
        "@typescript-eslint/quotes": ["error", "double"],
    },
};
