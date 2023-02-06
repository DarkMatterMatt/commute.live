module.exports = {
    extends: [
        "plugin:react/recommended",
        "airbnb-typescript",
        "../../.eslintrc.cjs",
    ],
    env: {
        browser: true,
    },
    globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
    },
    ignorePatterns: ["*.js", "*.cjs", "*.mjs"],
    parserOptions: {
        ecmaVersion: 2018,
        project: "tsconfig.json",
    },
    rules: {
        "@typescript-eslint/indent": ["error", 4, {
            "SwitchCase": 1,
            "ignoredNodes": ['JSXElement', 'JSXElement > *', 'JSXAttribute', 'JSXIdentifier', 'JSXNamespacedName', 'JSXMemberExpression', 'JSXSpreadAttribute', 'JSXExpressionContainer', 'JSXOpeningElement', 'JSXClosingElement', 'JSXText', 'JSXEmptyExpression', 'JSXSpreadChild'],
        }],
        "no-bitwise": "off",
        "no-console": "off",
        "no-continue": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "no-plusplus": "off",
        "no-underscore-dangle": "off",
        "react/no-unknown-property": ["error", {
            "ignore": ["class"],
        }],
    },
};
