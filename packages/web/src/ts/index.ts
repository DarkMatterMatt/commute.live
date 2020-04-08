import "../scss/styles.scss";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { LiveVehicle } from "./types";
import State from "./State";
import Api from "./Api";
import Search from "./Search";
import { largeScreen, onClickOutside } from "./Helpers";

const AUCKLAND_COORDS = { lat: -36.848461, lng: 174.763336 };

/*
 * DOM Element References
 */

const $map = document.getElementById("map");
const $openMenu = document.getElementById("open-menu");
const $menu = document.getElementById("menu");
const $closeMenu = $menu.getElementsByClassName("close")[0];
const $addRoute = document.getElementById("add-route");
const $searchBtn = $addRoute.getElementsByClassName("btn")[0];
const $searchInput = $addRoute.getElementsByTagName("input")[0];
const $dropdownFilter = document.getElementById("dropdown-filter");
const $help = document.getElementById("help");
const $helpBtn = $help.getElementsByClassName("btn")[0];

/*
 * Functions
 */
function closeMenu(): void {
    $menu.classList.remove("show");
}

function openMenu(): void {
    $menu.classList.add("show");
}

function showHelp(): void {
    $help.classList.add("show");
}

function hideHelp(): void {
    $help.classList.remove("show");
}

function helpIsVisible(): boolean {
    return $help.classList.contains("show");
}

function closeAddRouteInput(): void {
    $addRoute.classList.remove("show");
    if (largeScreen()) {
        setTimeout(() => {
            $searchInput.value = "";
        }, 200);
    }
}

function openAddRouteInput(): void {
    $addRoute.classList.add("show");
    $searchInput.focus();
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
    const state = new State(map, $addRoute);

    const search = new Search(state, $searchInput, $dropdownFilter);
    search.load();

    /*
     * Event Listeners
     */

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

    $openMenu.addEventListener("click", openMenu);

    $closeMenu.addEventListener("click", closeMenu);

    $addRoute.addEventListener("click", ev => {
        if (!$addRoute.classList.contains("show")) {
            openAddRouteInput();
            onClickOutside($addRoute, () => {
                closeAddRouteInput();
                search.hideDropdown();
            });
        }
        else if (ev.target === $searchBtn) {
            closeAddRouteInput();
            search.hideDropdown();
        }
    });

    $helpBtn.addEventListener("click", ev => {
        if (!helpIsVisible()) {
            showHelp();
            onClickOutside($help, hideHelp);
        }
        else if (ev.target === $helpBtn) {
            hideHelp();
        }
    });
})();
