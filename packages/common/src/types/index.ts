export type JSONSerializable = (
    string | number | boolean | null
    | JSONSerializable[]
    | { [key: string]: JSONSerializable }
);

export type Primitive = string | number | boolean | null | undefined;

export type PromiseOr<T> = Promise<T> | T;

export type StrOrNull = string | null;
