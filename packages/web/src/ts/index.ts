import "../scss/styles.scss";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { LiveVehicle } from "./types";
import State from "./State";
import Api from "./Api";
import Search from "./Search";

const AUCKLAND_COORDS = { lat: -36.848461, lng: 174.763336 };

/*
 * DOM Element References
 */

const $map = document.getElementById("map");
const $searchInput = document.querySelector("input[type=search]");
const $dropdownFilter = document.getElementById("results");
const $activeRoutes = document.getElementById("active");
const $main = document.getElementById("main");
const $navShow = document.getElementById("nav-show");
const $navHide = document.getElementById("nav-hide");

/*
 * Nav Map
 */

const navMap = [
    [document.getElementById("nav-map"), document.getElementById("map")],
    [document.getElementById("nav-routes"), document.getElementById("routes")],
    [document.getElementById("nav-settings"), document.getElementById("settings")],
];
let navActive = navMap[0];

/*
 * Functions
 */

function selectNavTab($tab, $target) {
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

    const map = new google.maps.Map($map, {
        center:            AUCKLAND_COORDS,
        zoom:              13,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl:    false,
    });
    navigator.geolocation.getCurrentPosition(r => map.panTo({ lat: r.coords.latitude, lng: r.coords.longitude }));

    await Api.wsConnect();
    const state = new State(map, $activeRoutes);

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
    Api.onMessage((data: Record<string, any>) => {
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

    Api.onWebSocketReconnect(() => state.loadActiveRoutesVehicles());
})();
