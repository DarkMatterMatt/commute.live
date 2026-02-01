import fetch, { type Response } from "node-fetch";
import env from "~/env";
import { QueueingRateLimiter } from "~/helpers";

const limiterPtd = new QueueingRateLimiter({ triggerThreshold: 5, requestsPerSecond: 9 });
const limiterDvs = new QueueingRateLimiter({ triggerThreshold: 5, requestsPerSecond: 9 });

/**
 * Queries the Auckland Transport API using the "Public Transport Dev" API key.
 *
 * Used for APIs: `/gtfs/v3`, and `/realtime/legacy`
 */
export async function queryApiPtd(url: string, headers?: Record<string, string>): Promise<Response> {
    // wait for our turn
    await limiterPtd.queue();

    // add api key
    headers ??= {};
    headers["Ocp-Apim-Subscription-Key"] = env.AUCKLAND_TRANSPORT_KEY_PTD;

    return fetch(url, { headers });
}

/**
 * Queries the Auckland Transport API using the "Developers" API key.
 *
 * Used for APIs: `/v2/realtime-streaming`, and `/trip-allocations/v3`.
 */
export async function queryApiDvs(url: string, headers?: Record<string, string>): Promise<Response> {
    // wait for our turn
    await limiterDvs.queue();

    // add api key
    headers ??= {};
    headers["Ocp-Apim-Subscription-Key"] = env.AUCKLAND_TRANSPORT_KEY_DVS;

    return fetch(url, { headers });
}
