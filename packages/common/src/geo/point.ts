import { defaultProjection } from "./MercatorProjection";

export interface LatLng {
    lat: number;
    lng: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface LatLngPoint extends LatLng, Point {}

export function addPointToLatLng<T extends LatLng>(latLng: T): T & Point {
    return { ...latLng, ...defaultProjection.fromLatLngToPoint(latLng) };
}

export function addLatLngToPoint<T extends Point>(point: T): T & LatLng {
    return { ...point, ...defaultProjection.fromPointToLatLng(point) };
}
