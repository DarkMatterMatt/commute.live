import type { LatLng } from "../geo/";
import type { RegionCode } from "./id";

export interface RegionResult {
    code: RegionCode;
    location: LatLng;
    country: string;
    region: string;
    attributionHTML: string;
}
