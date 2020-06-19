/**
 * Test if the device is using the CSS layout for large screens
 */
export function largeScreen(): boolean {
    return window.matchMedia("(min-width: 900px)").matches;
}

let localStorageEnabled_: boolean = null;
/**
 * Test if localStorage is working
 */
export function localStorageEnabled(): boolean {
    if (localStorageEnabled_ === null) {
        try {
            localStorage.setItem("localStorageTest", "localStorageTest");
            localStorage.removeItem("localStorageTest");
            localStorageEnabled_ = true;
        }
        catch (e) {
            localStorageEnabled_ = false;
        }
    }
    return localStorageEnabled_;
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
 * Test if there is a working network connection. Always returns true in development mode.
 */
export async function isOnline(): Promise<boolean> {
    if (process.env.NODE_ENV === "development") {
        return true;
    }
    try {
        const r = await fetch("/generate_204");
        return r.status === 204;
    }
    catch (e) {
        return false;
    }
}
