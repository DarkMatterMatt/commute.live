class ShiftedMapCanvasProjection {
    private proj: ShiftedMapCanvasProjection | google.maps.MapCanvasProjection;

    private top: number;

    private left: number;

    constructor(proj: ShiftedMapCanvasProjection | google.maps.MapCanvasProjection, top: number, left: number) {
        this.update(proj, top, left);
    }

    update(proj: ShiftedMapCanvasProjection | google.maps.MapCanvasProjection, top: number, left: number): void {
        this.proj = proj;
        this.top = top;
        this.left = left;
    }

    shiftPixel(pixel: google.maps.Point): google.maps.Point {
        return new google.maps.Point(pixel.x + this.left, pixel.y + this.top);
    }

    unshiftPixel(pixel: google.maps.Point): google.maps.Point {
        return new google.maps.Point(pixel.x - this.left, pixel.y - this.top);
    }

    fromContainerPixelToLatLng(pixel: google.maps.Point, nowrap?: boolean): google.maps.LatLng {
        return this.proj.fromContainerPixelToLatLng(this.shiftPixel(pixel), nowrap);
    }

    fromDivPixelToLatLng(pixel: google.maps.Point, nowrap?: boolean): google.maps.LatLng {
        return this.proj.fromDivPixelToLatLng(this.shiftPixel(pixel), nowrap);
    }

    fromLatLngToContainerPixel(latLng: google.maps.LatLng): google.maps.Point {
        return this.unshiftPixel(this.proj.fromLatLngToContainerPixel(latLng));
    }

    fromLatLngToDivPixel(latLng: google.maps.LatLng): google.maps.Point {
        return this.unshiftPixel(this.proj.fromLatLngToDivPixel(latLng));
    }
}

export default ShiftedMapCanvasProjection;
