import type { Id, RegionCode } from "@commutelive/common";
import { makeRegionalId, parseRegionalId } from "../base/id";

export const regionCode: RegionCode = "AUS_SYD";

export function makeId(type: number, shortName: string): Id {
    shortName = shortName.replace(/\//g, "--SLASH--");
    return makeRegionalId(regionCode, type, shortName);
}

export function parseId(id: Id) {
    const [type, shortName] = parseRegionalId(regionCode, id);
    return {
        type: Number.parseInt(type),
        shortName: shortName.replace(/--SLASH--/g, "/"),
    };
}
