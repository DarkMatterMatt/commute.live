/**
 * Automatically generated from:
 * https://developers.google.com/transit/gtfs-realtime/gtfs-realtime.proto
 */

export interface Alert {
    active_period: TimeRange[];
    cause?: Alert$Cause;
    description_text?: TranslatedString;
    effect?: Alert$Effect;
    header_text?: TranslatedString;
    informed_entity: EntitySelector[];
    url?: TranslatedString;
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
    stop_id?: string;
    trip?: TripDescriptor;
}

export interface FeedEntity {
    alert?: Alert;
    id: string;
    is_deleted?: boolean;
    trip_update?: TripUpdate;
    vehicle?: VehiclePosition;
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
    entity: FeedEntity[];
    header: FeedHeader;
}

export interface Position {
    bearing?: number;
    latitude: number;
    longitude: number;
    odometer?: number;
    speed?: number;
}

export interface TimeRange {
    end?: number;
    start?: number;
}

export interface TranslatedString {
    translation: TranslatedString$Translation[];
}

export interface TranslatedString$Translation {
    language?: string;
    text: string;
}

export interface TripDescriptor {
    direction_id?: number;
    route_id?: string;
    schedule_relationship?: TripDescriptor$ScheduleRelationship;
    start_date?: string;
    start_time?: string;
    trip_id?: string;
}

export enum TripDescriptor$ScheduleRelationship {
    SCHEDULED = 0,
    ADDED,
    UNSCHEDULED,
    CANCELED,
}

export interface TripUpdate {
    delay?: number;
    stop_time_update: TripUpdate$StopTimeUpdate[];
    timestamp?: number;
    trip: TripDescriptor;
    vehicle?: VehicleDescriptor;
}

export interface TripUpdate$StopTimeEvent {
    delay?: number;
    time?: number;
    uncertainty?: number;
}

export interface TripUpdate$StopTimeUpdate {
    arrival?: TripUpdate$StopTimeEvent;
    departure?: TripUpdate$StopTimeEvent;
    schedule_relationship?: TripUpdate$StopTimeUpdate$ScheduleRelationship;
    stop_id?: string;
    stop_sequence?: number;
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
    congestion_level?: VehiclePosition$CongestionLevel;
    current_status?: VehiclePosition$VehicleStopStatus;
    current_stop_sequence?: number;
    occupancy_status?: VehiclePosition$OccupancyStatus;
    position?: Position;
    stop_id?: string;
    timestamp?: number;
    trip?: TripDescriptor;
    vehicle?: VehicleDescriptor;
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
