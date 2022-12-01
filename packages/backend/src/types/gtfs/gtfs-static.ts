import type { LatLng, Point } from "@commutelive/common";

export interface ShapeLatLng extends LatLng {
    dist: number;
}

export interface ShapePoint extends ShapeLatLng, Point {}
