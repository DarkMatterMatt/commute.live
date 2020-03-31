/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/ts/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/ts/Api.ts":
/*!***********************!*\
  !*** ./src/ts/Api.ts ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
const API_URL = "https://mattm.win/atlive/api/v1/";
const WS_URL = "wss://mattm.win/atlive/api/v1/websocket";
class Api {
    constructor() {
        this.ws = null;
        this.apiUrl = API_URL;
        this.wsUrl = WS_URL;
        this.subscriptions = new Set();
        this._onMessage = null;
        this.promiseWsConnect = new Promise(resolve => {
            this.resolveWhenWsConnect = resolve;
        });
    }
    async query(path, params) {
        const queryStr = `?${new URLSearchParams(params)}`;
        const response = await fetch(this.apiUrl + path + queryStr).then(r => r.json());
        if (response.status !== "success") {
            throw new Error(`Failed querying API: ${path}${queryStr}`);
        }
        return response;
    }
    async queryRoutes(shortNames, fetch) {
        const query = {};
        if (shortNames)
            query.shortNames = shortNames.join(",");
        if (fetch)
            query.fetch = fetch.join(",");
        return await this.query("routes", query);
    }
    async queryRoute(shortName, fetch) {
        const query = { shortNames: shortName };
        if (fetch)
            query.fetch = fetch.join(",");
        const response = await this.query("routes", query);
        return response.routes[shortName];
    }
    wsConnect() {
        this.ws = new WebSocket(this.wsUrl);
        let wsHeartbeatInterval;
        this.ws.addEventListener("open", () => {
            this.resolveWhenWsConnect();
            for (const shortName of this.subscriptions.values()) {
                this.subscribe(shortName);
            }
            wsHeartbeatInterval = setInterval(() => {
                this.ws.send(JSON.stringify({ route: "ping" }));
            }, 5000);
        });
        this.ws.addEventListener("close", ev => {
            if (!ev.wasClean) {
                console.warn("WebSocket closed", ev);
            }
            clearInterval(wsHeartbeatInterval);
            setTimeout(() => this.wsConnect(), 500);
        });
        this.ws.addEventListener("message", ev => {
            const data = JSON.parse(ev.data);
            if (this._onMessage === null)
                return;
            if (!data.status || !data.route)
                return;
            this._onMessage(data);
        });
        return this.promiseWsConnect;
    }
    subscribe(shortName) {
        this.subscriptions.add(shortName);
        this.ws.send(JSON.stringify({
            route: "subscribe",
            shortName,
        }));
    }
    unsubscribe(shortName) {
        this.subscriptions.delete(shortName);
        this.ws.send(JSON.stringify({
            route: "unsubscribe",
            shortName,
        }));
    }
    onMessage(listener) {
        this._onMessage = listener;
    }
}
/* harmony default export */ __webpack_exports__["default"] = (new Api());


/***/ }),

/***/ "./src/ts/Render.ts":
/*!**************************!*\
  !*** ./src/ts/Render.ts ***!
  \**************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
const MAX_FILTER_RESULTS = 20;
const SUGGESTED_COLORS = [
    "#E94537",
    "#E67C13",
    "#CECE1D",
    "#1DCE1D",
    "#5555FF",
    "#9400D3",
    "#D30094",
];
class Render {
    static createMarkerIcon(options) {
        const defaults = {
            opacity: 1,
            border: "#FFF",
            borderOpacity: 1,
            dotOpacity: 0.7,
        };
        const { fill, opacity, border, borderOpacity, dotFill, dotOpacity } = Object.assign(Object.assign({}, defaults), options);
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 57.96 90">
                <path style="fill: ${fill}; opacity: ${opacity}" d="M29,89c-1.28,0-2.81-.64-2.9-3.67C25.75,74.12,20,65.18,13.92,55.73l-.14-.23c-.94-1.45-1.9-2.89-2.86-4.33C8.58,47.64,6.15,44,4.11,40.2a25.74,25.74,0,0,1,.57-25.53A28.11,28.11,0,0,1,29,1a28.09,28.09,0,0,1,24.3,13.67,25.74,25.74,0,0,1,.57,25.53c-2,3.79-4.46,7.44-6.81,11-1,1.44-1.92,2.88-2.85,4.33l-.14.23C38,65.18,32.2,74.12,31.88,85.33,31.8,88.36,30.26,89,29,89Z" />
                <path style="fill: ${border}; opacity: ${borderOpacity}" d="M29,2c20.09.12,33.22,20.53,24,37.73C50.13,45,46.59,49.91,43.34,55c-6,9.4-12.13,18.76-12.45,30.34,0,1.24-.31,2.7-1.9,2.7h0c-1.59,0-1.86-1.46-1.9-2.7C26.74,73.72,20.66,64.36,14.62,55,11.36,49.91,7.82,45,5,39.73-4.25,22.53,8.88,2.12,29,2m0-2h0A29.11,29.11,0,0,0,3.82,14.16a26.74,26.74,0,0,0-.59,26.52c2.06,3.83,4.5,7.5,6.86,11C11,53.14,12,54.6,12.93,56.05l.15.22c6,9.34,11.68,18.16,12,29.08.12,4.31,3,4.65,3.9,4.65s3.79-.34,3.91-4.65c.31-10.92,6-19.74,12-29.08l.14-.22c.93-1.45,1.9-2.91,2.84-4.32,2.36-3.55,4.8-7.22,6.86-11a26.74,26.74,0,0,0-.59-26.52A29.08,29.08,0,0,0,29,0Z" />
                <circle style="fill: ${dotFill}; opacity: ${dotOpacity}" cx="28.98" cy="29" r="9.5" />
            </svg>
        `;
        return {
            url: `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}`,
            scaledSize: new google.maps.Size(27, 43),
        };
    }
    static createActiveRoute(routeData, color, showPickr, onColorChange, onRemove) {
        if (routeData.$activeRoute) {
            return routeData.$activeRoute;
        }
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
            el: $pickr,
            theme: "monolith",
            lockOpacity: true,
            useAsButton: true,
            default: color,
            swatches: SUGGESTED_COLORS,
            components: {
                preview: true,
                hue: true,
                interaction: {
                    input: true,
                    save: true,
                },
            },
        })
            .on("save", (newColor) => {
            pickr.hide();
            const newColorStr = newColor.toHEXA().toString();
            $parent.style.setProperty("--color", newColorStr);
            onColorChange(routeData, newColorStr);
        });
        if (showPickr) {
            setTimeout(() => pickr.show(), 0);
        }
        $remove.addEventListener("click", () => {
            pickr.destroyAndRemove();
            onRemove(routeData);
        });
        routeData.$activeRoute = $parent;
        return $parent;
    }
    static createSearchResult(routeData, onAdd) {
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
        $parent.addEventListener("click", () => onAdd(routeData));
        routeData.$searchResult = $parent;
        return $parent;
    }
    static renderFilterDropdown($dropdown, routes, onAdd) {
        $dropdown.innerHTML = "";
        if (routes.length === 0) {
            $dropdown.classList.remove("show");
            return;
        }
        $dropdown.classList.add("show");
        for (const route of routes.slice(0, MAX_FILTER_RESULTS)) {
            $dropdown.append(Render.createSearchResult(route, onAdd));
        }
    }
}
/* harmony default export */ __webpack_exports__["default"] = (Render);


/***/ }),

/***/ "./src/ts/Route.ts":
/*!*************************!*\
  !*** ./src/ts/Route.ts ***!
  \*************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _VehicleMarker__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./VehicleMarker */ "./src/ts/VehicleMarker.ts");
/* harmony import */ var _Api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Api */ "./src/ts/Api.ts");
/* harmony import */ var _Render__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Render */ "./src/ts/Render.ts");



class Route {
    constructor({ map, type, color, shortName }) {
        this.map = map;
        this.type = type;
        this.color = color;
        this.shortName = shortName;
        this.active = false;
        this.longName = null;
        this.polylines = null;
        this.vehicleMarkers = new Map();
    }
    generateMarkerIcon(directionId, colorOverride) {
        const fill = colorOverride || this.color;
        const dotFill = directionId === 0 ? "#000" : "#FFF";
        return _Render__WEBPACK_IMPORTED_MODULE_2__["default"].createMarkerIcon({ fill, dotFill });
    }
    showVehicle({ vehicleId, position, lastUpdated, directionId }) {
        let marker = this.vehicleMarkers.get(vehicleId);
        if (marker === undefined) {
            marker = new _VehicleMarker__WEBPACK_IMPORTED_MODULE_0__["default"]({ map: this.map });
            this.vehicleMarkers.set(vehicleId, marker);
            marker.interval = setInterval(() => {
                const now = Math.floor((new Date()).getTime() / 1000);
                if (marker.lastUpdated < now - 90) {
                    marker.setMap(null);
                    clearInterval(marker.interval);
                    this.vehicleMarkers.delete(vehicleId);
                }
                else if (marker.lastUpdated < now - 30) {
                    marker.setIcon(this.generateMarkerIcon(directionId, "gray"));
                }
            }, 1000 + Math.floor(Math.random() * 200));
        }
        marker.setPosition(position);
        marker.setIcon(this.generateMarkerIcon(directionId));
        marker.lastUpdated = lastUpdated;
        marker.directionId = directionId;
    }
    setColor(color) {
        this.color = color;
        if (this.polylines) {
            this.polylines[2].setOptions({ strokeColor: color });
            this.polylines[3].setOptions({ strokeColor: color });
        }
        for (const m of this.vehicleMarkers.values()) {
            m.setIcon(this.generateMarkerIcon(m.directionId));
        }
    }
    async activate() {
        if (this.active) {
            return;
        }
        this.active = true;
        _Api__WEBPACK_IMPORTED_MODULE_1__["default"].subscribe(this.shortName);
        const [{ longName, polylines }, { vehicles },] = await Promise.all([
            _Api__WEBPACK_IMPORTED_MODULE_1__["default"].queryRoute(this.shortName, ["longName", "polylines"]),
            _Api__WEBPACK_IMPORTED_MODULE_1__["default"].queryRoute(this.shortName, ["vehicles"]),
        ]);
        this.longName = longName;
        const { map } = this;
        const strokeOpacity = 0.7;
        this.polylines = [
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: "black" }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: "white" }),
            new google.maps.Polyline({ map, path: polylines[0], strokeColor: this.color, strokeOpacity, zIndex: 1 }),
            new google.maps.Polyline({ map, path: polylines[1], strokeColor: this.color, strokeOpacity, zIndex: 2 }),
        ];
        Object.values(vehicles).map(v => this.showVehicle(v));
    }
    deactivate() {
        if (!this.active) {
            return;
        }
        this.active = false;
        _Api__WEBPACK_IMPORTED_MODULE_1__["default"].unsubscribe(this.shortName);
        for (const polyline of this.polylines) {
            polyline.setMap(null);
            this.polylines = [];
        }
        for (const marker of this.vehicleMarkers.values()) {
            marker.setMap(null);
        }
    }
}
/* harmony default export */ __webpack_exports__["default"] = (Route);


/***/ }),

/***/ "./src/ts/Search.ts":
/*!**************************!*\
  !*** ./src/ts/Search.ts ***!
  \**************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Api__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Api */ "./src/ts/Api.ts");
/* harmony import */ var _Render__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Render */ "./src/ts/Render.ts");


class Search {
    constructor(state, $search, $dropdown) {
        this.state = state;
        this.$search = $search;
        this.$dropdown = $dropdown;
        $search.addEventListener("keyup", ev => {
            if (ev.key === "Escape") {
                $search.value = "";
                this.hideDropdown();
                return;
            }
            if (ev.key === "Enter") {
                $dropdown.firstChild.click();
                return;
            }
            this.search($search.value);
        });
    }
    async load() {
        const response = await _Api__WEBPACK_IMPORTED_MODULE_0__["default"].queryRoutes(null, ["shortName", "longName", "type"]);
        const routes = Object.values(response.routes);
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
        this.routes = routes;
    }
    render(routes) {
        _Render__WEBPACK_IMPORTED_MODULE_1__["default"].renderFilterDropdown(this.$dropdown, routes, routeData => {
            this.$search.value = "";
            this.state.activateRoute(routeData);
        });
    }
    hideDropdown() {
        this.render([]);
    }
    search(query_) {
        const query = query_.toLowerCase();
        if (query === "") {
            this.hideDropdown();
            return;
        }
        this.routes.forEach(r => {
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
            r.filterWeight = filterWeight;
        });
        const filtered = this.routes.filter(r => r.filterWeight && !this.state.isActive(r));
        filtered.sort((a, b) => b.filterWeight - a.filterWeight);
        this.render(filtered);
    }
}
/* harmony default export */ __webpack_exports__["default"] = (Search);


/***/ }),

/***/ "./src/ts/State.ts":
/*!*************************!*\
  !*** ./src/ts/State.ts ***!
  \*************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Route__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Route */ "./src/ts/Route.ts");
/* harmony import */ var _Render__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Render */ "./src/ts/Render.ts");


const STATE_VERSION = 1;
class State {
    constructor(map, $addRoute) {
        this.map = map;
        this.$addRoute = $addRoute;
        this.load();
    }
    static migrate(data) {
        data.version = STATE_VERSION;
        return data;
    }
    toJSON() {
        return {
            version: this.version,
            routes: [...this.routesByShortName.values()].map(r => [r.type, r.shortName, r.active, r.color]),
        };
    }
    save() {
        localStorage.setItem("state", JSON.stringify(this));
    }
    load() {
        let data = {
            version: STATE_VERSION,
            routes: [],
        };
        const dataStr = localStorage.getItem("state");
        if (dataStr !== null) {
            data = State.migrate(Object.assign(Object.assign({}, data), JSON.parse(dataStr)));
        }
        this.version = data.version;
        this.routesByShortName = new Map();
        for (const [type, shortName, active, color] of data.routes) {
            const route = new _Route__WEBPACK_IMPORTED_MODULE_0__["default"]({
                shortName,
                color,
                type,
                map: this.map,
            });
            this.routesByShortName.set(shortName, route);
            if (active) {
                const $activeRoute = _Render__WEBPACK_IMPORTED_MODULE_1__["default"].createActiveRoute({ shortName }, route.color, false, this.changeRouteColor.bind(this), this.deactivateRoute.bind(this));
                this.$addRoute.parentNode.insertBefore($activeRoute, this.$addRoute);
                route.activate();
            }
        }
    }
    getNewColor() {
        return "#E94537";
    }
    isActive({ shortName }) {
        const route = this.routesByShortName.get(shortName);
        return route ? route.active : false;
    }
    showVehicle(data) {
        const route = this.routesByShortName.get(data.shortName);
        if (route === undefined) {
            console.log("Skipping vehicle update because the route does not exist", data);
            return;
        }
        route.showVehicle(data);
    }
    changeRouteColor({ shortName }, color) {
        const route = this.routesByShortName.get(shortName);
        if (route) {
            route.setColor(color);
        }
        this.save();
    }
    deactivateRoute({ shortName, $activeRoute }) {
        const route = this.routesByShortName.get(shortName);
        if (route !== undefined) {
            route.deactivate();
        }
        $activeRoute.remove();
        this.save();
    }
    async activateRoute({ shortName, type }) {
        let route = this.routesByShortName.get(shortName);
        let showPickr = false;
        if (route === undefined) {
            showPickr = true;
            route = new _Route__WEBPACK_IMPORTED_MODULE_0__["default"]({
                shortName,
                type,
                color: this.getNewColor(),
                map: this.map,
            });
            this.routesByShortName.set(shortName, route);
        }
        const $activeRoute = _Render__WEBPACK_IMPORTED_MODULE_1__["default"].createActiveRoute({ shortName }, route.color, showPickr, this.changeRouteColor.bind(this), this.deactivateRoute.bind(this));
        this.$addRoute.parentNode.insertBefore($activeRoute, this.$addRoute);
        await route.activate();
        this.save();
    }
}
/* harmony default export */ __webpack_exports__["default"] = (State);


/***/ }),

/***/ "./src/ts/VehicleMarker.ts":
/*!*********************************!*\
  !*** ./src/ts/VehicleMarker.ts ***!
  \*********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
class VehicleMarker extends google.maps.Marker {
}
/* harmony default export */ __webpack_exports__["default"] = (VehicleMarker);


/***/ }),

/***/ "./src/ts/index.ts":
/*!*************************!*\
  !*** ./src/ts/index.ts ***!
  \*************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _State__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./State */ "./src/ts/State.ts");
/* harmony import */ var _Api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Api */ "./src/ts/Api.ts");
/* harmony import */ var _Search__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Search */ "./src/ts/Search.ts");



const AUCKLAND_COORDS = { lat: -36.848461, lng: 174.763336 };
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
function largeScreen() {
    return window.matchMedia("(min-width: 900px)").matches;
}
function isVisible($e) {
    return Boolean($e && ($e.offsetWidth || $e.offsetHeight || $e.getClientRects().length));
}
function onClickOutside($e, cb) {
    const outsideClickListener = (ev) => {
        if (!$e.contains(ev.target) && isVisible($e)) {
            removeClickListener();
            cb(ev);
        }
    };
    const removeClickListener = () => {
        document.removeEventListener("click", outsideClickListener);
    };
    document.addEventListener("click", outsideClickListener);
}
function closeMenu() {
    $menu.classList.remove("show");
}
function openMenu() {
    $menu.classList.add("show");
}
function showHelp() {
    $help.classList.add("show");
}
function hideHelp() {
    $help.classList.remove("show");
}
function helpIsVisible() {
    return $help.classList.contains("show");
}
function closeAddRouteInput() {
    $addRoute.classList.remove("show");
    if (largeScreen()) {
        setTimeout(() => {
            $searchInput.value = "";
        }, 200);
    }
}
function openAddRouteInput() {
    $addRoute.classList.add("show");
    $searchInput.focus();
}
(async () => {
    await _Api__WEBPACK_IMPORTED_MODULE_1__["default"].wsConnect();
    const state = new _State__WEBPACK_IMPORTED_MODULE_0__["default"](new google.maps.Map($map, {
        center: AUCKLAND_COORDS,
        zoom: 13,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
    }), $addRoute);
    navigator.geolocation.getCurrentPosition(r => state.map.panTo({ lat: r.coords.latitude, lng: r.coords.longitude }));
    const search = new _Search__WEBPACK_IMPORTED_MODULE_2__["default"](state, $searchInput, $dropdownFilter);
    search.load();
    _Api__WEBPACK_IMPORTED_MODULE_1__["default"].onMessage((data) => {
        if (data.status !== "success") {
            console.error(data.route, data.message, data);
            return;
        }
        if (data.route === "subscribe" || data.route === "unsubscribe") {
            console.log(data.message);
            return;
        }
        if (data.route === "live/vehicle") {
            state.showVehicle(data);
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


/***/ })

/******/ });
//# sourceMappingURL=bundle.js.map