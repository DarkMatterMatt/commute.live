import type { StrOrNull } from "~/types";
import type { LatLng } from "../geo";
import type { Id } from "./id";
import type { LiveVehicle } from "./websocket";

export type RouteDataResult = {
    id: Id;
    longNames: [StrOrNull, StrOrNull];
    polylines: [LatLng[], LatLng[]];
    shortName: string;
    type: number;
    vehicles: LiveVehicle[];
};

export type RoutesDataResult = RouteDataResult[];

export type PartialRouteDataResult<T extends keyof RouteDataResult> =
    Pick<RouteDataResult, T> & Partial<RouteDataResult>;

export type PartialRoutesDataResult<T extends keyof RouteDataResult> = PartialRouteDataResult<T>[];
