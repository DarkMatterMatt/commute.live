import { NZL_AKL } from "./nzl_akl/index.js";

export const regions = new Map([
    NZL_AKL,
].map(r => [r.code, r]));
