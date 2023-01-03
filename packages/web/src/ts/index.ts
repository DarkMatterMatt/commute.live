import "../scss/styles.scss";
import "core-js/stable";
import "regenerator-runtime/runtime";

import type { LatLng, LiveVehicle } from "@commutelive/common";
import { api } from "./Api";
import { isOnline, largeScreen } from "./Helpers";
import HtmlMarkerView from "./HtmlMarkerView";
import mapThemes from "./mapThemes";
import { render } from "./Render";
import Search from "./Search";
import { settings } from "./Settings";
import { state } from "./State";

const OPEN_MENU_ON_FIRST_VISIT_TIMEOUT = 5 * 1000;

/*
 * DOM Element References
 */

function getElementById(elementId: string): HTMLElement {
    const element = document.getElementById(elementId);
    if (element == null) {
        throw new Error(`Element with id ${elementId} not found`);
    }
    return element;
}

const $map = getElementById("map");
const $searchInput = getElementById("search") as HTMLInputElement;
const $dropdownFilter = getElementById("results");
const $activeRoutes = getElementById("active");
const $main = getElementById("main");
const $navShow = getElementById("nav-show");
const $navHide = getElementById("nav-hide");
const $navAbout = getElementById("nav-about");
const $error = getElementById("error");
const [$errorMessage] = $error.getElementsByClassName("message");
const [$errorBtn] = $error.getElementsByClassName("btn");

/*
 * Nav Map
 */

const navMap: [HTMLElement, HTMLElement][] = [
    [getElementById("nav-map"), getElementById("map")],
    [getElementById("nav-routes"), getElementById("routes")],
    [getElementById("nav-settings"), getElementById("settings")],
    [getElementById("nav-about"), getElementById("about")],
];
let [navActive] = navMap;

/*
 * Functions
 */

function hideError() {
    $error.classList.remove("show");
    setTimeout(() => $errorBtn.classList.remove("show"), 150);
}

function showError(msg: string, btnText?: string, btnCallback?: (() => void)) {
    $errorMessage.textContent = msg;

    if (btnText != null) {
        $errorBtn.textContent = btnText;
        $errorBtn.classList.add("show");
    }

    $errorBtn.addEventListener("click", () => {
        hideError();
        if (btnCallback != null) {
            btnCallback();
        }
    }, { once: true });

    $error.classList.add("show");
}

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
    $map.classList.add("nav-show");

    // desktop: select the routes tab if the map tab was selected
    if (largeScreen() && navActive[0] === navMap[0][0]) {
        selectNavTab(...navMap[1]);
    }
}

function hideNav() {
    $main.classList.remove("show");
    $map.classList.remove("nav-show");
}

function toggleNav() {
    if ($main.classList.contains("show")) {
        hideNav();
    }
    else {
        showNav();
    }
}

function setClass($elem: HTMLElement, name: string, enabled: boolean) {
    if (enabled) {
        $elem.classList.add(name);
    }
    else {
        $elem.classList.remove(name);
    }
}

function onGeolocationError(err: GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) {
        // disable settings that require the location
        settings.setBool("showLocation", false);
        settings.setBool("centerOnLocation", false);

        showError("You've denied access to your location, so I can't enable this setting.", "Ok");
    }
    console.warn(err);
}

(async (): Promise<void> => {
    // export things to global scope for development
    if (process.env.NODE_ENV === "development") {
        Object.assign(window, {
            api,
            mapThemes,
            settings,
            state,
        });
    }

    /*
     * Pre-init
     */

    const { loadRoutes, map: lastMapState } = state.load();

    settings.addChangeListener("darkMode", v => setClass(document.body, "theme-dark", v));
    if (!largeScreen()) {
        showNav();
    }

    /*
     * Offline
     */

    if (google == null || !await isOnline()) {
        if (window.navigator.onLine) {
            setTimeout(() => window.location.reload(), 5000);
        }
        else {
            window.addEventListener("online", () => window.location.reload());
        }
        showError("Waiting for network connection...");
        return;
    }

    /*
     * Init
     */

    let center: LatLng;
    let zoom = 13;

    if (lastMapState == null) {
        const result = await api.queryRegionByIp();
        center = result.region.location;
    }
    else {
        ({ center, zoom } = lastMapState);
    }

    if (!settings.getStr("currentRegion")) {
        settings.setStr("currentRegion", (await api.queryRegionByIp()).region.code);
    }

    const map = new google.maps.Map($map, {
        center,
        zoom,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        backgroundColor: settings.getBool("darkMode") ? "#17263c" : undefined,
    });
    state.setMap(map);
    state.setActiveRoutesElem($activeRoutes);

    const markerView = new HtmlMarkerView(map);
    state.setMarkerView(markerView);

    await api.wsConnect();
    await loadRoutes();

    const search = new Search(state, $searchInput, $dropdownFilter);

    /*
     * Add settings event listeners
     */

    map.addListener("idle", () => state.save());

    settings.addChangeListener("currentRegion", s => {
        search.load(s);
    });

    settings.addChangeListener("hideAbout", v => setClass($navAbout, "hide", v));
    settings.addChangeListener("showMenuToggle", v => setClass($navShow, "hide-0-899", !v));

    settings.addChangeListener("darkMode", v => map.setOptions({ styles: v ? mapThemes.dark : mapThemes.light }));
    settings.addChangeListener("showZoom", b => map.setOptions({ zoomControl: b }));

    settings.addChangeListener("centerOnLocation", centerOnLocation => {
        if (centerOnLocation) {
            navigator.geolocation.getCurrentPosition(
                pos => map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                onGeolocationError,
                { maximumAge: 60 * 1000 },
            );
        }
    });

    let geoWatch: number | null = null;
    settings.addChangeListener("showLocation", showLocation => {
        if (showLocation) {
            geoWatch = navigator.geolocation.watchPosition(
                pos => render.showLocation(map, pos.coords),
                onGeolocationError,
                { enableHighAccuracy: true },
            );
        }
        else {
            if (geoWatch != null) {
                navigator.geolocation.clearWatch(geoWatch);
            }
            render.showLocation(null, null);
        }
    });

    settings.addChangeListener("animateMarkerPosition", b => {
        state.getRoutesByShortName().forEach(r => r.setAnimatePosition(b));
    });

    settings.addChangeListener("markerType", s => {
        state.getRoutesByShortName().forEach(r => r.setMarkerIconType(s));
    });

    settings.addChangeListener("showTransitRoutes", b => {
        state.getRoutesByShortName().forEach(r => r.setShowTransitRoutes(b));
    });

    /*
     * Event Listeners
     */

    $navShow.addEventListener("click", toggleNav);
    $navHide.addEventListener("click", hideNav);
    $map.addEventListener("mousedown", hideNav); // only auto-hide on desktop

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

    // window resizing, we might need to show/hide the nav
    let wasLargeScreen = largeScreen();
    window.addEventListener("resize", () => {
        if (wasLargeScreen && !largeScreen()) {
            // we just went to small screen mode
            showNav();
            selectNavTab(...navMap[0]);
        }
        else if (!wasLargeScreen && largeScreen()) {
            // we just went to large screen mode
            hideNav();
        }
        wasLargeScreen = largeScreen();
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

    // on a user's first visit, show the menu after 5 seconds if they have a large screen
    if (state.isFirstVisit() && largeScreen()) {
        const timeout = setTimeout(() => showNav(), OPEN_MENU_ON_FIRST_VISIT_TIMEOUT);
        $navShow.addEventListener("click", () => clearTimeout(timeout), { once: true });
    }

    /*
     * PWA
     */

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js", { scope: "." });
    }

    // PWA install to home screen, (event is Chrome only)
    window.addEventListener("beforeinstallprompt", ev => {
        // prevent Chrome 67 and earlier from automatically showing the prompt
        ev.preventDefault();

        /*
        const deferredPrompt = ev;

        btn.addEventListener("click", () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === "accepted") {
                    console.log("User accepted the A2HS prompt");
                }
                else {
                    console.log("User dismissed the A2HS prompt");
                }
            });
        });
        */
    });
})();
