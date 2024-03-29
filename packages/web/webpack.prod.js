const path = require("path");
const Dotenv = require("dotenv-webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CnameWebpackPlugin = require("cname-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const WorkboxPlugin = require("workbox-webpack-plugin");

// Load .env and ../../.env
require('dotenv').config({ path: '../../.env' });
require('dotenv').config();

if (!process.env.PWA_BASE_URL) {
    throw new Error("PWA_BASE_URL is not defined");
}
const { PWA_BASE_URL } = process.env;

module.exports = {
    entry: {
        main: "./src/ts/index.ts",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].[chunkhash].js",
        publicPath: "",
    },
    // devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.html$/,
                use: [
                    {
                        loader: `${path.dirname(require.resolve("html-webpack-plugin"))}/lib/loader.js`,
                        options: {
                            force: true,
                        }
                    },
                    {
                        loader: "string-replace-loader",
                        options: {
                            search: "=\"(..\/assets\/[^\"]*)\"",
                            replace: "=\"<%= require('$1').default %>\"",
                            flags: "g",
                        }
                    },
                ]
            }, {
                test: /\.[j|t]sx?$/,
                use: "babel-loader",
                exclude: /node_modules/,
                resolve: {
                    fullySpecified: false,
                },
            }, {
                test: /\.(sass|scss|css)$/,
                use: [
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
                test: /\.(png|svg|jpg|gif|ico|xml)$/,
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: "[name].[contenthash].[ext]",
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new Dotenv({ path: "../../.env" }),
        new Dotenv(),
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: "style.[contenthash].css",
        }),
        new HtmlWebpackPlugin({
            scriptLoading: "defer",
            inject: false,
            hash: false,
            template: "./src/html/index.html",
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                removeScriptTypeAttributes: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
            },
        }),
        new WebpackPwaManifest(require("./web_manifest")),
        new WorkboxPlugin.GenerateSW(),
        new CnameWebpackPlugin({ domain: new URL(PWA_BASE_URL).hostname }),
    ],
};

console.log(`Running production build for ${PWA_BASE_URL}`);
