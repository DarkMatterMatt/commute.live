const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: {
        main: "./src/ts/index.ts",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    output: {
        path:     path.resolve(__dirname, "dist"),
        filename: "[name].[chunkhash].js",
    },
    devtool:   "source-map",
    devServer: {
        open: true,
    },
    module: {
        rules: [
            {
                test: /\.html$/,
                use:  [
                    {
                        loader: "./node_modules/html-webpack-plugin/lib/loader.js",
                        options: {
                            force: true,
                        }
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search:  "=\"(..\/assets\/[^\"]*)\"",
                            replace: "=\"<%= require('$1').default %>\"",
                            flags:   "g",
                        }
                    },
                ]
            }, {
                test:    /\.ts$/,
                use:     "babel-loader",
                exclude: /node_modules/,
            }, {
                test: /\.(sass|scss|css)$/,
                use:  [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    }, {
                        loader:  "css-loader",
                        options: {
                            modules:   false,
                            sourceMap: true,
                        },
                    }, {
                        loader:  "postcss-loader",
                        options: {
                            sourceMap: true,
                        },
                    }, {
                        loader:  "sass-loader",
                        options: {
                            sourceMap: true,
                        },
                    },
                ],
            }, {
                test: /\.(png|svg|jpg|gif)$/,
                use:  [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "styles.css",
        }),
        new HtmlWebpackPlugin({
            scriptLoading: "defer",
            inject:        false,
            hash:          false,
            template:      "./src/html/index.html",
        }),
    ],
};
