import { Preconditions } from "@commutelive/common";

export interface MapCanvasProjection {
    fromContainerPixelToLatLng(pixel: google.maps.Point, noClampNoWrap?: boolean): google.maps.LatLng

    fromDivPixelToLatLng(pixel: google.maps.Point, noClampNoWrap?: boolean): google.maps.LatLng

    fromLatLngToContainerPixel(latLng: google.maps.LatLng): google.maps.Point

    fromLatLngToDivPixel(latLng: google.maps.LatLng): google.maps.Point
}

export class CheckedMapCanvasProjection implements MapCanvasProjection {
    constructor(
        private readonly proj: google.maps.MapCanvasProjection,
    ) {}

    readonly fromContainerPixelToLatLng = (pixel: google.maps.Point, noClampNoWrap?: boolean): google.maps.LatLng => {
        return Preconditions.checkExists(this.proj.fromContainerPixelToLatLng(pixel, noClampNoWrap));
    };

    readonly fromDivPixelToLatLng = (pixel: google.maps.Point, noClampNoWrap?: boolean): google.maps.LatLng => {
        return Preconditions.checkExists(this.proj.fromDivPixelToLatLng(pixel, noClampNoWrap));
    };

    readonly fromLatLngToContainerPixel = (latLng: google.maps.LatLng): google.maps.Point => {
        return Preconditions.checkExists(this.proj.fromLatLngToContainerPixel(latLng));
    };

    readonly fromLatLngToDivPixel = (latLng: google.maps.LatLng): google.maps.Point => {
        return Preconditions.checkExists(this.proj.fromLatLngToDivPixel(latLng));
    };

    readonly getWorldWidth = (): number => {
        return Preconditions.checkExists(this.proj.getWorldWidth());
    };
}

export class ShiftedMapCanvasProjection implements MapCanvasProjection {
    constructor(
        private proj: MapCanvasProjection | null,
        private top: number,
        private left: number,
    ) {}

    readonly isValid = (): boolean => {
        return this.proj != null;
    };

    readonly update = (proj: MapCanvasProjection, top: number, left: number): void => {
        this.proj = proj;
        this.top = top;
        this.left = left;
    };

    readonly shiftPixel = (pixel: google.maps.Point): google.maps.Point => {
        return new google.maps.Point(pixel.x + this.left, pixel.y + this.top);
    };

    readonly unshiftPixel = (pixel: google.maps.Point): google.maps.Point  => {
        return new google.maps.Point(pixel.x - this.left, pixel.y - this.top);
    };

    readonly fromContainerPixelToLatLng = (pixel: google.maps.Point, nowrap?: boolean): google.maps.LatLng => {
        const proj = Preconditions.checkExists(this.proj);
        return proj.fromContainerPixelToLatLng(this.shiftPixel(pixel), nowrap);
    };

    readonly fromDivPixelToLatLng = (pixel: google.maps.Point, nowrap?: boolean): google.maps.LatLng => {
        const proj = Preconditions.checkExists(this.proj);
        return proj.fromDivPixelToLatLng(this.shiftPixel(pixel), nowrap);
    };

    readonly fromLatLngToContainerPixel = (latLng: google.maps.LatLng): google.maps.Point => {
        const proj = Preconditions.checkExists(this.proj);
        return this.unshiftPixel(proj.fromLatLngToContainerPixel(latLng));
    };

    readonly fromLatLngToDivPixel = (latLng: google.maps.LatLng): google.maps.Point => {
        const proj = Preconditions.checkExists(this.proj);
        return this.unshiftPixel(proj.fromLatLngToDivPixel(latLng));
    };
}
