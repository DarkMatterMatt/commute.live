import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Id, JSONSerializable, Primitive, PromiseOr, RegionCode } from "@commutelive/common";
import { getLogger } from "~/log";
import type { DataSource } from "~/types";
import { AUS_SYD } from "./aus_syd/";
import { DEMO_NZL_AKL } from "./demo_nzl_akl/";
import { NZL_AKL } from "./nzl_akl/";

const log = getLogger("datasources");

export const regions = new Map([
    DEMO_NZL_AKL,
    AUS_SYD,
    NZL_AKL,
].map(r => [r.code.toLowerCase(), r]));

export const availableRegions = [...regions.keys()] as RegionCode[];

export async function mapRegions<T>(
    callbackfn: (value: DataSource) => PromiseOr<T>,
): Promise<PromiseSettledResult<Awaited<T>>[]> {
    return Promise.allSettled([...regions.values()].map(r => callbackfn(r)));
}

export async function mapRegionsSync<T>(
    callbackfn: (value: DataSource) => PromiseOr<T>,
): Promise<PromiseSettledResult<Awaited<T>>[]> {
    const results: PromiseSettledResult<Awaited<T>>[] = [];
    for (const r of regions.values()) {
        try {
            results.push({
                status: "fulfilled",
                value: await callbackfn(r),
            });
        }
        catch (err) {
            results.push({
                status: "rejected",
                reason: err,
            });
        }
    }
    return results;
}

export function getRegion(region: RegionCode | string) {
    return regions.get(region.toLowerCase()) ?? null;
}

export function getMQTTForVehicleUpdates(id: Id) {
    return `vehicles/${id}`;
}

export function getMQTTForTripUpdates(id: Id) {
    return `trips/${id}`;
}

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

export async function initialize(cacheDir: string): Promise<void> {
    // initialize each region
    const results = await mapRegions(async r => {
        const regionCache = path.join(cacheDir, r.code.toLowerCase());
        if (!existsSync(regionCache)){
            mkdirSync(regionCache, { recursive: true });
        }
        await r.initialize(regionCache);
    });
    for (const result of results) {
        if (result.status === "rejected") {
            log.error("Failed to initialize region.", result.reason);
        }
    }
}

export async function checkForRealtimeUpdates() {
    const results = await mapRegions(async r => {
        const wasUpdated = await r.checkForRealtimeUpdate();
        return [r, wasUpdated] as [DataSource, boolean];
    });
    for (const result of results) {
        if (result.status === "rejected") {
            log.error("Failed checking for realtime updates.", result.reason);
        }
    }
}

export async function checkForStaticUpdates() {
    const results = await mapRegionsSync(async r => {
        const wasUpdated = await r.checkForStaticUpdate();
        return [r, wasUpdated] as [DataSource, boolean];
    });
    for (const result of results) {
        if (result.status === "rejected") {
            log.error("Failed checking for static updates.", result.reason);
        }
    }
}

export async function getStatus() {
    const results: Record<RegionCode, JSONSerializable> = {};
    for (const r of regions.values()) {
        try {
            results[r.code] = await r.getStatus();
        }
        catch (err) {
            if (err instanceof Error) {
                results[r.code] = { name: err.name, message: err.message };
            }
            else {
                results[r.code] = JSON.stringify(err);
            }
        }
    }
    return results;
}

