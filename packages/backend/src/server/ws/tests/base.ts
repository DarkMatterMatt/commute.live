import { type RegionCode } from "@commutelive/common";
import { jest } from "@jest/globals";
import type { DataSource, WebSocket } from "~/types";
import type { WebSocketRouteGenerator } from "../WebSocketRoute";

function setupMockWebSocket() {
    const subscriptions = new Set<string>();

    const mockWs: jest.Mocked<Pick<WebSocket, "send" | "subscribe" | "unsubscribe">> & {
        sentMessages: string[];
        subscriptions: Set<string>;
    } = {
        sentMessages: [],
        subscriptions,
        send: jest.fn((data: string) => {
            mockWs.sentMessages.push(data);
            return 1;
        }),
        subscribe: jest.fn((topic: string) => {
            subscriptions.add(topic);
            return true;
        }),
        unsubscribe: jest.fn((topic: string) => {
            const existed = subscriptions.has(topic);
            subscriptions.delete(topic);
            return existed;
        }),
    };

    return mockWs as unknown as WebSocket & { sentMessages: string[]; subscriptions: Set<string> };
}

export async function executeWebSocketRoute<
    R extends readonly string[],
    O extends readonly string[],
>(
    route: WebSocketRouteGenerator<R, O>,
    params: Record<string, unknown>,
    regions: DataSource[],
    seq = 1,
): Promise<{
    ws: WebSocket & { sentMessages: string[]; subscriptions: Set<string> };
    response: { status: "success" | "error"; route: string; seq: number } & Record<string, any> | null;
}> {
    const mockWs = setupMockWebSocket();

    const createdRoute = route.createRoute({
        params,
        seq,
        ws: mockWs,
    });

    await createdRoute.execute({
        activeWebSockets: new Set(),
        availableRegions: regions.map(r => r.code.toLowerCase() as RegionCode),
        getRegion: (code: string) => regions.find(r => r.code.toLowerCase() === code.toLowerCase()) ?? null,
        regions,
    });

    const response = mockWs.sentMessages.length > 0
        ? JSON.parse(mockWs.sentMessages[0])
        : null;

    return {
        ws: mockWs,
        response,
    };
}
