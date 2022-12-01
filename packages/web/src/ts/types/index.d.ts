type TransitType = "bus" | "rail" | "ferry";

type MarkerType = "marker" | "pointyCircle";

interface SearchRoute {
    type: TransitType;
    shortName: string;
    shortNameLower: string;
    longName: string;
    longNameLower: string;
    longNameWords: string[];
}
