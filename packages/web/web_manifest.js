const path = require("path");

// load .env
require("dotenv").config();

module.exports = {
    name: "Commute Live",
    short_name: "Commute Live",
    description: "Commute Live provides real-time tracking for buses, trains and ferries on the Auckland Transport network.",
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
        purpose: "any maskable",
    }, {
        sizes: [180, 120],
        src: path.resolve("src/assets/icon_maskable_rounded.png"),
        purpose: "any maskable",
        ios: true,
    }],
};
