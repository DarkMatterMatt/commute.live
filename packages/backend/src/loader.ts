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

export function resolve(
    specifier: string,
    parentModuleUrl: string,
    defaultResolve: (specifier: string, parentModuleUrl: string) => string,
) {
    // resolve aliases
    for (const [mapFrom, mapTo] of aliasesArr) {
        if (specifier === mapFrom || specifier.startsWith(`${mapFrom}/`)) {
            specifier = specifier.replace(mapFrom, mapTo);
            break;
        }
    }

    // add index.js to directories
    if (specifier.endsWith("/")) {
        return defaultResolve(`${specifier}index.js`, parentModuleUrl);
    }

    if (specifier.endsWith(".js")) {
        return defaultResolve(specifier, parentModuleUrl);
    }

    try {
        try {
            return defaultResolve(specifier, parentModuleUrl);
        }
        catch (err) {
            return defaultResolve(`${specifier}.js`, parentModuleUrl);
        }
    }
    catch (err) {
        return defaultResolve(`${specifier}/index.js`, parentModuleUrl);
    }
}
