import type { WebSocket as uWebSocket } from "uWebSockets.js";

export type WSUserData = Record<string, never>;

export type WebSocket = uWebSocket<WSUserData>;
