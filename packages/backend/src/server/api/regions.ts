import { type RegionCode, type RegionDataResult, UnreachableError } from "@commutelive/common";
import { GetRouteGenerator } from "./GetRoute.js";

const validFields = [
    "code",
    "location",
    "country",
    "region",
    "attributionHTML",
    "defaultZoom",
    "defaultRouteIds",
] as const;

type ValidField = typeof validFields[number];

export const regionsRoute = new GetRouteGenerator({
    name: "regions",
    requiredParams: [] as const,
    optionalParams: ["fields", "regions"] as const,
    executor: async (route, { getRegion, params, regions }) => {
        const rawFields = params.fields ? params.fields.split(",") : validFields;
        for (const field of rawFields) {
            if (!validFields.includes(field as ValidField)) {
                return route.finish("error", {
                    message: `Unknown field: ${field}.`,
                    availableFields: validFields,
                });
            }
        }
        const fields = rawFields as ValidField[];
        const regionsToFetch = params.regions ? (params.regions.split(",") as RegionCode[]) : regions.map(r => r.code);

        const results: Partial<RegionDataResult>[] = [];
        const unknown: RegionCode[] = [];

        for (const regionCode of regionsToFetch) {
            const region = getRegion(regionCode);
            if (region == null) {
                unknown.push(regionCode);
                continue;
            }
            const result: Partial<RegionDataResult> = {};

            for (const f of fields) {
                switch (f) {
                    case "code": {
                        result["code"] = region.code;
                        break;
                    }

                    case "location": {
                        result["location"] = region.location;
                        break;
                    }

                    case "country": {
                        result["country"] = region.country;
                        break;
                    }

                    case "region":{
                        result["region"] = region.region;
                        break;
                    }

                    case "attributionHTML": {
                        result["attributionHTML"] = region.attributionHTML;
                        break;
                    }

                    case "defaultZoom": {
                        result["defaultZoom"] = region.defaultZoom;
                        break;
                    }

                    case "defaultRouteIds": {
                        result["defaultRouteIds"] = region.defaultRouteIds;
                        break;
                    }

                    default: throw new UnreachableError(f);
                }
            }

            results.push(result);
        }

        return route.finish("success", {
            message: "See regions attached",
            regions: results,
            unknown,
        });
    },
});
