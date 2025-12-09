import type { LatLng } from "../geo";

export interface IpLocationResult {
    userLocation: LatLng;
}

export type IpLocationDataResult = Readonly<{
    message: string;
    result: IpLocationResult;
}>;
