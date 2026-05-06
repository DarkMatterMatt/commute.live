import HtmlMarker from "./HtmlMarker";
import Render from "./Render";

/**
 * A marker representing a transit stop/station.
 *
 * Displays as a hollow circle with the stroke split into colored segments
 * representing the routes that service this stop.
 */
export class StopMarker extends HtmlMarker {
    private readonly stopId: string;
    private readonly stopName: string;
    private colors: string[];

    constructor(
        stopId: string,
        position: google.maps.LatLng | google.maps.LatLngLiteral,
        colors: string[],
        name: string,
    ) {
        super({
            id: stopId,
            elem: Render.createStopMarkerSvg(colors),
            position,
        });

        this.stopId = stopId;
        this.stopName = name;
        this.colors = colors;
    }

    /**
     * Update the colors displayed on this stop marker.
     */
    public updateColors(colors: string[]): void {
        this.colors = colors;
        const newElement = Render.createStopMarkerSvg(colors);
        this.getHtmlElement().innerHTML = newElement.innerHTML;
    }

    public getStopId(): string {
        return this.stopId;
    }

    public getStopName(): string {
        return this.stopName;
    }

    public getColors(): string[] {
        return this.colors;
    }
}
