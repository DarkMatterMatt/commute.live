export type JSONSerializable = (
    string | number | boolean | null
    | JSONSerializable[]
    | { [key: string]: JSONSerializable }
);

export type Primitive = string | number | boolean | null | undefined;

export type PromiseOr<T> = Promise<T> | T;

export type StrOrNull = string | null;

// Path, PathValue, PathImpl: adapted from https://twitter.com/diegohaz/status/1309644466219819008

/**
 * Compute dot-notation object traversal strings from a given type.
 *
 * @example Path<{ foo: { bar: string } }> // "foo.bar" | "foo"
 */
export type Path<T, WithArray extends boolean = true> = PathImpl<T, keyof T, WithArray> | keyof T;

/**
 * Find value type from dot-notation object traversal.
 *
 * @example PathValue<{ foo: { bar: string } }, "foo.bar"> // string
 */
export type PathValue<T, P extends Path<T>> =
  P extends `${infer K}.${infer Rest}`
      ? K extends keyof T
          ? Rest extends Path<T[K]>
              ? PathValue<T[K], Rest>
              : never
          : never
      : P extends keyof T
          ? T[P]
          : never;

type PathImpl<T, K extends keyof T, WithArray extends boolean> = K extends string
    ? T[K] extends Record<string, any>
        ? T[K] extends ArrayLike<any>
            ? WithArray extends true
                ? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>, WithArray>}`
                : K
            : K | `${K}.${PathImpl<T[K], keyof T[K], WithArray>}`
        : K
    : never;
