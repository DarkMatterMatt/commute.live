import "../scss/styles.scss";
import "core-js/stable";
import "regenerator-runtime/runtime";

import { state } from "./State";
import { api } from "./Api";
import Search from "./Search";
import mapThemes from "./mapThemes";
import { settings } from "./Settings";
import { render } from "./Render";
import { isOnline, largeScreen } from "./Helpers";
import HtmlMarkerView from "./HtmlMarkerView";

const AUCKLAND_COORDS = { lat: -36.848461, lng: 174.763336 };
const OPEN_MENU_ON_FIRST_VISIT_TIMEOUT = 5 * 1000;

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
const $error = document.getElementById("error");
const $errorMessage = $error.getElementsByClassName("message")[0];
const $errorBtn = $error.getElementsByClassName("btn")[0];

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

function hideError() {
    $error.classList.remove("show");
    setTimeout(() => $errorBtn.classList.remove("show"), 150);
}

function showError(msg: string, btnText: string = null, btnCallback: () => void = null) {
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

    state.load();
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

    const map = new google.maps.Map($map, {
        center:            AUCKLAND_COORDS,
        zoom:              13,
        streetViewControl: false,
        mapTypeControl:    false,
        fullscreenControl: false,
        backgroundColor:   settings.getBool("darkMode") ? "#17263c" : undefined,
    });
    state.setMap(map);
    state.setActiveRoutesElem($activeRoutes);

    const markerView = new HtmlMarkerView(map);
    state.setMarkerView(markerView);

    const wsConnectTimeout = setTimeout(() => {
        showError("Waiting to connect to server.... Your internet is fine, it's my server that's broken :(");
    }, 2000);
    api.wsConnect().then(() => {
        clearInterval(wsConnectTimeout);
        hideError();
        const search = new Search(state, $searchInput, $dropdownFilter);
        search.load();
    });

    /*
     * Add settings event listeners
     */

    settings.addChangeListener("hideAbout", v => setClass($navAbout, "hide", v));
    settings.addChangeListener("showMenuToggle", v => setClass($navShow, "hide-0-899", !v));

    settings.addChangeListener("darkMode", v => map.setOptions({ styles: v ? mapThemes.dark : mapThemes.light }));
    settings.addChangeListener("showZoom", b => map.setOptions({ zoomControl: b }));

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
            render.showLocation(null, null);
        }
    });

    settings.addChangeListener("animateMarkerPosition", b => {
        state.getRoutesByShortName().forEach(r => r.setAnimatePosition(b));
    });

    settings.addChangeListener("markerType", s => {
        state.getRoutesByShortName().forEach(r => r.setMarkerIconType(s));
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

    // on a user's first visit, show the menu after $x settings if they have a large screen
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
