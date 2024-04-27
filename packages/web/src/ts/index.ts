import "../scss/styles.scss";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { createPromise, type LiveVehicle, sleep } from "@commutelive/common";
import { api } from "./Api";
import { largeScreen } from "./Helpers";
import HtmlMarkerView from "./HtmlMarkerView";
import { getTheme } from "./mapThemes";
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
const $activeRouteAttributions = getElementById("region-attributions");
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

let errorBtnCallback: null | (() => void) = null;
function showError(msg: string, btnText?: string, btnCallback: null | (() => void) = null) {
    $errorMessage.textContent = msg;

    if (btnText != null) {
        $errorBtn.textContent = btnText;
        $errorBtn.classList.add("show");
        errorBtnCallback = btnCallback;
    }

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
        settings.setVal("showLocation", false);
        settings.setVal("centerOnLocation", false);

        showError("You've denied access to your location, so I can't enable this setting.", "Ok");
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
     * Offline
     */

    // browser is offline
    if (window.navigator.onLine === false) {
        const [promise, resolve] = createPromise<void>();
        window.addEventListener("online", () => resolve());
        showError("Waiting for network connection...");
        await promise;
        hideError();
    }

    // google failed to load
    if (!await window.gmapsLoaded) {
        showError("Google Maps failed to load, retrying in 5 seconds...");
        await sleep(5000);
        window.location.reload();
        return;
    }

    // server is offline
    while (!await api.isOnline()) {
        showError("Connecting to server failed, retrying automatically...");
        await sleep(2000);
    }
    hideError();

    /*
     * Pre-init
     */

    await settings.init();

    const { map: { center, zoom } } = await state.load();

    settings.getSetting("darkMode").addChangeListener(v => setClass(document.body, "theme-dark", v));
    if (!largeScreen()) {
        showNav();
    }

    /*
     * Init
     */

    const map = new google.maps.Map($map, {
        center,
        zoom,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        backgroundColor: settings.getVal("darkMode") ? "#17263c" : undefined,
    });
    state.setMap(map);
    state.setActiveRegionsElem($activeRoutes);
    state.setActiveRegionAttributionsElem($activeRouteAttributions);

    const markerView = new HtmlMarkerView(map);
    state.setMarkerView(markerView);

    const search = new Search(state, $searchInput, $dropdownFilter);

    /*
     * Add settings event listeners
     */

    map.addListener("idle", () => {
        const newCenter = map.getCenter();
        const newZoom = map.getZoom();
        if (newCenter == null || newZoom == null) {
            // this should never happen
            return;
        }
        state.save("map", [newCenter.lat(), newCenter.lng(), newZoom]);
    });

    settings.getSetting("currentRegion").addChangeListener(s => search.setRegion(s));

    settings.getSetting("currentRegion").addChangeListener(async s => {
        // when the region manually changes, pan to the new region
        if (s !== "SMART") {
            const region = await api.queryRegion(s);
            map.panTo(region.location);
        }
    }, false);

    settings.getSetting("hideAbout").addChangeListener(v => setClass($navAbout, "hide", v));
    settings.getSetting("showMenuToggle").addChangeListener(v => setClass($navShow, "hide-0-899", !v));

    settings.getSetting("darkMode").addChangeListener(v => {
        map.setOptions({ styles: getTheme(v, settings.getVal("simpleMapFeatures")) });
    });
    settings.getSetting("simpleMapFeatures").addChangeListener(v => {
        map.setOptions({ styles: getTheme(settings.getVal("darkMode"), v) });
    });

    settings.getSetting("showZoom").addChangeListener(b => map.setOptions({ zoomControl: b }));

    settings.getSetting("centerOnLocation").addChangeListener(centerOnLocation => {
        if (centerOnLocation) {
            navigator.geolocation.getCurrentPosition(
                pos => map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                onGeolocationError,
                { maximumAge: 60 * 1000 },
            );
        }
    });

    let geoWatch: number | null = null;
    settings.getSetting("showLocation").addChangeListener(showLocation => {
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

    settings.getSetting("animateMarkerPosition").addChangeListener(b => {
        state.getRoutesByShortName().forEach(r => r.setAnimatePosition(b));
    });

    settings.getSetting("snapToRoute").addChangeListener(b => {
        state.getRoutesByShortName().forEach(r => r.setSnapToRoute(b));
    });

    settings.getSetting("markerType").addChangeListener(s => {
        state.getRoutesByShortName().forEach(r => r.setMarkerIconType(s));
    });

    settings.getSetting("showTransitRoutes").addChangeListener(b => {
        state.getRoutesByShortName().forEach(r => r.setShowTransitRoutes(b));
    });

    /*
     * Event Listeners
     */

    $errorBtn.addEventListener("click", () => {
        hideError();
        errorBtnCallback?.();
        errorBtnCallback = null;
    });

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
    });

    /**
     * Load routes & handle live data
     */

    await Promise.all([
        api.wsConnect(),
        state.loadRoutes(),
    ]);

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
})();
