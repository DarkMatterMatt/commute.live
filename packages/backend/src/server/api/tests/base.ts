import { type RegionCode } from "@commutelive/common";
import { jest } from "@jest/globals";
import type { HttpResponse } from "uWebSockets.js";
import type { DataSource } from "~/types";
import type { GetRouteGenerator } from "../GetRoute";

function setupMockResponse() {
    const mockRes: jest.Mocked<Pick<HttpResponse,
        | "onAborted"
        | "writeStatus"
        | "writeHeader"
        | "end"
        | "endWithoutBody"
        | "getRemoteAddressAsText"
    >> & {
        headers: Record<string, string>;
        status: string;
        responseBody: string;
    } = {
        headers: {},
        status: "200 OK",
        responseBody: "",
        onAborted: jest.fn(),
        writeStatus: jest.fn((status: string) => {
            mockRes.status = status;
            return castRes;
        }),
        writeHeader: jest.fn((key: string, value: string) => {
            mockRes.headers[key] = value;
            return castRes;
        }),
        end: jest.fn((body: string) => {
            mockRes.responseBody = body;
            return castRes;
        }),
        endWithoutBody: jest.fn(() => castRes),
        // Return a mock IP address.
        getRemoteAddressAsText: jest.fn(() => new TextEncoder().encode("192.0.2.1").buffer),
    };

    const castRes = mockRes as unknown as (HttpResponse & { status: string });
    return castRes;
}

// Test utilities to execute routes and parse responses
export async function executeRoute<
    R extends readonly string[],
    O extends readonly string[],
    T extends Record<string, any>,
>(
    route: GetRouteGenerator<R, O, T>,
    params: Record<string, string>,
    regions: DataSource[],
    headers: Record<string, string> = {},
): Promise<{
    response: (HttpResponse & { status: string });
    body: ({ status: "success"; } & T) | ({ status: "error"; } & Record<string, any>) | null;
}> {
    const mockRes = setupMockResponse();
    const createdRoute = route.createRoute({
        params,
        headers,
        res: mockRes,
    });


    await createdRoute.execute({
        activeWebSockets: new Set(),
        availableRegions: regions.map(r => r.code.toLowerCase() as RegionCode),
        getRegion: (code: string) => regions.find(r => r.code.toLowerCase() === code.toLowerCase()) ?? null,
        regions,
    });

    return {
        response: mockRes,
        body: mockRes.responseBody
            ? JSON.parse(
                mockRes.responseBody,
            ) as ({ status: "success"; } & T) | ({ status: "error"; } & Record<string, any>)
            : null,
    };
}
