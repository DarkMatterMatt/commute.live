import type { setTimeout } from "node:timers";

export type TimerId = ReturnType<typeof setTimeout>;
