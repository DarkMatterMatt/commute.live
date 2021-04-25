/**
 * Themes generated by mapstyle.withgoogle.com
 * @see https://mapstyle.withgoogle.com/
 *
 * Base theme options:
 *   > Administrative
 *     > Land Parcel
 *       - All: hidden
 *   > Points of interest
 *     > Attraction
 *       - All: hidden
 *     > Business
 *       - All: hidden
 *   > Road
 *     - Icon: hidden
 *     > Local
 *       - Labels: hidden
 */
const baseFeatures: google.maps.MapTypeStyle[] = [
    {
        featureType: "administrative.land_parcel",
        stylers:     [{ visibility: "off" }],
    },
    {
        featureType: "poi.attraction",
        stylers:     [{ visibility: "off" }],
    },
    {
        featureType: "poi.business",
        stylers:     [{ visibility: "off" }],
    },
    {
        featureType: "road",
        elementType: "labels.icon",
        stylers:     [{ visibility: "off" }],
    },
    {
        featureType: "road.local",
        elementType: "labels",
        stylers:     [{ visibility: "off" }],
    },
];

const mapThemes: Record<string, google.maps.MapTypeStyle[]> = {};

// "standard" theme from mapstyle.withgoogle.com
mapThemes.light = [
    ...baseFeatures,
];

// "night" theme from mapstyle.withgoogle.com
mapThemes.dark = [
    ...baseFeatures,
    {
        elementType: "geometry",
        stylers:     [{ color: "#242f3e" }],
    },
    {
        elementType: "labels.text.fill",
        stylers:     [{ color: "#746855" }],
    },
    {
        elementType: "labels.text.stroke",
        stylers:     [{ color: "#242f3e" }],
    },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers:     [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers:     [{ color: "#d59563" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers:     [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers:     [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers:     [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers:     [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers:     [{ color: "#9ca5b3" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers:     [{ color: "#746855" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers:     [{ color: "#1f2835" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers:     [{ color: "#f3d19c" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers:     [{ color: "#2f3948" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers:     [{ color: "#d59563" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers:     [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers:     [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers:     [{ color: "#17263c" }],
    },
];

mapThemes.simpleDark = [
    ...mapThemes.dark,
    {
        featureType: "administrative.neighborhood",
        stylers:     [{ visibility: "off" }],
    },
    {
        featureType: "landscape",
        elementType: "labels",
        stylers:     [{ visibility: "off" }],
    },
    {
        featureType: "poi",
        stylers:     [{ visibility: "off" }],
    },
    {
        featureType: "poi.park",
        stylers:     [{ visibility: "on" }],
    },
    {
        featureType: "transit.line",
        stylers:     [{ visibility: "off" }],
    },
];

export default mapThemes;
