import type { Id } from "@commutelive/common";

type MarkerType = "marker" | "pointyCircle";

interface SearchRoute {
    id: Id;
    type: number;
    shortName: string;
    shortNameLower: string;
    longName: string;
    longNameLower: string;
    longNameWords: string[];
}
