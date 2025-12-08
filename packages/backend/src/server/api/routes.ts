import { type Id, type PartialRoutesDataResult, type RouteDataResult, UnreachableError } from "@commutelive/common";
import { parseRegionalId } from "~/datasources/base/id";
import { convertVehiclePosition } from "../transmission/vehicleUpdate";
import { GetRouteGenerator } from "./GetRoute";

const validFields = [
    "id",
    "longNames",
    "polylines",
    "region",
    "shortName",
    "type",
    "vehicles",
] as const;

type ValidField = typeof validFields[number];

export const routesRoute = new GetRouteGenerator<["fields", "routeIds"], [], PartialRoutesDataResult>({
    name: "routes",
    requiredParams: ["fields", "routeIds"],
    optionalParams: [],
    executor: async (route, { getRegion, params }) => {
        const rawFields = params.fields.split(",");
        for (const field of rawFields) {
            if (!validFields.includes(field as ValidField)) {
                return route.finish("error", {
                    message: `Unknown field: ${field}.`,
                    availableFields: validFields,
                });
            }
        }
        const fields = rawFields as ValidField[];

        // don't cache responses containing vehicles
        if (fields.includes("vehicles")) {
            route.setCacheMaxAge(0);
        }

        const results: Partial<RouteDataResult>[] = [];
        const unknown: Id[] = [];

        for (const id of params.routeIds.split(",") as Id[]) {
            const [regionStr] = parseRegionalId(id);
            const region = getRegion(regionStr);
            if (region == null) {
                unknown.push(id);
                continue;
            }

            const summary = await region.getRouteSummary(id);
            if (summary == null) {
                unknown.push(id);
                continue;
            }
            const result: Partial<RouteDataResult> = {};

            for (const f of fields) {
                switch (f) {
                    case "id": {
                        result["id"] = summary.id;
                        break;
                    }

                    case "shortName": {
                        result["shortName"] = summary.shortName;
                        break;
                    }

                    case "longNames": {
                        result["longNames"] = summary.longNames;
                        break;
                    }

                    case "polylines":{
                        result["polylines"] = await region.getShapes(id);
                        break;
                    }

                    case "region": {
                        result["region"] = region.code;
                        break;
                    }

                    case "type": {
                        result["type"] = summary.type;
                        break;
                    }

                    case "vehicles": {
                        const res = await region.getVehicleUpdates(id);
                        result["vehicles"] = [...res.values()].map(v => convertVehiclePosition(id, v));
                        break;
                    }

                    default: throw new UnreachableError(f);
                }
            }

            results.push(result);
        }

        return route.finish("success", {
            message: "See routes attached",
            routes: results,
            unknown,
        });
    },
});
