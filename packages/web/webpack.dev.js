const os = require("os");
const path = require("path");
const Dotenv = require("dotenv-webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// find internal IP
const ifaces = os.networkInterfaces();
let iface = ifaces["Ethernet"] || ifaces["Wi-Fi"] || ifaces["eth0"] || ifaces["wlan0"];
iface = iface && iface.find(i => i.family === "IPv4");
const ip = iface && iface.address;

module.exports = {
    entry: {
        main: "./src/ts/index.ts",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    output: {
        path:     path.resolve(__dirname, "dist"),
        filename: "[name].[chunkhash].js",
    },
    devtool:   "source-map",
    devServer: {
        host: ip,
        open: true,
        openPage: `http://${ip}:8080/`,
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
                test:    /\.tsx?$/,
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
        new Dotenv(),
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
