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
