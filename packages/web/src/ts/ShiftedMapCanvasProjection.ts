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

    public readonly fromContainerPixelToLatLng = (
        pixel: google.maps.Point,
        noClampNoWrap?: boolean,
    ): google.maps.LatLng =>
        Preconditions.checkExists(this.proj.fromContainerPixelToLatLng(pixel, noClampNoWrap));

    public readonly fromDivPixelToLatLng = (pixel: google.maps.Point, noClampNoWrap?: boolean): google.maps.LatLng =>
        Preconditions.checkExists(this.proj.fromDivPixelToLatLng(pixel, noClampNoWrap));

    public readonly fromLatLngToContainerPixel = (latLng: google.maps.LatLng): google.maps.Point =>
        Preconditions.checkExists(this.proj.fromLatLngToContainerPixel(latLng));

    public readonly fromLatLngToDivPixel = (latLng: google.maps.LatLng): google.maps.Point =>
        Preconditions.checkExists(this.proj.fromLatLngToDivPixel(latLng));

    public readonly getWorldWidth = (): number =>
        Preconditions.checkExists(this.proj.getWorldWidth());
}

export class ShiftedMapCanvasProjection implements MapCanvasProjection {
    constructor(
        private proj: MapCanvasProjection | null,
        private top: number,
        private left: number,
    ) {}

    public readonly isValid = (): boolean => this.proj != null;

    public readonly update = (proj: MapCanvasProjection, top: number, left: number): void => {
        this.proj = proj;
        this.top = top;
        this.left = left;
    };

    public readonly shiftPixel = (pixel: google.maps.Point): google.maps.Point =>
        new google.maps.Point(pixel.x + this.left, pixel.y + this.top);

    public readonly unshiftPixel = (pixel: google.maps.Point): google.maps.Point =>
        new google.maps.Point(pixel.x - this.left, pixel.y - this.top);

    public readonly fromContainerPixelToLatLng = (pixel: google.maps.Point, nowrap?: boolean): google.maps.LatLng =>
        Preconditions.checkExists(this.proj).fromContainerPixelToLatLng(this.shiftPixel(pixel), nowrap);

    public readonly fromDivPixelToLatLng = (pixel: google.maps.Point, nowrap?: boolean): google.maps.LatLng =>
        Preconditions.checkExists(this.proj).fromDivPixelToLatLng(this.shiftPixel(pixel), nowrap);

    public readonly fromLatLngToContainerPixel = (latLng: google.maps.LatLng): google.maps.Point =>
        this.unshiftPixel(Preconditions.checkExists(this.proj).fromLatLngToContainerPixel(latLng));

    public readonly fromLatLngToDivPixel = (latLng: google.maps.LatLng): google.maps.Point =>
        this.unshiftPixel(Preconditions.checkExists(this.proj).fromLatLngToDivPixel(latLng));
}
