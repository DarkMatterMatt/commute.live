module.exports = {
    mode:    "development",
    devtool: "source-map",
    entry:   "./src/ts/index.ts",
    output:  {
        filename: "bundle.js",
    },
    resolve: {
        // add `.ts` and `.tsx` as a resolvable extension.
        extensions: [".ts", ".tsx", ".js"],
    },
    module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            { test: /\.tsx?$/, loader: "ts-loader" },
        ],
    },
};
