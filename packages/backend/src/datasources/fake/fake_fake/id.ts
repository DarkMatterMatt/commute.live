import type { Id, RegionCode } from "@commutelive/common";
import { makeRegionalId, parseRegionalId } from "../../base/id";

export const regionCode: RegionCode = "FAKE_FAKE";

export function makeId(shortName: string): Id {
    return makeRegionalId(regionCode, shortName);
}

export function parseId(id: Id) {
    const [shortName] = parseRegionalId(regionCode, id);
    return { shortName };
}
