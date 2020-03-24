import VehicleMarker from "./VehicleMarker";
import { LiveVehicle, SearchRoute } from "./types";
import State from "./State";
import Api from "./Api";
import Route from "./Route";

const AUCKLAND_COORDS = { lat: -36.848461, lng: 174.763336 };
const DEFAULT_COLOR = "#E94537";
const MAX_FILTER_RESULTS = 20;
const SUGGESTED_COLORS = [
    "#242551",
    "#406244",
    "#dab71f",
    "#d8832b",
    "#c94d4d",
];
const WS_URL = "ws://mattm.win/ATLive/api/v1/websocket";

/*
 * DOM Element References
 */

const $map = document.getElementById("map");
const $openMenu = document.getElementById("open-menu");
const $menu = document.getElementById("menu");
const $closeMenu = $menu.getElementsByClassName("close")[0];
const $addRoute = document.getElementById("add-route");
const $addRouteBtn = $addRoute.getElementsByClassName("btn")[0];
const $addRouteInput = $addRoute.getElementsByTagName("input")[0];
const $dropdownFilter = document.getElementById("dropdown-filter");
const $help = document.getElementById("help");
const $helpBtn = $help.getElementsByClassName("btn")[0];

/*
 * Global Variables
 */

const state = new State();

/*
 * Functions
 */

function largeScreen(): boolean {
    return window.matchMedia("min-width: 900px").matches;
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

function generateMarkerIcon(directionId: LiveVehicle["directionId"], fill: string): google.maps.Icon {
    /* eslint-disable max-len */
    const opacity = 1;
    const border = "#FFF";
    const borderOpacity = "1";
    const dotFill = directionId === 0 ? "#000" : "#FFF";
    const dotOpacity = 0.7;
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 57.96 90">
            <path style="fill: ${fill}; opacity: ${opacity}" d="M29,89c-1.28,0-2.81-.64-2.9-3.67C25.75,74.12,20,65.18,13.92,55.73l-.14-.23c-.94-1.45-1.9-2.89-2.86-4.33C8.58,47.64,6.15,44,4.11,40.2a25.74,25.74,0,0,1,.57-25.53A28.11,28.11,0,0,1,29,1a28.09,28.09,0,0,1,24.3,13.67,25.74,25.74,0,0,1,.57,25.53c-2,3.79-4.46,7.44-6.81,11-1,1.44-1.92,2.88-2.85,4.33l-.14.23C38,65.18,32.2,74.12,31.88,85.33,31.8,88.36,30.26,89,29,89Z" />
            <path style="fill: ${border}; opacity: ${borderOpacity}" d="M29,2c20.09.12,33.22,20.53,24,37.73C50.13,45,46.59,49.91,43.34,55c-6,9.4-12.13,18.76-12.45,30.34,0,1.24-.31,2.7-1.9,2.7h0c-1.59,0-1.86-1.46-1.9-2.7C26.74,73.72,20.66,64.36,14.62,55,11.36,49.91,7.82,45,5,39.73-4.25,22.53,8.88,2.12,29,2m0-2h0A29.11,29.11,0,0,0,3.82,14.16a26.74,26.74,0,0,0-.59,26.52c2.06,3.83,4.5,7.5,6.86,11C11,53.14,12,54.6,12.93,56.05l.15.22c6,9.34,11.68,18.16,12,29.08.12,4.31,3,4.65,3.9,4.65s3.79-.34,3.91-4.65c.31-10.92,6-19.74,12-29.08l.14-.22c.93-1.45,1.9-2.91,2.84-4.32,2.36-3.55,4.8-7.22,6.86-11a26.74,26.74,0,0,0-.59-26.52A29.08,29.08,0,0,0,29,0Z" />
            <circle style="fill: ${dotFill}; opacity: ${dotOpacity}" cx="28.98" cy="29" r="9.5" />
        </svg>
    `;

    return {
        url:        `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}`,
        scaledSize: new google.maps.Size(27, 43),
    };
}

function showVehicle(data: LiveVehicle): void {
    const { shortName, vehicleId, position, lastUpdated, directionId } = data;

    const route = state.routesByShortName.get(shortName);
    if (route === undefined) {
        console.log("Skipping vehicle update because the route does not exist", data);
        return;
    }

    let marker = route.vehicleMarkers.get(data.vehicleId);
    if (marker === undefined) {
        marker = new VehicleMarker({ map: state.map });
        route.vehicleMarkers.set(data.vehicleId, marker);

        marker.interval = setInterval(() => {
            // delete marker after no update for 90 seconds
            const now = Math.floor((new Date()).getTime() / 1000);
            if (marker.lastUpdated < now - 90) {
                marker.setMap(null);
                clearInterval(marker.interval);
                route.vehicleMarkers.delete(vehicleId);
            }
            // make marker gray after no update for 30 seconds
            else if (marker.lastUpdated < now - 30) {
                marker.setIcon(generateMarkerIcon(directionId, "gray"));
            }
        }, 1000 + Math.floor(Math.random() * 200));
    }

    marker.setPosition(position);
    marker.setIcon(generateMarkerIcon(directionId, route.color));
    marker.lastUpdated = lastUpdated;
    marker.directionId = directionId;
}

function wsConnect(): void {
    state.ws = new WebSocket(WS_URL);
    let wsHeartbeatInterval: number;

    state.ws.addEventListener("open", () => {
        // send a heartbeat every 5 seconds
        wsHeartbeatInterval = setInterval(() => {
            state.ws.send(JSON.stringify({ route: "ping" }));
        }, 5000);
    });

    state.ws.addEventListener("close", ev => {
        if (!ev.wasClean) {
            console.warn("WebSocket closed", ev);
        }
        clearInterval(wsHeartbeatInterval);
        setTimeout(wsConnect, 500);
    });

    // listen for messages
    state.ws.addEventListener("message", ev => {
        const data = JSON.parse(ev.data);

        if (data.route === "live/vehicle") {
            showVehicle(data);
            return;
        }

        if (data.status !== "success") {
            console.error(data.route, data.message, data);
            return;
        }
        if (data.route === "ping") {
            return;
        }

        console.log(data.route, data.message, data);
    });
}

function subscribe(shortName: string): void {
    state.ws.send(JSON.stringify({
        route: "subscribe",
        shortName,
    }));
}

function unsubscribe(shortName: string): void {
    state.ws.send(JSON.stringify({
        route: "unsubscribe",
        shortName,
    }));
}

function changeRouteColor(routeData: SearchRoute, color: Pickr.HSVaColor): void {
    const route = state.routesByShortName.get(routeData.shortName);
    if (route) {
        route.setColor(color);
    }
}

function removeRoute(routeData: SearchRoute, pickr?: Pickr): void {
    const route = state.routesByShortName.get(routeData.shortName);
    if (route) {
        route.remove();
    }
    if (pickr) {
        pickr.destroyAndRemove();
    }
}

function createActiveRoute(routeData: SearchRoute): HTMLDivElement {
    const route = state.routesByShortName.get(routeData.shortName);
    const color = route ? route.color : DEFAULT_COLOR;

    const $parent = document.createElement("div");
    $parent.classList.add("active-route");
    $parent.style.setProperty("--color", color);

    const $shortName = document.createElement("div");
    $shortName.classList.add("short");
    $shortName.classList.add("name");
    $shortName.append(document.createTextNode(routeData.shortName));
    $parent.append($shortName);

    const $pickr = document.createElement("span");
    $pickr.classList.add("pickr");
    $pickr.classList.add("btn");
    $parent.append($pickr);

    const $remove = document.createElement("div");
    $remove.classList.add("remove");
    $remove.classList.add("btn");
    $parent.append($remove);

    const $img = document.createElement("img");
    $img.src = "images/remove.svg";
    $img.alt = "Remove route";
    $remove.append($img);

    const pickr = Pickr
        .create({
            el:          $pickr,
            theme:       "monolith",
            lockOpacity: true,
            useAsButton: true,
            default:     color,
            swatches:    SUGGESTED_COLORS,

            components: {
                preview: true,
                hue:     true,

                interaction: {
                    input: true,
                    save:  true,
                },
            },
        })
        .on("save", (newColor: Pickr.HSVaColor) => {
            pickr.hide();
            $parent.style.setProperty("--color", newColor.toHEXA().toString());
            changeRouteColor(routeData, newColor);
        });

    $remove.addEventListener("click", () => removeRoute(routeData, pickr));

    return $parent;
}

function addRoute(routeData: SearchRoute): void {
    const { shortName, type } = routeData;

    const $activeRoute = createActiveRoute(routeData);
    $addRoute.parentNode.insertBefore($activeRoute, $addRoute);

    let route = state.routesByShortName.get(shortName);
    if (route === undefined) {
        route = new Route({
            type,
            shortName,
            map:   state.map,
            color: DEFAULT_COLOR,
        });
        state.routesByShortName.set(shortName, route);
    }

    route.show();
}

function createSearchResult(routeData: SearchRoute): HTMLDivElement {
    if (routeData.$searchResult) {
        return routeData.$searchResult;
    }

    const $parent = document.createElement("div");
    $parent.classList.add("filter-result");
    $parent.classList.add("btn");

    const $img = document.createElement("img");
    $img.classList.add("hide-0-899");
    $img.src = `images/${routeData.type}-filled.svg`;
    $img.alt = routeData.type;
    $parent.append($img);

    const $shortName = document.createElement("span");
    $shortName.classList.add("short");
    $shortName.classList.add("name");
    $shortName.append(document.createTextNode(routeData.shortName));
    $parent.append($shortName);

    const $longName = document.createElement("span");
    $longName.classList.add("long");
    $longName.classList.add("name");
    $longName.append(document.createTextNode(routeData.longName));
    $parent.append($longName);

    $parent.addEventListener("click", () => {
        addRoute(routeData);
        $addRouteInput.value = "";
    });

    // eslint-disable-next-line no-param-reassign
    routeData.$searchResult = $parent;
    return $parent;
}

function closeMenu(): void {
    $menu.classList.remove("show");
}

function openMenu(): void {
    $menu.classList.add("show");
}

function clearFilterDropdown(): void {
    $dropdownFilter.innerHTML = "";
}

function closeFilter(): void {
    $dropdownFilter.classList.remove("show");
    clearFilterDropdown();
}

function openFilter(): void {
    clearFilterDropdown();
    $dropdownFilter.classList.add("show");
}

function closeAddRouteInput(): void {
    $addRoute.classList.remove("show");
    if (largeScreen()) {
        setTimeout(() => {
            $addRouteInput.value = "";
        }, 200);
    }
    closeFilter();
}

function openAddRouteInput(): void {
    $addRoute.classList.add("show");
    $addRouteInput.focus();
}

function renderFilterDropdown(routes: SearchRoute[]): void {
    if (routes.length === 0) {
        closeFilter();
        return;
    }

    openFilter();
    for (const route of routes.slice(0, MAX_FILTER_RESULTS)) {
        if (!route.$searchResult) {
            createSearchResult(route);
        }
        $dropdownFilter.append(route.$searchResult);
    }
}

async function loadSearchData(): Promise<SearchRoute[]> {
    const response = await Api.queryRoutes(null, ["shortName", "longName", "type"]);
    const routes: SearchRoute[] = Object.values(response.routes) as SearchRoute[];

    const regexWord = /[a-z]+/g;
    for (const route of routes) {
        route.shortNameLower = route.shortName.toLowerCase();
        route.longNameLower = route.longName.toLowerCase();
        route.longNameWords = [];

        let m;
        do {
            m = regexWord.exec(route.longNameLower);
            if (m && !["to", "via"].includes(m[0])) {
                route.longNameWords.push(m[0]);
            }
        } while (m);
    }

    const regexTwoDigits = /^\d\d\D?$/;
    routes.sort((a, b) => {
        /**
         * Sort by route number ascending (two digit number first)
         * Then sort alphabetically, numbers first
         */
        const aInt = Number.parseInt(a.shortName, 10);
        const bInt = Number.parseInt(b.shortName, 10);
        if (aInt && bInt) {
            const aTwoDigits = regexTwoDigits.test(a.shortName);
            const bTwoDigits = regexTwoDigits.test(b.shortName);
            if (aTwoDigits !== bTwoDigits) {
                return Number(bTwoDigits) - Number(aTwoDigits);
            }
            return aInt - bInt;
        }
        return a.shortName < b.shortName ? -1 : 1;
    });

    return routes;
}

function search(searchData: SearchRoute[], query: string): void {
    if (query === "") {
        closeFilter();
        return;
    }
    searchData.forEach(r => {
        let filterWeight = 0;
        if (r.shortNameLower === query) {
            filterWeight += 50;
        }
        else if (r.shortNameLower.startsWith(query)) {
            filterWeight += 25;
        }
        if (r.longNameLower.includes(query)) {
            filterWeight += 5;
        }
        r.longNameWords.forEach(word => {
            if (word.startsWith(query)) {
                filterWeight += 5;
            }
            else if (word.includes(query)) {
                filterWeight += 1;
            }
        });

        // eslint-disable-next-line no-param-reassign
        r.filterWeight = filterWeight;
    });
    const filtered = searchData.filter(r => r.filterWeight && !state.isActive(r.shortName));
    filtered.sort((a, b) => b.filterWeight - a.filterWeight);
    renderFilterDropdown(filtered);
}

(async (): Promise<void> => {
    /*
     * Init
     */

    state.map = new google.maps.Map($map, {
        center:            AUCKLAND_COORDS,
        zoom:              13,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl:    false,
    });
    navigator.geolocation.getCurrentPosition(r => state.map.panTo({ lat: r.coords.latitude, lng: r.coords.longitude }));

    wsConnect();
    const searchData = await loadSearchData();

    /*
     * Event Listeners
     */

    $openMenu.addEventListener("click", openMenu);

    $closeMenu.addEventListener("click", closeMenu);

    $addRoute.addEventListener("click", ev => {
        if (!$addRoute.classList.contains("show")) {
            openAddRouteInput();
            onClickOutside($addRoute, closeAddRouteInput);
        }
        else if (ev.target === $addRouteBtn) {
            closeAddRouteInput();
        }
    });

    $addRouteInput.addEventListener("keyup", () => {
        search(searchData, $addRouteInput.value);
    });
})();
