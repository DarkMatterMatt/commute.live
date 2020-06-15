import "../scss/styles.scss";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { LiveVehicle } from "./types";
import { state } from "./State";
import { api } from "./Api";
import Search from "./Search";
import mapThemes from "./mapThemes";
import { settings } from "./Settings";
import { render } from "./Render";

const AUCKLAND_COORDS = { lat: -36.848461, lng: 174.763336 };

/*
 * DOM Element References
 */

const $map = document.getElementById("map");
const $searchInput = document.getElementById("search") as HTMLInputElement;
const $dropdownFilter = document.getElementById("results");
const $activeRoutes = document.getElementById("active");
const $main = document.getElementById("main");
const $navShow = document.getElementById("nav-show");
const $navHide = document.getElementById("nav-hide");
const $navAbout = document.getElementById("nav-about");

/*
 * Nav Map
 */

const navMap: [HTMLElement, HTMLElement][] = [
    [document.getElementById("nav-map"), document.getElementById("map")],
    [document.getElementById("nav-routes"), document.getElementById("routes")],
    [document.getElementById("nav-settings"), document.getElementById("settings")],
    [document.getElementById("nav-about"), document.getElementById("about")],
];
let navActive = navMap[0];

/*
 * Functions
 */

function selectNavTab($tab: HTMLElement, $target: HTMLElement) {
    if ($tab.classList.contains("active")) {
        // already active
        return;
    }
    $tab.classList.add("active");
    $target.classList.add("active");

    navActive[0].classList.remove("active");
    navActive[1].classList.remove("active");
    navActive = [$tab, $target];
}

function showNav() {
    $main.classList.add("show");

    // desktop: select the routes tab if the map tab was selected
    if (navActive[0] === navMap[0][0]) {
        selectNavTab(...navMap[1]);
    }
}

function hideNav() {
    $main.classList.remove("show");
}

function setClass($elem: HTMLElement, name: string, enabled: boolean) {
    if (enabled) {
        $elem.classList.add(name);
    }
    else {
        $elem.classList.remove(name);
    }
}

function onGeolocationError(err: PositionError) {
    if (err.code === err.PERMISSION_DENIED) {
        // disable settings that require the location
        settings.setBool("showLocation", false);
        settings.setBool("centerOnLocation", false);

        // eslint-disable-next-line no-alert
        window.alert("You've denied access to your location, so I can't enable this setting.");
    }
    console.warn(err);
}

(async (): Promise<void> => {
    // export things to global scope for development
    if (process.env.NODE_ENV === "development") {
        Object.assign(window, {
            api,
            settings,
            state,
        });
    }

    /*
     * Init
     */

    state.load();
    state.setActiveRoutesElem($activeRoutes);

    const map = new google.maps.Map($map, {
        center:            AUCKLAND_COORDS,
        zoom:              13,
        streetViewControl: false,
        mapTypeControl:    false,
        backgroundColor:   settings.getBool("darkMode") ? "#17263c" : undefined,
    });
    state.setMap(map);

    const wsConnectTimeout = setTimeout(() => {
        // eslint-disable-next-line no-alert
        alert("Failed connecting to server :(\nPlease try again later");
        document.location.reload();
    }, 3000);
    api.wsConnect().then(() => {
        clearInterval(wsConnectTimeout);
        const search = new Search(state, $searchInput, $dropdownFilter);
        search.load();
    });

    /*
     * Add settings event listeners
     */

    settings.addChangeListener("darkMode", v => setClass(document.body, "theme-dark", v));
    settings.addChangeListener("hideAbout", v => setClass($navAbout, "hide", v));

    settings.addChangeListener("darkMode", v => map.setOptions({ styles: v ? mapThemes.dark : mapThemes.light }));
    settings.addChangeListener("showZoom", b => map.setOptions({ zoomControl: b }));
    settings.addChangeListener("showFullscreen", b => map.setOptions({ fullscreenControl: b }));

    settings.addChangeListener("centerOnLocation", centerOnLocation => {
        if (centerOnLocation) {
            navigator.geolocation.getCurrentPosition(
                pos => map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                onGeolocationError,
                { maximumAge: 60 * 1000 }
            );
        }
    });

    let geoWatch: number = null;
    settings.addChangeListener("showLocation", showLocation => {
        if (showLocation) {
            geoWatch = navigator.geolocation.watchPosition(
                pos => render.showLocation(map, pos.coords),
                onGeolocationError,
                { enableHighAccuracy: true }
            );
        }
        else {
            navigator.geolocation.clearWatch(geoWatch);
        }
    });

    /*
     * Event Listeners
     */

    $navShow.addEventListener("click", showNav);
    $navHide.addEventListener("click", hideNav);
    $map.addEventListener("mousedown", hideNav);

    // navigation
    navMap.forEach(([$tab, $target]) => {
        $tab.addEventListener("click", () => selectNavTab($tab, $target));

        $tab.addEventListener("contextmenu", ev => {
            // disable rightclick/longpress on image
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });
    });

    // listen for messages
    api.onMessage((data: Record<string, any>) => {
        if (data.status !== "success") {
            console.error(data.route, data.message, data);
            return;
        }

        if (data.route === "subscribe" || data.route === "unsubscribe") {
            console.log(data.message);
            return;
        }
        if (data.route === "live/vehicle") {
            state.showVehicle(data as LiveVehicle);
            return;
        }
        if (data.route === "ping") {
            return;
        }

        console.log(data.route, data.message, data);
    });

    api.onWebSocketReconnect(() => state.loadActiveRoutesVehicles());
})();
