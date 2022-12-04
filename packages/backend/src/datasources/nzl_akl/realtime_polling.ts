import type { JSONSerializable } from "@commutelive/common";
import fetch from "node-fetch";
import env from "~/env.js";
import { RollingAverage } from "~/helpers";
import { getLogger } from "~/log";
import type { FeedEntity, TripUpdate, VehiclePosition } from "~/types";
import { fixTripUpdate, fixVehiclePosition } from "./realtime_websocket";

const log = getLogger("NZLAKL/realtime/poll");

let addTripUpdate: (tripUpdate: TripUpdate) => boolean;

let addVehicleUpdate: (vehicleUpdate: VehiclePosition) => boolean;

const recentTripUpdatesAverageAge = new RollingAverage({
    windowType: "time",
    windowSize: 2 * 60 * 1000,
});

const recentVehiclePositionsAverageAge = new RollingAverage({
    windowType: "time",
    windowSize: 2 * 60 * 1000,
});

let realtimeApiUrl: string;
let updateInProgress = false;
let lastSuccessfulUpdate = 0;

function shouldPoll(): boolean {
    // NZ time is +12 or +13
    // run between 7am and 7pm, ±30 minutes depending on daylight saving
    const tz = 12.5;
    const earliest = 7;
    const latest = 19;

    const now = new Date();
    const adjustedHour = (now.getUTCHours() + (now.getUTCMinutes() / 60) + tz) % 24;
    return earliest <= adjustedHour && adjustedHour <= latest;
}

export async function getStatus(): Promise<JSONSerializable> {
    return {
        lastSuccessfulUpdate,
        shouldPoll: shouldPoll(),
        recentTripUpdatesAverageAge: recentTripUpdatesAverageAge.getAverage(),
        recentVehiclePositionsAverageAge: recentVehiclePositionsAverageAge.getAverage(),
    };
}

async function queryApi(url: string) {
    const res = await fetch(url, {
        headers: { "Ocp-Apim-Subscription-Key": env.AUCKLAND_TRANSPORT_KEY },
    });
    if (res.status !== 200) {
        throw new Error(`Got status ${res.status} from ${url}`);
    }
    const json = (await res.json() as {
        status: string;
        response: {
            entity: (FeedEntity & Record<string, any>)[];
        };
    });
    return json.response.entity;
}

export async function checkForRealtimeUpdate(): Promise<boolean> {
    if (!shouldPoll()) {
        return false;
    }
    if (updateInProgress) {
        return false;
    }
    if (lastSuccessfulUpdate > Date.now() - (18 * 1000)) {
        // don't poll more than once every 18 seconds
        return false;
    }
    updateInProgress = true;

    try {
        const updates = await queryApi(realtimeApiUrl);
        if (updates.length === 0) {
            return false;
        }

        // received updates
        for (const update of updates) {
            onMessage(update);
        }
        lastSuccessfulUpdate = Date.now();
        return true;
    }
    catch (err) {
        log.error("Error looking for realtime updates", err);
        return false;
    }
    finally {
        updateInProgress = false;
    }
}

export async function initialize(
    realtimeApiUrl_: string,
    addTripUpdate_: (tripUpdate: TripUpdate) => boolean,
    addVehicleUpdate_: (vehicleUpdate: VehiclePosition) => boolean,
): Promise<void> {
    realtimeApiUrl = realtimeApiUrl_;
    addTripUpdate = addTripUpdate_;
    addVehicleUpdate = addVehicleUpdate_;
}

/**
 * Received a message.
 */
function onMessage(data: FeedEntity & Record<string, any>): void {
    // NOTE: AT sometimes incorrectly uses camelCase keys, string timestamps, and string enums

    const { id: _id, vehicle, alert: _alert } = data;
    const trip_update = data.trip_update ?? data.tripUpdate;

    if (trip_update != null) {
        const tu = fixTripUpdate(trip_update);
        if (addTripUpdate(tu) && tu.timestamp != null) {
            recentTripUpdatesAverageAge.add(Date.now() - (tu.timestamp * 1000));
        }
        return;
    }

    if (vehicle != null) {
        const vp = fixVehiclePosition(vehicle);
        if (addVehicleUpdate(vp) && vp.timestamp != null) {
            recentVehiclePositionsAverageAge.add(Date.now() - (vp.timestamp * 1000));
        }
        return;
    }
}
