import type { LatLng } from "../geo/";
import type { Id, RegionCode } from "./id";

export interface RegionResult {
    code: RegionCode;
    location: LatLng;
    country: string;
    region: string;
    attributionHTML: string;
    defaultZoom: number;
    defaultRouteIds: Id[];
}
