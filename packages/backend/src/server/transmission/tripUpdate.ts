import type { Id } from "@commutelive/common";
import type { TripUpdate } from "~/types";

export function convertTripUpdate(id: Id, tu: TripUpdate) {
    return {
        id,
        ...tu,
    };
}
