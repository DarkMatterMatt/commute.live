import type { DataSource } from "~/types";
import path from "node:path";
import { NZL_AKL } from "./nzl_akl/";

export const regions = new Map([
    NZL_AKL,
].map(r => [r.code, r]));

export function checkForStaticUpdates(cacheDir: string) {
    return Promise.allSettled([...regions.values()].map(async r => {
        const regionCache = path.join(cacheDir, r.code);
        const wasUpdated = await r.checkForStaticUpdate(regionCache);
        return [r, wasUpdated] as [DataSource, boolean];
    }));
}
