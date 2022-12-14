import { api } from "./Api";
import { BooleanSetting, NumberSetting, type Setting, StringSetting } from "./Setting";

function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
}

const $currentRegion = getInput("s-current-region");

const SETTINGS = [
    new StringSetting("currentRegion", $currentRegion),
    new BooleanSetting("darkMode", getInput("sw-dark-mode")),
    new BooleanSetting("hideAbout", getInput("sw-hide-about")),
    new BooleanSetting("showMenuToggle", getInput("sw-show-menu-toggle")),
    new BooleanSetting("showLocation", getInput("sw-show-location")),
    new BooleanSetting("centerOnLocation", getInput("sw-center-location")),
    new BooleanSetting("showZoom", getInput("sw-show-zoom")),
    new BooleanSetting("animateMarkerPosition", getInput("sw-animate-marker-position")),
    new BooleanSetting("showTransitRoutes", getInput("sw-show-transit-routes")),
    new StringSetting("markerType", getInput("s-marker-type")),
];

let instance: Settings | null = null;

class Settings {
    private settings = new Map<string, Setting>();

    private constructor() {
        SETTINGS.forEach(s => this.settings.set(s.name, s));
    }

    static getInstance(): Settings {
        if (instance == null) {
            instance = new Settings();
        }
        return instance;
    }

    async init() {
        // load regions from API
        const regions = await api.queryRegions();
        for (const region of regions) {
            const option = document.createElement("option");
            option.value = region.code;
            option.textContent = `${region.country} - ${region.region}`;
            $currentRegion.appendChild(option);
        }
    }

    import(newSettings: Record<string, any>): void {
        Object.entries(newSettings).forEach(([k, v]) => {
            const s = this.settings.get(k);
            if (s != null) {
                s.value = v;
            }
        });
    }

    toJSON(): Record<string, any> {
        return Object.fromEntries(
            [...this.settings.values()]
                .filter(s => s.value !== s.defaultValue)
                .map(s => [s.name, s.value]),
        );
    }

    getBool(name: string): boolean {
        const setting = this.settings.get(name);
        if (!(setting instanceof BooleanSetting)) {
            throw Error(`Cannot call getBool on a setting of type ${setting?.constructor?.name}`);
        }
        return setting && setting.value;
    }

    getStr(name: string): string {
        const setting = this.settings.get(name);
        if (!(setting instanceof StringSetting)) {
            throw Error(`Cannot call getStr on a setting of type ${setting?.constructor?.name}`);
        }
        return setting && setting.value;
    }

    getNum(name: string): number {
        const setting = this.settings.get(name);
        if (!(setting instanceof NumberSetting)) {
            throw Error(`Cannot call getNum on a setting of type ${setting?.constructor?.name}`);
        }
        return setting && setting.value;
    }

    setBool(name: string, val: boolean): void {
        const setting = this.settings.get(name);
        if (!(setting instanceof BooleanSetting)) {
            throw Error(`Cannot call setBool on a setting of type ${setting?.constructor?.name}`);
        }
        setting.value = val;
    }

    setStr(name: string, val: string): void {
        const setting = this.settings.get(name);
        if (!(setting instanceof StringSetting)) {
            throw Error(`Cannot call setStr on a setting of type ${setting?.constructor?.name}`);
        }
        setting.value = val;
    }

    setNum(name: string, val: number): void {
        const setting = this.settings.get(name);
        if (!(setting instanceof NumberSetting)) {
            throw Error(`Cannot call setNum on a setting of type ${setting?.constructor?.name}`);
        }
        setting.value = val;
    }

    getSetting(name: string): Setting {
        const result = this.settings.get(name);
        if (result == null) {
            throw Error(`No setting with name ${name}`);
        }
        return result;
    }

    getNames(): string[] {
        return [...this.settings.keys()];
    }

    addChangeListener(name: string, l: (value: any, name: string) => void, triggerNow = true): void {
        const setting = this.settings.get(name);
        if (setting != null) {
            setting.addChangeListener(l, triggerNow);
        }
    }

    removeChangeListener(name: string, l: (value: any, name: string) => void): void {
        const setting = this.settings.get(name);
        if (setting != null) {
            setting.removeChangeListener(l);
        }
    }
}

export default Settings;

export const settings = Settings.getInstance();
