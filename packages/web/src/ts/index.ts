import "../scss/styles.scss";

import { LiveVehicle } from "./types";
import State from "./State";
import Api from "./Api";
import Search from "./Search";

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

function largeScreen(): boolean {
    return window.matchMedia("(min-width: 900px)").matches;
}

function isVisible($e: HTMLElement): boolean {
    return Boolean($e && ($e.offsetWidth || $e.offsetHeight || $e.getClientRects().length));
}

function onClickOutside($e: HTMLElement, cb: (ev: MouseEvent) => void): void {
    const outsideClickListener = (ev: MouseEvent): void => {
        if (!$e.contains(ev.target as Node) && isVisible($e)) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            removeClickListener();
            cb(ev);
        }
    };

    const removeClickListener = (): void => {
        document.removeEventListener("click", outsideClickListener);
    };

    document.addEventListener("click", outsideClickListener);
}

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

    await Api.wsConnect();
    const state = new State(new google.maps.Map($map, {
        center:            AUCKLAND_COORDS,
        zoom:              13,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl:    false,
    }), $addRoute);
    navigator.geolocation.getCurrentPosition(r => state.map.panTo({ lat: r.coords.latitude, lng: r.coords.longitude }));

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
