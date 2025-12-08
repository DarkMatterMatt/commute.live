import type { StrOrNull } from "~/types";
import type { Id } from "./id";

export interface ListRouteResult {
    id: Id;
    longNames: [StrOrNull, StrOrNull];
    shapeIds: [StrOrNull, StrOrNull];
    shortName: string;
    type: number;
}

export type ListRoutesResult = Readonly<{
    message: string;
    routes: readonly ListRouteResult[]
}>;
