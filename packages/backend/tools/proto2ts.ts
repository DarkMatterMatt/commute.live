import fs from "fs";

interface ProtoObj {
    _interfaceType: string;

    /**
     * Similar to Java package paths, will be `[Ancestor, SubMessage]`
     * for a message called `ThisMessage` nested within a message called `SubMessage`.
     */
    typePath: string[];

    /**
     * Similar to Java package paths, will be `ThisMessage`
     * for a message called `ThisMessage` nested within a message called `SubMessage`.
     */
    name: string;

    fields: Record<string, unknown>[];
}

interface ProtoEnum extends ProtoObj {
    _interfaceType: "enum";

    fields: {
        name: string;
        value: number;
    }[];
}

interface ProtoMessage extends ProtoObj {
    _interfaceType: "message";

    fields: {
        isRequired: boolean;
        isArray: boolean;
        name: string;
        typePath: string[];
        typeName: string;
    }[];
}

type ProtoType = ProtoEnum | ProtoMessage;

const bytesPrimitiveType = "Buffer";

function toFullName(typePath: string[], typeName: string): string {
    return [...typePath, typeName].join("$");
}

function resolveType(types: Map<string, ProtoType>, typePath: string[], typeName: string): string {
    // always resolve primitives first
    const primitives = new Map([
        ["double", "number"],
        ["float", "number"],
        ["int32", "number"],
        ["int64", "number"],
        ["uint32", "number"],
        ["uint64", "number"],
        ["sint32", "number"],
        ["sint64", "number"],
        ["fixed32", "number"],
        ["fixed64", "number"],
        ["sfixed32", "number"],
        ["sfixed64", "number"],
        ["bool", "boolean"],
        ["string", "string"],
        ["bytes", bytesPrimitiveType],
    ]);
    const prim = primitives.get(typeName);
    if (prim != null) {
        return prim;
    }

    // find longest matching type path
    for (let i = typePath.length; i >= 0; i--) {
        const fullName = toFullName(typePath.slice(0, i), typeName);
        if (types.has(fullName)) {
            return fullName;
        }
    }

    // failed to find type
    const fullName = toFullName(typePath, typeName);
    console.warn(`Could not find type for ${fullName}`);
    return fullName;
}

function processLines(
    types: Map<string, ProtoType>,
    typePath: string[],
    lineParts: string[][],
    start: number,
    end: number,
    type: "file" | "message" | "enum",
    name: string,
): void {
    let obj: null | ProtoType = null;
    if (type !== "file") {
        obj = {
            _interfaceType: type,
            typePath,
            name,
            fields: [],
        };
        types.set(toFullName(typePath, name), obj);
    }
    const nextTypePath = type === "file" ? typePath : [...typePath, name];

    for (let i = start; i < end; i++) {
        const parts = lineParts[i];
        const [firstWord] = parts;

        // ignore curly braces
        if (["{", "}"].includes(firstWord)) continue;

        // ignore lines starting with these keywords
        if (["syntax", "package", "option", "extensions", "reserved"].includes(firstWord)) {
            continue;
        }

        // new enum or message
        if (firstWord === "enum" || firstWord === "message") {
            i += 2; // skip this line and the following opening curly brace
            const newStart = i;
            let openCurlyBraceCount = 1;
            while (openCurlyBraceCount > 0) {
                i++;
                if (lineParts[i][0] === "{") openCurlyBraceCount++;
                if (lineParts[i][0] === "}") openCurlyBraceCount--;
            }
            processLines(types, nextTypePath, lineParts, newStart, i, firstWord, parts[1]);
            continue;
        }

        // enum specific fields
        if (obj?._interfaceType === "enum") {
            // enum field
            obj.fields.push({
                name: parts[0],
                value: Number.parseInt(parts[2]),
            });
            continue;
        }

        // message specific fields
        if (obj?._interfaceType === "message") {
            // singular field
            if (["required", "optional"].includes(parts[0])) {
                obj.fields.push({
                    isRequired: parts[0] === "required",
                    isArray: false,
                    name: parts[2],
                    typePath: nextTypePath,
                    typeName: parts[1],
                });
                continue;
            }

            // repeated field
            if (parts[0] === "repeated") {
                obj.fields.push({
                    isRequired: true,
                    isArray: true,
                    name: parts[2],
                    typePath: nextTypePath,
                    typeName: parts[1],
                });
                continue;
            }
        }

        console.warn(`Unable to process line: ${parts.join(" ")}`);
    }
}

function createOutput(types: Map<string, ProtoType>): string {
    // sort lexicographically
    const typesArr = [...types.entries()];
    typesArr.sort(([a], [b]) => {
        if (b.startsWith(a)) return -1;
        if (a.startsWith(b)) return 1;
        return a.localeCompare(b);
    });

    const output: string[] = [];
    for (const [k, v] of typesArr) {
        switch (v._interfaceType) {
            case "enum": {
                output.push(`export const enum ${k} {`);
                v.fields.sort((a, b) => a[1] - b[1]);
                for (const { name, value } of v.fields) {
                    output.push(`    ${name} = ${value},`);
                }
                output.push("}\n");
                break;
            }
            case "message": {
                output.push(`export interface ${k} {`);
                for (const { isRequired, name, typePath, typeName, isArray } of v.fields) {
                    const type = resolveType(types, typePath, typeName) + (isArray ? "[]" : "");
                    const required = isRequired ? "" : "?";
                    output.push(`    ${name}${required}: ${type};`);
                }
                output.push("}\n");
                break;
            }
            default:
                throw new Error(`Could not convert ${k} to TypeScript`);
        }
    }

    return output.join("\n");
}

async function processFile(protoPath: string) {
    let text: string;
    try {
        text = fs.readFileSync(protoPath, { encoding: "utf8" });
    }
    catch (e) {
        console.error(e);
        return;
    }
    console.log(`Processing: ${protoPath}`);

    const lines = text
        // remove block comments
        .replace(/\/\*.*?\*\//g, "")
        // remove line comments
        .replace(/\/\/.*?\n/g, "")
        // normalize whitespace
        .replace(/\s+/g, " ")
        // split by semi-colons and curly braces
        .replace(/([;{}])/g, "\n$1\n")
        .split(/\n/g)
        // trim whitespace
        .map(l => l.trim())
        // remove empty statements
        .filter(l => l.length > 0 && l !== ";");

    const parts = lines.map(l => l.split(" "));

    // state
    const types = new Map();

    processLines(types, [], parts, 0, parts.length, "file", protoPath);
    const output = createOutput(types);
    await fs.writeFileSync(`${protoPath.replace(/\.proto$/, "")}.d.ts`, output);
}

(async () => {
    const files = process.argv.slice(2);
    if (files.length === 0) {
        console.log("Usage: proto2ts.js file.proto file2.proto file3.proto");
        return;
    }

    const results = await Promise.allSettled(files.map(processFile));
    for (let i = 0; i < files.length; i++) {
        const result = results[i];
        if (result.status === "rejected") {
            console.error(`Error processing ${files[i]}`, result.reason);
        }
    }
})();
