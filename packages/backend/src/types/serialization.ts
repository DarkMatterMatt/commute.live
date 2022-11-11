export type Primitive = string | number | boolean | null | undefined;

export type JSONSerializable = (
    string | number | boolean | null
    | JSONSerializable[]
    | { [key: string]: JSONSerializable }
);
