import { clamp, degreesToRadians, radiansToDegrees } from "~/number";
import type { LatLng, Point } from "./point";

const ALMOST_ONE = 1 - 1e-15;

export class MercatorProjection {
    private tileSize: number;
    private pixelOrigin: Point;
    private pixelsPerLonDegree: number;
    private pixelsPerLonRadian: number;

    public constructor(tileSize: number) {
        this.tileSize = tileSize;
        this.pixelOrigin = { x: tileSize / 2, y: tileSize / 2 };
        this.pixelsPerLonDegree = tileSize / 360;
        this.pixelsPerLonRadian = tileSize / (2 * Math.PI);
    }

    private static clampLng(lng: number): number {
        while (lng < -180) {
            lng += 360;
        }
        while (lng >= 180) {
            lng -= 360;
        }
        return lng;
    }

    /**
     * Convert a pixel point into coordinates.
     * @param point pixel point to convert
     * @param wrapLng whether to clamp the longitude into -180 <= lng < 180
     */
    public fromPointToLatLng(point: Point, wrapLng = true): LatLng {
        // calculate longitude
        let lng = (point.x - this.pixelOrigin.x) / this.pixelsPerLonDegree;
        if (wrapLng) {
            lng = MercatorProjection.clampLng(lng);
        }

        // calculate latitude
        const latRadians = (point.y - this.pixelOrigin.y) / -this.pixelsPerLonRadian;
        const lat = radiansToDegrees((2 * Math.atan(Math.exp(latRadians))) - (Math.PI / 2));

        return { lat, lng };
    }

    /**
     * Convert coordinates into a pixel point.
     * @param latLng coordinates to convert
     */
    public fromLatLngToPoint(latLng: LatLng): Point {
        // calculate x-axis pixel
        const x = this.pixelOrigin.x + (latLng.lng * this.pixelsPerLonDegree);

        // calculate y-axis pixel. Truncating to ALMOST_ONE (~0.9999) effectively limits
        // latitude to 89.189. This is about a third of a tile past the edge of the world tile.
        const siny = clamp(Math.sin(degreesToRadians(latLng.lat)), -ALMOST_ONE, ALMOST_ONE);
        const y = this.pixelOrigin.y + (0.5 * Math.log((1 + siny) / (1 - siny)) * -this.pixelsPerLonRadian);

        return { x, y };
    }

    /**
     * Calculate the number of meters per pixel.
     * @param lat Latitude that this conversion is valid at.
     */
    public getMetersPerPixel(lat: number): number {
        // WGS-84 equatorial radius (6,378,137m)
        const circumference = 2 * Math.PI * 6_378_137;
        return circumference / this.tileSize * Math.cos(degreesToRadians(lat));
    }

    /**
     * Get distance between pixel points located at a specific latitude.
     * @param lat Latitude that this conversion is valid at.
     * @returns distance in meters.
     */
    public getDistBetweenPoints(p1: Point, p2: Point, lat: number): number {
        const metersPerPixel = this.getMetersPerPixel(lat);
        const deltaX = p2.x - p1.x;
        const deltaY = p2.y - p1.y;
        return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY)) * metersPerPixel;
    }

    /**
     * Get distance between coordinate points.
     * @returns distance in meters.
     */
    public getDistBetweenLatLngs(l1: LatLng, l2: LatLng): number {
        const avgLat = (l1.lat + l2.lat) / 2;
        const p1 = this.fromLatLngToPoint(l1);
        const p2 = this.fromLatLngToPoint(l2);
        return this.getDistBetweenPoints(p1, p2, avgLat);
    }

    /**
     * Get bearing between pixel points.
     * @returns bearing, degrees clockwise from North.
     */
    public getBearingBetweenPoints(p1: Point, p2: Point): number {
        const deltaX = p2.x - p1.x;
        const deltaY = p2.y - p1.y;
        return (radiansToDegrees(Math.atan2(deltaX, -deltaY)) + 360) % 360;
    }

    /**
     * Get bearing between coordinate points.
     * @returns bearing, degrees clockwise from North.
     */
    public getBearingBetweenLatLngs(l1: LatLng, l2: LatLng): number {
        const p1 = this.fromLatLngToPoint(l1);
        const p2 = this.fromLatLngToPoint(l2);
        return this.getBearingBetweenPoints(p1, p2);
    }
}

export const defaultProjection = new MercatorProjection(256);
