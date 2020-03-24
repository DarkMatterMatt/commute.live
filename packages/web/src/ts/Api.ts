const API_URL = "https://mattm.win/ATLive/api/v1/";
const WS_URL = `${API_URL}websocket`;

// eslint-disable-next-line max-len
type QueryRouteInfo = "shortName" | "longName" | "longNames" | "routeIds" | "shapeIds" | "vehicles" | "type" | "agencyId" | "polylines";

abstract class Api {
    static async query(path: string, params: Record<string, string>): Promise<Record<string, any>> {
        const queryStr = `?${new URLSearchParams(params)}`;
        const response: Record<string, any> = await fetch(API_URL + path + queryStr).then(r => r.json());
        if (response.status !== "success") {
            throw new Error(`Failed querying API: ${path}${queryStr}`);
        }
        console.log(response);
        return response;
    }

    static async queryRoutes(shortNames?: string[], fetch?: QueryRouteInfo[]): Promise<Record<string, any>> {
        const query: Record<string, string> = {};
        if (shortNames) query.shortNames = shortNames.join(",");
        if (fetch) query.fetch = fetch.join(",");
        return Api.query("routes", query);
    }

    static async queryRoute(shortName: string, fetch?: QueryRouteInfo[]): Promise<Record<string, any>> {
        const query: Record<string, string> = { shortNames: shortName };
        if (fetch) query.fetch = fetch.join(",");
        const response = await Api.query("routes", query);
        return response.routes[shortName];
    }
}

export default Api;
