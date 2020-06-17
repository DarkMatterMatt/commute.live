const path = require("path");

// load .env
require("dotenv").config();

module.exports = {
    name: "AT Live",
    short_name: "AT Live",
    description: "Live tracking for bus, train and ferry services on the Auckland Transport network.",
    theme_color: "#2e7699",
    background_color: "#2e7699",

    orientation: "portrait",
    display: "standalone",
    scope: process.env.PWA_BASE_URL,
    start_url: process.env.PWA_BASE_URL,

    ios: true,
    icons: [{
        sizes: [512, 384, 192, 152, 144, 128, 96, 72],
        src: path.resolve("src/assets/icon_maskable_rounded.png"),
        destination: "assets",
        purpose: "maskable",
    }, {
        sizes: [180, 120],
        src: path.resolve("src/assets/icon_maskable_rounded.png"),
        destination: "assets",
        purpose: "maskable",
        ios: true,
    }],
}
