import type { JSONSerializable } from "../types";
import type { RegionCode } from "./id";

export type StatusDataResult = Readonly<{
    activeWebSockets: number;
    version: string | undefined;
    regions: Record<RegionCode, JSONSerializable>;
}>;
