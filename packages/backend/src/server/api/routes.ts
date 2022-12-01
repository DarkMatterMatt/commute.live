import type { LatLng, LiveVehicle, StrOrNull } from "@commutelive/common";
import { never } from "~/helpers/";
import { convertVehiclePosition } from "../transmission/vehicleUpdate.js";
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
    vehicles: Record<string, LiveVehicle>;
}

export const routesRoute = new GetRouteGenerator({
    name: "routes",
    requiredParams: ["fields", "region", "shortNames"] as const,
    optionalParams: [] as const,
    requiresRegion: true,
    executor: async (route, { region, params }) => {
        if (region == null) {
            throw new Error("Region is expected.");
        }

        const rawShortNames = params.shortNames.split(",");
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

        const availableShortNames = await region.getShortNames();
        const shortNames = new Set(rawShortNames.filter(sn => availableShortNames.includes(sn)));

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
                        data[sn]["longNames"] = await region.getLongNamesByShortName(sn);
                        break;
                    }

                    case "polylines":{
                        data[sn]["polylines"] = await region.getShapesByShortName(sn);
                        break;
                    }

                    case "type": {
                        data[sn]["type"] = await region.getRouteTypeByShortName(sn);
                        break;
                    }

                    case "vehicles": {
                        const res = await region.getVehicleUpdates(sn);
                        data[sn]["vehicles"] = Object.fromEntries([...res.entries()].map(
                            ([k, v]) => [k, convertVehiclePosition(region.code, sn, v)]));
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
