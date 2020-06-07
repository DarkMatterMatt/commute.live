import "../scss/styles.scss";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { LiveVehicle } from "./types";
import { state } from "./State";
import { api } from "./Api";
import Search from "./Search";
import mapThemes from "./mapThemes";
import { settings } from "./Settings";

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

/*
 * Nav Map
 */

const navMap: [HTMLElement, HTMLElement][] = [
    [document.getElementById("nav-map"), document.getElementById("map")],
    [document.getElementById("nav-routes"), document.getElementById("routes")],
    [document.getElementById("nav-settings"), document.getElementById("settings")],
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

(async (): Promise<void> => {
    /*
     * Init
     */

    state.load();
    state.setActiveRoutesElem($activeRoutes);

    const map = new google.maps.Map($map, {
        center:            AUCKLAND_COORDS,
        zoom:              13,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl:    false,
        styles:            settings.getBool("darkMode") ? mapThemes.dark : mapThemes.light,
        backgroundColor:   settings.getBool("darkMode") ? "#17263c" : undefined,
    });
    settings.settings.get("darkMode").addChangeListener(v => {
        map.setOptions({ styles: v ? mapThemes.dark : mapThemes.light });
    });
    navigator.geolocation.getCurrentPosition(r => map.panTo({ lat: r.coords.latitude, lng: r.coords.longitude }));

    await api.wsConnect();
    state.setMap(map);

    const search = new Search(state, $searchInput, $dropdownFilter);
    search.load();

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
