module.exports = {
    env: {
        browser: true,
        es6: true,
    },
    extends: [
        'airbnb-typescript',
        "plugin:@typescript-eslint/recommended",
    ],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    ignorePatterns: [
        "dist/",
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2018,
        project: "./tsconfig.json",
    },
    plugins: [
        '@typescript-eslint',
    ],
    rules: {
        "arrow-parens": "off",
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
        "no-multi-spaces": "off",
        "no-plusplus": ["error", {
            "allowForLoopAfterthoughts": true
        }],
        "no-restricted-syntax": "off",
        "no-underscore-dangle": "off",
        "@typescript-eslint/no-unused-vars": ["warn", {
            "argsIgnorePattern": "^_+$",
        }],
        "object-curly-newline": ["error", {
            "consistent": true
        }],
        "@typescript-eslint/quotes": ["error", "double"],
    },
};
