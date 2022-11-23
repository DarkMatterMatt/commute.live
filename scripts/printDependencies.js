/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs");

function readPackageLock(fname) {
    const data = fs.readFileSync(fname, "utf8");
    const json = JSON.parse(data);
    if (!json.lockfileVersion || json.lockfileVersion < 2) {
        throw new Error("Unsupported lockfile version");
    }
    return json;
}

function getPackageLockPackages(packageLock, type="all") {
    const packages = Object.entries(packageLock.packages)
        .filter(([path, _]) => path); // filter out root package
    switch (type) {
        case "all":
            return packages;
        case "prod":
            return packages.filter(([_path, pkg]) => !pkg.dev);
        case "dev":
            return packages.filter(([_path, pkg]) => pkg.dev);
        default:
            throw new Error(`Unknown type: ${type}`);
    }
}

function main(args) {
    if (args.length < 1) {
        console.warn("Usage: node printDependencies.js <package-lock.json> [all|prod|dev]");
        process.exit(1);
    }

    const [fname, type] = args;
    const packageLock = readPackageLock(fname);
    const packages = getPackageLockPackages(packageLock, type);

    console.log(packages.map(([path, _]) => path).join("\n"));
}

main(process.argv.slice(2));
