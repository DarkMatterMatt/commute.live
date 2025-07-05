import type { Id, Primitive, RegionCode } from "@commutelive/common";

export function makeRegionalId(region: RegionCode, ...idComponents: Primitive[]): Id {
    const idComponentRegex = /^[a-zA-Z0-9_-]+$/;
    if (idComponents.some(s => !idComponentRegex.test(s?.toString() ?? ""))) {
        throw new Error(`Id components must match ${idComponentRegex}. Received ${idComponents}`);
    }
    return [region, ...idComponents].join("|") as Id;
}

export function parseRegionalId(id: Id): [RegionCode, string[]];
export function parseRegionalId(region: RegionCode, id: Id): string[];
export function parseRegionalId(regionOrId: Id | RegionCode, id?: Id): [RegionCode, string[]] | string[] {
    if (id == null) {
        return regionOrId.split("|");
    }

    const [region, ...idComponents] = id.split("|");
    if (region !== regionOrId) {
        throw new Error(`Expected region ${regionOrId}, got ${region}`);
    }
    return idComponents;
}
