export type unixTimestamp = number;

export interface LiveVehicle {
    shortName: string;
    vehicleId: string;
    lastUpdated: unixTimestamp;
    directionId: 0 | 1;
    position: google.maps.LatLng | google.maps.LatLngLiteral;
}

export interface SearchRoute {
    type?: "bus" | "rail" | "ferry";
    shortName: string;
    shortNameLower?: string;
    longName?: string;
    longNameLower?: string;
    longNameWords?: string[];
    filterWeight?: number;
    $searchResult?: HTMLDivElement;
    $activeRoute?: HTMLDivElement;
}
