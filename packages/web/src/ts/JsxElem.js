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
            const element = document.createElement(tag);
            children.forEach(child => {
                if (child instanceof HTMLElement) {
                    fragments.appendChild(child);
                }
                else if (typeof child === "string") {
                    const textnode = document.createTextNode(child);
                    fragments.appendChild(textnode);
                }
                else {
                    // not HTMLElement, not string
                    console.log("not appendable", child);
                }
            });
            element.appendChild(fragments);
            //  merge element with attributes
            Object.assign(element, attrs);
            return element;
        }
    }
}

export default React;
