import "@simonwep/pickr/dist/themes/monolith.min.css";
import Pickr from "@simonwep/pickr";
import { hex } from "color-convert/route";
import { largeScreen } from "./Helpers";

import React from "./JsxElem";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const convert = require("color-convert");

const MAX_FILTER_RESULTS = 20;
const SUGGESTED_COLORS = [
    "#E94537",
    "#E67C13",
    "#CECE1D",
    "#1DCE1D",
    "#5555FF",
    "#9400D3",
    "#D30094",
];

export interface MarkerIconOptions {
    type: "marker";
    color: string;
    directionId: LiveVehicle["directionId"];
}

interface TransitIconOptions {
    type: TransitType;
    fill: string;
    opacity?: number;
    backgroundFill?: string;
    backgroundOpacity?: number;
    backgroundBorderRadius?: number;
}

let instance: Render = null;

class Render {
    locationCenter: google.maps.Marker;

    locationAccuracy: google.maps.Circle;

    private constructor() {
        //
    }

    static getInstance(): Render {
        if (instance == null) {
            instance = new Render();
        }
        return instance;
    }

    showLocation(map: google.maps.Map, coords: GeolocationCoordinates): void {
        if (map == null) {
            if (this.locationCenter != null) {
                this.locationCenter.setMap(null);
            }
            if (this.locationAccuracy != null) {
                this.locationAccuracy.setMap(null);
            }
            return;
        }

        if (this.locationCenter == null) {
            this.locationCenter = new google.maps.Marker({
                icon:   Render.createLocationIcon(),
                zIndex: 100,
            });
        }
        if (this.locationAccuracy == null) {
            this.locationAccuracy = new google.maps.Circle({
                fillColor:    "#4286f5",
                fillOpacity:  0.2,
                strokeColor:  "#4286f5",
                strokeWeight: 0.5,
            });
        }
        const pos = new google.maps.LatLng(coords.latitude, coords.longitude);

        this.locationCenter.setPosition(pos);
        this.locationCenter.setMap(map);
        this.locationAccuracy.setRadius(coords.accuracy);
        this.locationAccuracy.setCenter(pos);
        this.locationAccuracy.setMap(map);
    }

    /**
     * Choose to use light/dark text based on the background color
     * @see https://stackoverflow.com/a/3943023/6595777
     */
    static shouldUseLightText(backgroundHexStr: string): boolean {
        const [red, green, blue] = (convert.hex as hex).rgb(backgroundHexStr);
        return red * 0.299 + green * 0.587 + blue * 0.114 <= 186;
    }

    static getNewColor(existingRoutes: { color: string }[]): string {
        // return the first SUGGESTED_COLOR that hasn't already been used
        return SUGGESTED_COLORS.find(c => !existingRoutes.find(r => r.color === c)) || SUGGESTED_COLORS[0];
    }

    static createLocationIcon(): google.maps.Icon {
        /* eslint-disable max-len */
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="12" style="fill: #fff"/>
                <circle cx="12" cy="12" r="10.5" style="fill: #4286f5"/>
            </svg>
        `;

        return {
            url:        `data:image/svg+xml;utf8,${svg.replace(/\s+/g, " ").replace(/#/g, "%23")}`,
            scaledSize: new google.maps.Size(12, 12),
            anchor:     new google.maps.Point(6, 6),
        };
    }

    static createTransitIcon(options: TransitIconOptions): google.maps.Icon {
        /* eslint-disable max-len */
        const defaults = {
            opacity:                1,
            backgroundFill:         "#FFF",
            backgroundOpacity:      0,
            backgroundBorderRadius: 4,
        };
        const { type, fill, opacity, backgroundFill, backgroundOpacity, backgroundBorderRadius } = { ...defaults, ...options };

        let svg = "";

        switch (type) {
            case "bus":
                svg = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <rect style="fill: ${backgroundFill}; opacity: ${backgroundOpacity}" width="24" height="24" rx="${backgroundBorderRadius}" />
                        <path style="fill: ${fill}; opacity: ${opacity}" d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                    </svg>
                `;
                break;
            case "ferry":
                svg = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <rect style="fill: ${backgroundFill}; opacity: ${backgroundOpacity}" width="24" height="24" rx="${backgroundBorderRadius}" />
                        <path style="fill: ${fill}; opacity: ${opacity}" d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
                        </svg>
                `;
                break;
            case "rail":
                svg = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <rect style="fill: ${backgroundFill}; opacity: ${backgroundOpacity}" width="24" height="24" rx="${backgroundBorderRadius}" />
                        <path style="fill: ${fill}; opacity: ${opacity}" d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z"/>
                    </svg>
                `;
                break;
            default:
                // impossible
        }

        return {
            url:    `data:image/svg+xml;utf8,${svg.replace(/\s+/g, " ").replace(/#/g, "%23")}`,
            anchor: new google.maps.Point(12, 12),
        };
    }

    static createMarkerSvg({ type, color, directionId }: MarkerIconOptions): HTMLDivElement {
        /* eslint-disable max-len */
        switch (type) {
            default:
                throw new Error(`Invalid marker icon type: ${type}`);
            case "marker":
                return (
                  <div style={{ position: "absolute", left: "-13.5px", top: "-43px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 57.96 90" style={{ height: "43px" }}>
                      <path style={{ fill: color }} d="M29,89c-1.28,0-2.81-.64-2.9-3.67C25.75,74.12,20,65.18,13.92,55.73l-.14-.23c-.94-1.45-1.9-2.89-2.86-4.33C8.58,47.64,6.15,44,4.11,40.2a25.74,25.74,0,0,1,.57-25.53A28.11,28.11,0,0,1,29,1a28.09,28.09,0,0,1,24.3,13.67,25.74,25.74,0,0,1,.57,25.53c-2,3.79-4.46,7.44-6.81,11-1,1.44-1.92,2.88-2.85,4.33l-.14.23C38,65.18,32.2,74.12,31.88,85.33,31.8,88.36,30.26,89,29,89Z" />
                      <path style={{ fill: "#FFF" }} d="M29,2c20.09.12,33.22,20.53,24,37.73C50.13,45,46.59,49.91,43.34,55c-6,9.4-12.13,18.76-12.45,30.34,0,1.24-.31,2.7-1.9,2.7h0c-1.59,0-1.86-1.46-1.9-2.7C26.74,73.72,20.66,64.36,14.62,55,11.36,49.91,7.82,45,5,39.73-4.25,22.53,8.88,2.12,29,2m0-2h0A29.11,29.11,0,0,0,3.82,14.16a26.74,26.74,0,0,0-.59,26.52c2.06,3.83,4.5,7.5,6.86,11C11,53.14,12,54.6,12.93,56.05l.15.22c6,9.34,11.68,18.16,12,29.08.12,4.31,3,4.65,3.9,4.65s3.79-.34,3.91-4.65c.31-10.92,6-19.74,12-29.08l.14-.22c.93-1.45,1.9-2.91,2.84-4.32,2.36-3.55,4.8-7.22,6.86-11a26.74,26.74,0,0,0-.59-26.52A29.08,29.08,0,0,0,29,0Z" />
                      <path style={{ fill: directionId === 0 ? "#000" : "#FFF", opacity: 0.5 }} d="M19.48,29a9.5,9.5 0 1,0 19,0a9.5,9.5 0 1,0 -19,0" />
                    </svg>
                  </div>
                );
        }
    }

    static createActiveRoute(routeData: SearchRoute, color: string, showPickr: boolean,
        onColorChange: (routeData: SearchRoute, color: string) => void,
        onRemove: (routeData: SearchRoute) => void): HTMLDivElement {
        //
        if (routeData.$activeRoute) {
            return routeData.$activeRoute;
        }

        const icon = Render.createTransitIcon({
            type: routeData.type,
            fill: Render.shouldUseLightText(color) ? "#FFF" : "#000",
        });
        const $pickr = <img class="pickr btn" src={icon.url} alt="Change colour" />;
        const $remove = (
          <svg class="remove btn" viewBox="0 0 24 24">
            <path fill="none" d="M0 0h24v24H0V0z" />
            <path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" />
          </svg>
        );

        const $parent = (
          <div class="route row">
            {$pickr}
            <div class="col">
              <span class="short name">{routeData.shortName}</span>
              <span class="long name">{routeData.longName}</span>
            </div>
            {$remove}
          </div>
        );
        $parent.style.setProperty("--color", color);

        const pickr = new Pickr({
            el:          $pickr,
            theme:       "monolith",
            lockOpacity: true,
            useAsButton: true,
            default:     color,
            swatches:    SUGGESTED_COLORS,

            components: {
                preview: true,
                hue:     true,

                interaction: {
                    input: true,
                    save:  true,
                },
            },
        });

        pickr.on("save", (newColor: Pickr.HSVaColor) => {
            pickr.hide();

            const newColorStr = newColor.toHEXA().toString();
            $parent.style.setProperty("--color", newColorStr);
            $pickr.src = Render.createTransitIcon({
                type: routeData.type,
                fill: Render.shouldUseLightText(newColorStr) ? "#FFF" : "#000",
            }).url;
            onColorChange(routeData, newColorStr);
        });

        if (showPickr) {
            setTimeout(() => pickr.show(), 0);
        }

        $remove.addEventListener("click", () => {
            pickr.destroyAndRemove();
            onRemove(routeData);
        });

        // eslint-disable-next-line no-param-reassign
        routeData.$activeRoute = $parent;
        return $parent;
    }

    static createSearchResult(routeData: SearchRoute, onAdd: (routeData: SearchRoute) => void): HTMLDivElement {
        if (routeData.$searchResult) {
            return routeData.$searchResult;
        }

        let fill = "";
        switch (routeData.type) {
            case "bus":
                fill = "#093";
                break;
            case "ferry":
                fill = "#33f";
                break;
            case "rail":
                fill = "#fc0";
                break;
            default:
                // impossible
        }

        const icon = Render.createTransitIcon({
            type: routeData.type,
            fill,
        });

        const $parent = (
          <div class="route btn row">
            <img src={icon.url} alt={routeData.type} />
            <div class="col">
              <span class="short name">{routeData.shortName}</span>
              <span class="long name">{routeData.longName}</span>
            </div>
          </div>
        );
        $parent.addEventListener("click", () => onAdd(routeData));

        // eslint-disable-next-line no-param-reassign
        routeData.$searchResult = $parent;
        return $parent;
    }

    static renderFilterDropdown($dropdown: HTMLElement, routes: SearchRoute[], onAdd: (routeData: SearchRoute) => void): void {
        /* eslint-disable no-param-reassign */
        $dropdown.innerHTML = "";

        if (routes.length === 0) {
            $dropdown.classList.remove("show");
            return;
        }

        $dropdown.classList.add("show");
        routes.slice(0, MAX_FILTER_RESULTS).forEach(route => {
            $dropdown.append(Render.createSearchResult(route, onAdd));
        });

        if (largeScreen()) {
            $dropdown.style.maxWidth = "none";
            $dropdown.style.borderBottomRightRadius = "";
            const rect = $dropdown.getBoundingClientRect();

            // prevent overflowing body
            if (rect.right > document.documentElement.clientWidth) {
                $dropdown.style.maxWidth = `${document.documentElement.clientWidth - rect.left}px`;
                $dropdown.style.borderBottomRightRadius = "0";
            }
        }
    }
}

export default Render;

export const render = Render.getInstance();
