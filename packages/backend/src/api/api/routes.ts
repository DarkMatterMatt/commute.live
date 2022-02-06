import { never } from "~/helpers/";
import type { LatLng, StrOrNull, VehiclePosition } from "~/types";
import { GetRouteGenerator } from "./GetRoute.js";

const validFields = [
    "longNames",
    "polylines",
    "shortName",
    "type",
    "vehicles",
] as const;

type ValidField = typeof validFields[number];

interface RouteData {
    longNames: [StrOrNull, StrOrNull];
    polylines: [LatLng[], LatLng[]];
    shortName: string;
    type: number;
    vehicles: Record<string, VehiclePosition>;
}

export const routesRoute = new GetRouteGenerator({
    name: "routes",
    requiredParams: ["fields", "region", "shortNames"] as const,
    optionalParams: [] as const,
    executor: async (route, { getRegion, params }) => {
        const { region } = params;
        const shortNames = params.shortNames.split(",");
        const rawFields = params.fields.split(",");

        for (const field of rawFields) {
            if (!validFields.includes(field as ValidField)) {
                return route.finish("error", {
                    message: `Invalid field: ${field}`,
                    availableFields: validFields,
                });
            }
        }
        const fields = rawFields as ValidField[];

        // don't cache responses containing vehicles
        if (fields.includes("vehicles")) {
            route.setCacheMaxAge(0);
        }

        const ds = getRegion(region);
        if (ds == null) {
            return route.finish("error", {
                message: `Invalid region: ${region}`,
            });
        }

        const data: Record<string, Partial<RouteData>> = {};
        for (const sn of shortNames) {
            data[sn] = {};

            for (const f of fields) {
                switch (f) {
                    case "shortName": {
                        data[sn]["shortName"] = sn;
                        break;
                    }

                    case "longNames": {
                        data[sn]["longNames"] = await ds.getLongNamesByShortName(sn);
                        break;
                    }

                    case "polylines":{
                        data[sn]["polylines"] = await ds.getShapesByShortName(sn);
                        break;
                    }

                    case "type": {
                        data[sn]["type"] = await ds.getRouteTypeByShortName(sn);
                        break;
                    }

                    case "vehicles": {
                        const res = await ds.getVehicleUpdates(sn);
                        data[sn]["vehicles"] = Object.fromEntries(res.entries());
                        break;
                    }

                    default: never(f);
                }
            }
        }

        return route.finish("success", {
            message: "See routes attached",
            routes:  data,
        });
    },
});
