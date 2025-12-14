import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { percy } from "@percy/cli";
import express from "express";
import LZString from "lz-string";
import { launch } from "puppeteer";
import sharp from "sharp";

/** Commute.live state */
const STATE = {
    version: 4,
    routes: [
        ["FAKE_NZL_AKL|OUT", true, "#E67C13"],
        ["FAKE_NZL_AKL|138", true, "#E94537"],
        ["FAKE_NZL_AKL|GULF", true, "#5555FF"],
        ["FAKE_NZL_AKL|25B", true, "#9400D3"],
        ["FAKE_NZL_AKL|75", true, "#1DCE1D"],
    ],
    settings: {
        currentRegion: "FAKE_NZL_AKL",
        darkMode: true,
        showZoom: false,
        hideAbout: true,
        simpleMapFeatures: true,
    },
    map: [-36.864373, 174.766635, 13],
};

/** Browser screen sizes for Percy screenshots. Widths > 2000px are resized. */
const SCREEN_SIZES = {
    "iPhoneSE2020": [375, 667],
    "iPhone14ProMax": [430, 932],
    "iPadAir2020": [820, 1180],
    "1080p": [1920, 1080],
    "1440p": [2560, 1440],
    "2160p": [3840, 2160],
    "OpenGraph": [1200, 630],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main(args) {
    // parse args
    if (args.length < 1) {
        console.error("Usage: node snapshot.js <distPath>");
        process.exit(1);
    }

    const [distPath] = args;

    // serve the dist folder with Express
    const server = express()
        .use(express.static(distPath))
        .listen(8080);

    // launch puppeteer
    const browser = await launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // wait for a marker to appear
    const stateHash = LZString.compressToEncodedURIComponent(JSON.stringify(STATE));
    await page.goto(`http://localhost:8080#${stateHash}`);
    await page.waitForSelector(".html-marker");

    // take snapshots (using puppeteer, not Percy)
    const dir = await mkdtemp(join(tmpdir(), "commute.live-percy-"));
    for (const [device, [width, height]] of Object.entries(SCREEN_SIZES)) {
        console.log(`Taking snapshot for ${device}...`);
        await page.setViewport({ width, height });
        await sleep(1000);

        // scale down large screenshots & write image to disk
        const buf = await page.screenshot();
        const img = sharp(buf);
        if (width > 2000) {
            img.resize({ width: Math.min(Math.floor(width / 2), 2000) });
        }
        const info = await img.toFile(join(dir, `${device}.png`));
        console.log(`  ✓ ${device}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
    }

    // close the browser and stop the server
    await browser.close();
    server.close();

    // upload the snapshots to Percy
    await percy(["upload", "-e", dir]);
}

main(process.argv.slice(2));
