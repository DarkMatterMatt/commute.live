const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackMd5Hash = require("webpack-md5-hash");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

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
    // devtool: "source-map",
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
                    },
                    {
                        loader: "css-loader",
                    },
                    {
                        loader: "postcss-loader",
                    },
                    {
                        loader: "sass-loader",
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
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: "style.[contenthash].css",
        }),
        new HtmlWebpackPlugin({
            scriptLoading: "defer",
            inject:        false,
            hash:          false,
            template:      "./src/html/index.html",
        }),
        new WebpackMd5Hash(),
    ],
};
