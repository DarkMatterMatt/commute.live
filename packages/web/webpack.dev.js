const os = require("os");
const path = require("path");
const Dotenv = require("dotenv-webpack");
const getPort = require("get-port");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const WorkboxPlugin = require("workbox-webpack-plugin");

module.exports = (async () => {
    // find internal IP
    const ifaces = os.networkInterfaces();
    let ip = "127.0.0.1";
    for (const n of ["Ethernet", "eth0", "Wi-Fi", "WiFi", "wlan0"]) {
        if (ifaces[n]) {
            const ipv4 = ifaces[n].find(i => i.family === "IPv4");
            if (ipv4 && ipv4.address && !ipv4.address.startsWith("169.254.")) {
                ip = ipv4.address;
                break;
            }
        }
    }
    const port = await getPort({ host: ip, port: getPort.makeRange(8080, 9000) });

    return {
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
        devtool: "source-map",
        devServer: {
            host: ip,
            open: true,
            openPage: `http://${ip}:${port}/`,
            port,
        },
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
                        }, {
                            loader: "css-loader",
                            options: {
                                modules: false,
                                sourceMap: true,
                            },
                        }, {
                            loader: "postcss-loader",
                            options: {
                                sourceMap: true,
                            },
                        }, {
                            loader: "sass-loader",
                            options: {
                                sourceMap: true,
                            },
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
            new MiniCssExtractPlugin({
                filename: "styles.css",
            }),
            new HtmlWebpackPlugin({
                scriptLoading: "defer",
                inject: false,
                hash: false,
                template: "./src/html/index.html",
            }),
            new WebpackPwaManifest(require("./web_manifest")),
            new WorkboxPlugin.GenerateSW(),
        ],
    }
})();
