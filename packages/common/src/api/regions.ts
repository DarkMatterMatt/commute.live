import type { LatLng } from "~/geo";
import type { Id, RegionCode } from "./id";

export type RegionDataResult = {
    code: RegionCode;
    location: LatLng;
    country: string;
    region: string;
    attributionHTML: string;
    defaultZoom: number;
    defaultRouteIds: Id[];
}

export type RegionsDataResult = readonly RegionDataResult[];

export type PartialRegionDataResult<T extends keyof RegionDataResult> =
    Readonly<Pick<RegionDataResult, T> & Partial<RegionDataResult>>;

export type PartialRegionsDataResult<T extends keyof RegionDataResult = never> = Readonly<{
    message: string;
    regions: readonly PartialRegionDataResult<T>[]
    unknown: RegionCode[]
}>;
