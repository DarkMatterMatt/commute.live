import type { Id, RegionCode } from "@commutelive/common";

type MarkerType = "marker" | "pointyCircle";

interface SearchRoute {
    region: RegionCode;
    id: Id;
    type: number;
    shortName: string;
    shortNameLower: string;
    longName: string;
    longNameLower: string;
    longNameWords: string[];
}
