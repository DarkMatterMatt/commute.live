import type { LatLng } from "../geo";
import type { Id, RegionCode } from "./id";

export interface RegionDataResult {
    code: RegionCode;
    location: LatLng;
    country: string;
    region: string;
    attributionHTML: string;
    defaultZoom: number;
    defaultRouteIds: Id[];
}

export type RegionsDataResult = RegionDataResult[];

export type PartialRegionDataResult<T extends keyof RegionDataResult> =
    Pick<RegionDataResult, T> & Partial<RegionDataResult>;

export type PartialRegionsDataResult<T extends keyof RegionDataResult> = PartialRegionDataResult<T>[];
