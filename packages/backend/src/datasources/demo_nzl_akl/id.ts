import type { Id, RegionCode } from "@commutelive/common";
import { makeRegionalId, parseRegionalId } from "..";

export const regionCode: RegionCode = "FAKE_NZL_AKL";

export function makeId(shortName: string): Id {
    return makeRegionalId(regionCode, shortName);
}

export function parseId(id: Id) {
    const [shortName] = parseRegionalId(regionCode, id);
    return { shortName };
}
