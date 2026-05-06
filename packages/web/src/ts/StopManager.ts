import type { Id } from "@commutelive/common";
import type HtmlMarkerView from "./HtmlMarkerView";
import { StopMarker } from "./StopMarker";

/**
 * Singleton manager for stop markers.
 *
 * Handles displaying stops on the map with multi-colored markers when
 * multiple routes service the same stop.
 */
class StopManagerClass {
    private stopMarkers = new Map<string, StopMarker>(); // stopId -> StopMarker
    private stopRoutes = new Map<string, Set<string>>(); // stopId -> Set<routeId>
    private routeColors = new Map<string, string>(); // routeId -> color
    private markerView: HtmlMarkerView | null = null;

    /**
     * Set the marker view for rendering stop markers.
     */
    public setMarkerView(markerView: HtmlMarkerView): void {
        this.markerView = markerView;
    }

    /**
     * Add a stop for a specific route.
     *
     * If the stop already exists, it will be updated with the new route's color.
     */
    public addStop(
        stopId: string,
        location: google.maps.LatLng,
        routeId: Id,
        color: string,
        name: string,
    ): void {
        // Track which routes use this stop
        if (!this.stopRoutes.has(stopId)) {
            this.stopRoutes.set(stopId, new Set());
        }
        this.stopRoutes.get(stopId)!.add(routeId);
        this.routeColors.set(routeId, color);

        // Get colors for all routes using this stop
        const routeIds = Array.from(this.stopRoutes.get(stopId)!);
        const colors = routeIds.map(id => this.routeColors.get(id)!);

        // Create or update marker
        if (this.stopMarkers.has(stopId)) {
            this.stopMarkers.get(stopId)!.updateColors(colors);
        }
        else {
            const marker = new StopMarker(stopId, location, colors, name);
            this.stopMarkers.set(stopId, marker);
            if (this.markerView != null) {
                this.markerView.addMarker(marker);
            }
        }
    }

    /**
     * Remove a stop for a specific route.
     *
     * If no more routes use this stop, the marker will be removed from the map.
     */
    public removeStop(stopId: string, routeId: Id): void {
        const routes = this.stopRoutes.get(stopId);
        if (!routes) return;

        routes.delete(routeId);

        if (routes.size === 0) {
            // No more routes use this stop, remove marker
            const marker = this.stopMarkers.get(stopId);
            if (marker != null) {
                if (this.markerView != null) {
                    this.markerView.removeMarker(marker);
                }
                marker.destroy();
                this.stopMarkers.delete(stopId);
            }
            this.stopRoutes.delete(stopId);
        }
        else {
            // Update colors for remaining routes
            const routeIds = Array.from(routes);
            const colors = routeIds.map(id => this.routeColors.get(id)!);
            this.stopMarkers.get(stopId)?.updateColors(colors);
        }
    }

    /**
     * Update the color for a route.
     *
     * All stops that use this route will be updated with the new color.
     */
    public updateRouteColor(routeId: Id, newColor: string): void {
        this.routeColors.set(routeId, newColor);

        // Update all stops that use this route
        this.stopRoutes.forEach((routes, stopId) => {
            if (routes.has(routeId)) {
                const routeIds = Array.from(routes);
                const colors = routeIds.map(id => this.routeColors.get(id)!);
                this.stopMarkers.get(stopId)?.updateColors(colors);
            }
        });
    }
}

export const StopManager = new StopManagerClass();
