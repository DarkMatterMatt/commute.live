import fetch, { type Response } from "node-fetch";
import env from "~/env";
import { QueueingRateLimiter } from "~/helpers";

const limiter = new QueueingRateLimiter({ triggerThreshold: 5, requestsPerSecond: 4.9 });

export async function queryApi(url: string, headers?: Record<string, string>): Promise<Response> {
    // wait for our turn
    await limiter.queue();

    // add api key
    headers ??= {};
    headers.Authorization = `apikey ${env.NSW_KEY}`;

    return fetch(url, { headers });
}
