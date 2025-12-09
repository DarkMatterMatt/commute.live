import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Id, JSONSerializable, PromiseOr, RegionCode } from "@commutelive/common";
import { getLogger } from "~/log";
import type { DataSource } from "~/types";
import { AUS_SYD } from "./aus_syd/";
import { DEMO_NZL_AKL } from "./demo_nzl_akl/";
import { NZL_AKL } from "./nzl_akl/";

export { makeRegionalId, parseRegionalId } from "./base/id";

const log = getLogger("datasources");

export const ALL_REGIONS = new Map([
    DEMO_NZL_AKL,
    AUS_SYD,
    NZL_AKL,
].map(r => [r.code.toLowerCase(), r]));

/**
 * Active regions are those that are enabled in the environment.
 */
export const regions = new Map<RegionCode, DataSource>();

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
    return regions.get(region.toLowerCase() as RegionCode) ?? null;
}

export function getMQTTForVehicleUpdates(id: Id) {
    return `vehicles/${id}`;
}

export function getMQTTForTripUpdates(id: Id) {
    return `trips/${id}`;
}

export async function initialize(cacheDir: string, selectRegions: "all" | string[]): Promise<void> {
    // select the regions to initialize
    const lowercaseSelectRegions = selectRegions === "all" ? "all" : selectRegions.map(r => r.toLowerCase());
    if (lowercaseSelectRegions === "all") {
        log.info("Initializing default regions.");
        for (const [regionCode, region] of ALL_REGIONS) {
            regions.set(regionCode as RegionCode, region);
        }
    }
    else {
        log.info("Initializing selected regions:", lowercaseSelectRegions);
        for (const r of lowercaseSelectRegions) {
            const region = ALL_REGIONS.get(r);
            if (region == null) {
                throw new Error(`Unknown region ${r}`);
            }
            regions.set(r as RegionCode, region);
        }
    }

    // initialize each region
    const results = await mapRegions(async r => {
        const regionCache = path.join(cacheDir, r.code.toLowerCase());
        if (!existsSync(regionCache)) {
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

export async function getStatus(regions_?: DataSource[]) {
    const results: Record<RegionCode, JSONSerializable> = {};
    for (const r of regions_ ?? regions.values()) {
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

