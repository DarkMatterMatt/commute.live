import type { LatLng } from "../geo/";
import type { RegionCode } from "./id";

export type RegionResult = {
    code: RegionCode,
    location: LatLng,
    country: string,
    region: string,
    attributionHTML: string,
};
