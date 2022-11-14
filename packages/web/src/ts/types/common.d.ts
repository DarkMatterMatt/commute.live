// fix error TS2307: "Cannot find module '*.svg'" when importing images
declare module "*.gif" {
    const content: any;
    export default content;
}

declare module "*.jpg" {
    const content: any;
    export default content;
}

declare module "*.png" {
    const content: any;
    export default content;
}

declare module "*.svg" {
    const content: any;
    export default content;
}

// fix error TS7026: "JSX element implicitly has type 'any'
// because no interface 'JSX.IntrinsicElements' exists."
declare namespace JSX {
    interface IntrinsicElements {
        div: any;
        img: any;
        path: any;
        span: any;
        svg: any;
    }
}

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
