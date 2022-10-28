import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ALIASES = {
    "~": "./dist",
};

function convertPathToUrl(path: string) {
    return pathToFileURL(join(process.cwd(), path)).href;
}

const aliasesArr = Object.entries(ALIASES).map(
    ([mapFrom, mapTo]) => [mapFrom, convertPathToUrl(mapTo)] as [string, string],
);

export async function resolve(
    specifier: string,
    parentModuleUrl: string,
    defaultResolve: (specifier: string, parentModuleUrl: string) => Promise<string>,
) {
    // resolve aliases
    for (const [mapFrom, mapTo] of aliasesArr) {
        if (specifier === mapFrom || specifier.startsWith(`${mapFrom}/`)) {
            specifier = specifier.replace(mapFrom, mapTo);
            break;
        }
    }

    // fix .ts extension should be .js
    if (specifier.endsWith(".ts")) {
        specifier = `${specifier.slice(0, -3)}.js`;
    }

    let err: any;
    try {
        return await defaultResolve(specifier, parentModuleUrl);
    }
    catch (err_) {
        err = err_;
    }

    // maybe it's a directory
    try {
        return await defaultResolve(`${specifier.replace(/\/$/, "")}/index.js`, parentModuleUrl);
    }
    catch { /* do nothing */ }

    // maybe it's missing its file extension
    try {
        return await defaultResolve(`${specifier}.js`, parentModuleUrl);
    }
    catch { /* do nothing */ }

    throw err;
}
