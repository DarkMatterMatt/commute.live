import childProcess from "node:child_process";
import { basename, dirname } from "node:path";
import { promisify } from "node:util";
import glob from "glob";

const execFile = promisify(childProcess.execFile);

cli(process.argv.slice(2));

/**
 * Generates TypeScript code from .proto files matching the specified pattern.
 * @param {string[]} args CLI arguments
 * @returns {Promise<void>}
 */
function cli(args) {
    if (args.length !== 3) {
        console.log("Usage: ./generateProto.js <protoc path> <plugin path> <.proto search pattern>");
        process.exit(1);
    }

    const [protoc, , pattern] = args;
    const plugin = process.platform === "win32"
        ? args[1].replace(/\//g, "\\").replace(/protoc-gen-ts_proto$/, "protoc-gen-ts_proto.cmd")
        : args[1];

    for (const file of glob.sync(pattern, { absolute: true })) {
        generateProto(protoc, plugin, file);
    }
}

/**
 * Generates TypeScript code from the specified .proto file.
 * @param {string} protoc protoc executable path
 * @param {string} fname .proto file path
 * @returns {Promise<void>}
 */
async function generateProto(protoc, plugin, fname) {
    const dir = dirname(fname);
    await execFile(protoc, [
        `--plugin=protoc-gen-ts_proto=${plugin}`,
        `--proto_path=${dir}`,
        `--ts_proto_out=${dir}`,
        "--ts_proto_opt=esModuleInterop=true",
        "--ts_proto_opt=fileSuffix=.proto",
        "--ts_proto_opt=env=node",
        "--ts_proto_opt=snakeToCamel=false",
        basename(fname),
    ], { encoding: "utf8" });
}
