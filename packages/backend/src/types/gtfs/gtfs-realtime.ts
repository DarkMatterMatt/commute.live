/**
 * Automatically generated from:
 * https://developers.google.com/transit/gtfs-realtime/gtfs-realtime.proto
 */

export interface Alert {
    active_period: TimeRange[];
    informed_entity: EntitySelector[];
    cause?: Alert$Cause;
    effect?: Alert$Effect;
    url?: TranslatedString;
    header_text?: TranslatedString;
    description_text?: TranslatedString;
}

export enum Alert$Cause {
    UNKNOWN_CAUSE = 1,
    OTHER_CAUSE,
    TECHNICAL_PROBLEM,
    STRIKE,
    DEMONSTRATION,
    ACCIDENT,
    HOLIDAY,
    WEATHER,
    MAINTENANCE,
    CONSTRUCTION,
    POLICE_ACTIVITY,
    MEDICAL_EMERGENCY,
}

export enum Alert$Effect {
    NO_SERVICE = 1,
    REDUCED_SERVICE,
    SIGNIFICANT_DELAYS,
    DETOUR,
    ADDITIONAL_SERVICE,
    MODIFIED_SERVICE,
    OTHER_EFFECT,
    UNKNOWN_EFFECT,
    STOP_MOVED,
}

export interface EntitySelector {
    agency_id?: string;
    route_id?: string;
    route_type?: number;
    trip?: TripDescriptor;
    stop_id?: string;
}

export interface FeedEntity {
    id: string;
    is_deleted?: boolean;
    trip_update?: TripUpdate;
    vehicle?: VehiclePosition;
    alert?: Alert;
}

export interface FeedHeader {
    gtfs_realtime_version: string;
    incrementality?: FeedHeader$Incrementality;
    timestamp?: number;
}

export enum FeedHeader$Incrementality {
    FULL_DATASET = 0,
    DIFFERENTIAL,
}

export interface FeedMessage {
    header: FeedHeader;
    entity: FeedEntity[];
}

export interface Position {
    latitude: number;
    longitude: number;
    bearing?: number;
    odometer?: number;
    speed?: number;
}

export interface TimeRange {
    start?: number;
    end?: number;
}

export interface TranslatedString {
    translation: TranslatedString$Translation[];
}

export interface TranslatedString$Translation {
    text: string;
    language?: string;
}

export interface TripDescriptor {
    trip_id?: string;
    route_id?: string;
    direction_id?: number;
    start_time?: string;
    start_date?: string;
    schedule_relationship?: TripDescriptor$ScheduleRelationship;
}

export enum TripDescriptor$ScheduleRelationship {
    SCHEDULED = 0,
    ADDED,
    UNSCHEDULED,
    CANCELED,
}

export interface TripUpdate {
    trip: TripDescriptor;
    vehicle?: VehicleDescriptor;
    stop_time_update: TripUpdate$StopTimeUpdate[];
    timestamp?: number;
    delay?: number;
}

export interface TripUpdate$StopTimeEvent {
    delay?: number;
    time?: number;
    uncertainty?: number;
}

export interface TripUpdate$StopTimeUpdate {
    stop_sequence?: number;
    stop_id?: string;
    arrival?: TripUpdate$StopTimeEvent;
    departure?: TripUpdate$StopTimeEvent;
    schedule_relationship?: TripUpdate$StopTimeUpdate$ScheduleRelationship;
}

export enum TripUpdate$StopTimeUpdate$ScheduleRelationship {
    SCHEDULED = 0,
    SKIPPED,
    NO_DATA,
}

export interface VehicleDescriptor {
    id?: string;
    label?: string;
    license_plate?: string;
}

export interface VehiclePosition {
    trip?: TripDescriptor;
    vehicle?: VehicleDescriptor;
    position?: Position;
    current_stop_sequence?: number;
    stop_id?: string;
    current_status?: VehiclePosition$VehicleStopStatus;
    timestamp?: number;
    congestion_level?: VehiclePosition$CongestionLevel;
    occupancy_status?: VehiclePosition$OccupancyStatus;
}

export enum VehiclePosition$CongestionLevel {
    UNKNOWN_CONGESTION_LEVEL = 0,
    RUNNING_SMOOTHLY,
    STOP_AND_GO,
    CONGESTION,
    SEVERE_CONGESTION,
}

export enum VehiclePosition$OccupancyStatus {
    EMPTY = 0,
    MANY_SEATS_AVAILABLE,
    FEW_SEATS_AVAILABLE,
    STANDING_ROOM_ONLY,
    CRUSHED_STANDING_ROOM_ONLY,
    FULL,
    NOT_ACCEPTING_PASSENGERS,
}

export enum VehiclePosition$VehicleStopStatus {
    INCOMING_AT = 0,
    STOPPED_AT,
    IN_TRANSIT_TO,
}
