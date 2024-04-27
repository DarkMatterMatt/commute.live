import { objectEntries } from "./Helpers";

const namespaces = {
    "http://www.w3.org/2000/svg": [
        "defs", "g", "svg", "symbol", "use", "audio", "foreignObject", "iframe",
        "image", "script", "use", "video", "canvas", "circle", "ellipse", "foreignObject",
        "iframe", "image", "line", "path", "polygon", "polyline", "rect", "text",
        "textPath", "tspan", "video", "audio", "iframe", "image", "use", "video",
    ],
};

type HtmlTag = string | (() => void);

type HtmlStyles = {
    [K in keyof CSSStyleDeclaration as K extends string
        ? CSSStyleDeclaration[K] extends string
            ? K
            : never
        : never
    ]: CSSStyleDeclaration[K]
};

type HtmlAttrs = Record<string, string> & {
    style?: HtmlStyles;
};

type HtmlChildren = string | Node;

/**
 * Use JSX without React
 * @see https://itnext.io/lessons-learned-using-jsx-without-react-bbddb6c28561
 */
class React {
    public static createElement(tag: HtmlTag, attrs?: HtmlAttrs, ...children: HtmlChildren[]) {
        // custom components will be functions
        if (typeof tag === "function") {
            return tag();
        }
        // regular html tags will be strings to create the elements
        if (typeof tag === "string") {
            // fragments to append multiple children to the initial node
            const fragments = document.createDocumentFragment();

            const namespace = objectEntries(namespaces).find(n => n[1].includes(tag))?.[0];
            const element = namespace ? document.createElementNS(namespace, tag) : document.createElement(tag);

            for (const child of children) {
                if (typeof child === "string") {
                    const textnode = document.createTextNode(child);
                    fragments.appendChild(textnode);
                }
                else {
                    try {
                        fragments.appendChild(child);
                    }
                    catch (e) {
                        console.log("Failed to append child:", child);
                    }
                }
            }
            element.appendChild(fragments);

            // merge element with attributes
            if (attrs != null) {
                for (const [k, v] of Object.entries(attrs)) {
                    if (typeof v === "object") {
                        if (k === "style") {
                            for (const [k2, v2] of objectEntries(v)) {
                                element.style[k2] = v2;
                            }
                        }
                        else {
                            console.log("Received an object for key:", k, v);
                        }
                    }
                    else {
                        element.setAttribute(k, v);
                    }
                }
            }

            return element;
        }
    }
}

export default React;
