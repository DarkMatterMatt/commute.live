/**
 * Resolves a string to a TypeScript numeric enum. Does not support string enums.
 *
 * @usage `assert parseEnum(Verbosity, "HIGH") === 2`
 */
export function parseEnum<T extends string, TEnumValue extends number>(
    enumType: { [key in T]: TEnumValue },
    val: string | number,
): TEnumValue {
    if (typeof val === "string") {
        const result = (enumType as any)[val];
        if (typeof result === "number") {
            return result as TEnumValue;
        }
    }
    else if (typeof val === "number") {
        const result = (enumType as any)[val];
        if (typeof result === "string") {
            return val as TEnumValue;
        }
    }

    throw new Error(`Could not resolve enum type for ${val}, should be one of ${[...Object.keys(enumType)]}`);
}

/**
 * Resolves a string to a TypeScript string enum. Does not support numeric enums.
 *
 * @usage `assert parseStringEnum(Verbosity, "HIGH") === "high"`
 */
export function parseStringEnum<T extends string, TEnumValue extends string>(
    enumType: { [key in T]: TEnumValue },
    val: string,
): TEnumValue {
    if (Object.keys(enumType).includes(val)) {
        return (enumType as any)[val];
    }
    if (Object.values(enumType).includes(val)) {
        return val as TEnumValue;
    }

    const options = [...Object.values(enumType), ...Object.keys(enumType)];
    throw new Error(`Could not resolve enum type for ${val}, should be one of ${options}`);
}
