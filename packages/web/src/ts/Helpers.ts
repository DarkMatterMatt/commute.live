/**
 * Test if the device is using the CSS layout for large screens
 */
export function largeScreen(): boolean {
    return window.matchMedia("(min-width: 900px)").matches;
}

let localStorageEnabledResult: boolean = null;
/**
 * Test if localStorage is working
 */
export function localStorageEnabled(): boolean {
    if (localStorageEnabledResult === null) {
        try {
            localStorage.setItem("localStorageTest", "localStorageTest");
            localStorage.removeItem("localStorageTest");
            localStorageEnabledResult = true;
        }
        catch (e) {
            localStorageEnabledResult = false;
        }
    }
    return localStorageEnabledResult;
}

/**
 * Test if the specified object is empty
 * @param obj The object to test
 */
export function isEmptyObject(obj: Record<any, any>): boolean {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

/**
 * Test if the specified HTMLElement is visible
 * @param $e The HTMLElement to check the visibility of
 */
export function isVisible($e: HTMLElement): boolean {
    return Boolean($e && ($e.offsetWidth || $e.offsetHeight || $e.getClientRects().length));
}

/**
 * Add listener for a click outside a specified HTMLElement
 * @param $e The callback will be execute when there is a click outside this element
 * @param cb Callback that will recieve a standard mouse click event
 */
export function onClickOutside($e: HTMLElement, cb: (ev: MouseEvent) => void): void {
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

/**
 * Test if there is a working network connection.
 */
export async function isOnline(): Promise<boolean> {
    try {
        const r = await fetch("https://httpstat.us/204");
        return r.status === 204;
    }
    catch (e) {
        return false;
    }
}

/**
 * Convert LatLngBoundsLiteral to LatLngBounds.
 */
// eslint-disable-next-line max-len
export function fromLatLngBoundsLiteral(b: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral): google.maps.LatLngBounds {
    if (b instanceof google.maps.LatLngBounds) {
        return b;
    }
    return new google.maps.LatLngBounds(
        new google.maps.LatLng(b.south, b.west),
        new google.maps.LatLng(b.north, b.east)
    );
}

/**
 * Convert LatLngLiteral to LatLng.
 */
export function fromLatLngLiteral(p: google.maps.LatLng | google.maps.LatLngLiteral): google.maps.LatLng {
    if (p instanceof google.maps.LatLng) {
        return p;
    }
    return new google.maps.LatLng(p.lat, p.lng);
}
