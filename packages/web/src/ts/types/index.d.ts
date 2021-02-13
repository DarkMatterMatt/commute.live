type TransitType = "bus" | "rail" | "ferry";

interface LatLng {
    lat: number;
    lng: number;
}

interface SearchRoute {
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
