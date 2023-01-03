import type { LatLng } from "../geo";
import type { RegionResult } from "./region";

export interface IpRegionResult {
    region: RegionResult;
    userLocation: LatLng;
}
