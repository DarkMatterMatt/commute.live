import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { PromiseOr, JSONSerializable } from "@commutelive/common";
import type { DataSource, RegionCode } from "~/types";
import { NZL_AKL } from "./nzl_akl/";

const regions = new Map([
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

export function getMQTTForVehicleUpdates(region: RegionCode | string, shortName: string) {
    return `${region}/vehicles/${shortName}`;
}

export function getMQTTForTripUpdates(region: RegionCode | string, shortName: string) {
    return `${region}/trips/${shortName}`;
}

export async function initialize(cacheDir: string): Promise<void> {
    // create cache directory
    if (!existsSync(cacheDir)){
        mkdirSync(cacheDir, { recursive: true });
    }

    // initialize each region
    await mapRegions(async r => {
        const regionCache = path.join(cacheDir, r.code.toLowerCase());
        if (!existsSync(regionCache)){
            mkdirSync(regionCache);
        }
        await r.initialize(regionCache);
    });
}

export async function checkForRealtimeUpdates() {
    return mapRegions(async r => {
        const wasUpdated = await r.checkForRealtimeUpdate();
        return [r, wasUpdated] as [DataSource, boolean];
    });
}

export async function checkForStaticUpdates() {
    return mapRegionsSync(async r => {
        const wasUpdated = await r.checkForStaticUpdate();
        return [r, wasUpdated] as [DataSource, boolean];
    });
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

