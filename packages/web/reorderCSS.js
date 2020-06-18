const fs = require("fs");
const path = require("path");

/**
 * Reorders CSS attributes according to the LINE_ORDER defined below.
 * - Existing line breaks and whitespace is preserved
 * - Attributes must on a single line
 * - Opening braces must be at the end of their line
 * - Closing braces must be on a newline
 * - The original file is renamed with a .bak file extension
 * 
 * Usage:
 * - reorderCSS.js file.css file2.scss file3.css
 */

const LINE_ORDER = [
    /* visibility */
    "z-index",
    "content",
    "visibility",
    "display",
    "opacity",

    /* position */
    "position",
    "float",
    "top",
    "bottom",
    "left",
    "right",
    "transform",
    "transform-origin",

    /* content position */
    "overflow",
    "overflow-x",
    "overflow-y",
    "vertical-align",

    /* flex */
    "flex",
    "flex-flow",
    "flex-direction",
    "flex-wrap",
    "flex-basis",
    "flex-grow",
    "flex-shrink",
    "justify-content",
    "align-content",
    "align-items",
    "align-self",

    /* size */
    "height",
    "max-height",
    "min-height",
    "width",
    "max-width",
    "min-width",
    "box-sizing",

    /* margin */
    "margin",
    "margin-top",
    "margin-bottom",
    "margin-left",
    "margin-right",

    "margin-block",
    "margin-block-start",
    "margin-block-end",
    "margin-inline",
    "margin-inline-start",
    "margin-inline-end",

    /* padding */
    "padding",
    "padding-top",
    "padding-bottom",
    "padding-left",
    "padding-right",

    /* appearance */
    "appearance",
    "fill",
    "background",
    "background-color",
    "box-shadow",

    "border",
    "border-top",
    "border-bottom",
    "border-left",
    "border-right",
    "border-radius",

    "outline",
    "outline-style",
    "outline-color",
    "outline-width",
    "outline-offset",

    /* font */
    "font",
    "font-family",
    "font-size",
    "font-style",
    "font-variant",
    "font-weight",

    "color",
    "text-align",
    "text-align-last",
    "line-height",
    "white-space",
    "text-overflow",
    "text-size-adjust",

    /* cursor */
    "cursor",
    "user-select",
    "pointer-events",

    /* animation */
    "transition",
    "will-change",
];

function getAttributeOrder(a) {
    const a2 = a.split(":")[0].trim();
    if (a2.startsWith("--")) return -2;
    if (a2.startsWith("$"))  return -3;

    const i = LINE_ORDER.indexOf(a2);
    if (i === -1) {
        console.log(a2);
        return LINE_ORDER.length;
    }
    return i;
}

function sortLine(a, b) {
    const a2 = getAttributeOrder(a);
    const b2 = getAttributeOrder(b);

    if (a2 !== b2) {
        return a2 - b2;
    }
    return a.trim() > b.trim() ? 1 : -1;
}

async function processFile(cssFile) {
    let text;
    try {
        text = fs.readFileSync(cssFile, { encoding: "utf8" });
    }
    catch (e) {
        console.error(e);
        return;
    }
    console.log(`Processing: ${cssFile}`);

    const lines = text.split(/\r?\n/g);
    const output = [];
    let tmp = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // don't process @imports
        if (trimmed.startsWith("@import")) {
            output.push(line);
            continue;
        }

        // add to list to be sorted
        if (trimmed.includes(":") && trimmed.endsWith(";")) {
            tmp.push(line);
            continue;
        }

        // end of block, sort and add to output
        if (trimmed.endsWith("{") || trimmed === "}" || trimmed === "") {
            tmp.sort(sortLine);
            output.push(...tmp, line);
            tmp = [];
            continue;
        }

        // default, add to output without processing
        output.push(line);
    }
    tmp.sort();
    output.concat(tmp);

    fs.renameSync(cssFile, `${cssFile}.bak`);
    fs.writeFileSync(cssFile, output.join("\n"));
}

(async () => {
    await Promise.all(process.argv.slice(2).map(processFile));
})();
