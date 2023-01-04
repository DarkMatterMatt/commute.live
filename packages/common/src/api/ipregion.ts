import type { LatLng } from "../geo";
import type { RegionDataResult } from "./regions";

export interface IpRegionResult {
    region: RegionDataResult;
    userLocation: LatLng;
}
