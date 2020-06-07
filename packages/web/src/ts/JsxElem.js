const namespaces = {
    "http://www.w3.org/2000/svg": [
        "defs", "g", "svg", "symbol", "use",
        "audio", "foreignObject", "iframe", "image", "script", "use", "video",
        "canvas", "circle", "ellipse", "foreignObject", "iframe", "image", "line", "path", "polygon", "polyline", "rect", "text", "textPath", "tspan", "video",
        "audio", "iframe", "image", "use", "video",
    ],
};

/**
 * Use JSX without React
 * @see https://itnext.io/lessons-learned-using-jsx-without-react-bbddb6c28561
 */
class React {
    static createElement(tag, attrs, ...children) {
        // custom components will be functions
        if (typeof tag === "function") {
            return tag();
        }
        // regular html tags will be strings to create the elements
        if (typeof tag === "string") {
            // fragments to append multiple children to the initial node
            const fragments = document.createDocumentFragment();

            const namespace = Object.entries(namespaces).find(e => e[1].includes(tag));
            const element = namespace ? document.createElementNS(namespace[0], tag) : document.createElement(tag);

            children.forEach(child => {
                if (typeof child === "string") {
                    const textnode = document.createTextNode(child);
                    fragments.appendChild(textnode);
                }
                else {
                    try { fragments.appendChild(child); }
                    catch (e) { console.log("not appendable", child); }
                }
            });
            element.appendChild(fragments);

            //  merge element with attributes
            Object.entries(attrs).forEach(e => element.setAttribute(...e));

            return element;
        }
    }
}

export default React;
