import type { RegionCode } from "./id";

export type RegionResult = {
    code: RegionCode,
    country: string,
    region: string,
    attributionHTML: string,
};
