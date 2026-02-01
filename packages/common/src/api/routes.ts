import type { LatLng } from "~/geo";
import type { StrOrNull } from "~/types";
import type { Id, RegionCode } from "./id";
import type { LiveVehicle } from "./websocket";

export interface Stop {
    /** Unique identifier for the stop. */
    stopId: string;
    /** Physical location. */
    location: LatLng;
    /** The user-facing stop name. */
    name: string;
}

export interface RouteDataResult {
    id: Id;
    region: RegionCode;
    longNames: [StrOrNull, StrOrNull];
    polylines: [LatLng[] | null, LatLng[] | null];
    stops: [Stop[] | null, Stop[] | null];
    shortName: string;
    type: number;
    vehicles: LiveVehicle[];
}

export type RoutesDataResult = RouteDataResult[];

export type PartialRouteDataResult<T extends keyof RouteDataResult> =
    Pick<RouteDataResult, T> & Partial<RouteDataResult>;

export type PartialRoutesDataResult<T extends keyof RouteDataResult = never> = Readonly<{
    message: string;
    routes: readonly PartialRouteDataResult<T>[];
    unknown: Id[];
}>;
