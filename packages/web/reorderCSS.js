const fs = require("fs");

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
    /* variables */
    "--",
    "$",

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

    /* flex container */
    "flex",
    "flex-flow",
    "flex-direction",
    "flex-wrap",
    "justify-content",
    "justify-items",
    "align-content",
    "align-items",
    "gap",
    "row-gap",
    "column-gap",

    /* flex item */
    "order",
    "flex-basis",
    "flex-grow",
    "flex-shrink",
    "justify-self",
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
    "list-style",
    "list-style-image",
    "list-style-position",
    "list-style-type",
    "fill",
    "background",
    "background-color",
    "box-shadow",
    "filter",

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
    "text-decoration",
    "text-align",
    "text-align-last",
    "line-height",
    "white-space",
    "text-overflow",
    "text-size-adjust",
    "text-decoration",

    /* cursor */
    "cursor",
    "user-select",
    "pointer-events",

    /* animation */
    "animation",
    "animation-delay",
    "animation-direction",
    "animation-duration",
    "animation-fill-mode",
    "animation-iteration-count",
    "animation-name",
    "animation-play-state",
    "animation-timing-function",

    "transition",
    "transition-delay",
    "transition-duration",
    "transition-property",
    "transition-timing-function",
    "will-change",
];

const VENDOR_PREFIXES = [
    "-moz-",    // firefox
    "-ms-",     // internet explorer
    "-o-",      // opera
    "-webkit-", // chrome, safari
];

function getAttributeOrder(a) {
    a = a.split(":")[0].trim();

    // CSS, SCSS variables
    if (a.startsWith("--")) return LINE_ORDER.indexOf("--");
    if (a.startsWith("$"))  return LINE_ORDER.indexOf("$");

    // strip vendor prefixes
    for (const vp of VENDOR_PREFIXES) {
        if (a.startsWith(vp)) {
            a = a.slice(vp.length);
            break;
        }
    }

    // get ordering
    const i = LINE_ORDER.indexOf(a);
    if (i === -1) {
        console.log(a);
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
    const files = process.argv.slice(2);
    if (files.length === 0) {
        console.log("Usage: reorderCSS.js file.css file2.scss file3.css");
    }

    await Promise.all(files.map(processFile));
})();
