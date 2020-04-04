export type UnixTimestamp = number;

export type TransitType = "bus" | "rail" | "ferry";

export interface LiveVehicle {
    shortName: string;
    vehicleId: string;
    lastUpdatedUnix: UnixTimestamp;
    directionId: 0 | 1;
    position: google.maps.LatLng | google.maps.LatLngLiteral;
}

export interface SearchRoute {
    type?: TransitType;
    shortName: string;
    shortNameLower?: string;
    longName?: string;
    longNameLower?: string;
    longNameWords?: string[];
    filterWeight?: number;
    $searchResult?: HTMLDivElement;
    $activeRoute?: HTMLDivElement;
}
