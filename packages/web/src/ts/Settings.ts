import type { RegionCode } from "@commutelive/common";
import { api } from "./Api";
import { BooleanSetting, StringSetting } from "./Setting";
import type { MarkerType } from "./types";

function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
}

const $currentRegion = getInput("s-current-region");

const SETTINGS = [
    new StringSetting<"currentRegion", "SMART" | RegionCode>("currentRegion", $currentRegion),
    new BooleanSetting("darkMode", getInput("sw-dark-mode")),
    new BooleanSetting("simpleMapFeatures", getInput("sw-simple-map-features")),
    new BooleanSetting("hideAbout", getInput("sw-hide-about")),
    new BooleanSetting("showMenuToggle", getInput("sw-show-menu-toggle")),
    new BooleanSetting("showLocation", getInput("sw-show-location")),
    new BooleanSetting("centerOnLocation", getInput("sw-center-location")),
    new BooleanSetting("showZoom", getInput("sw-show-zoom")),
    new BooleanSetting("animateMarkerPosition", getInput("sw-animate-marker-position")),
    new BooleanSetting("snapToRoute", getInput("sw-snap-to-route")),
    new BooleanSetting("showTransitRoutes", getInput("sw-show-transit-routes")),
    new StringSetting<"markerType", MarkerType>("markerType", getInput("s-marker-type")),
] as const;

type SettingsUnion = typeof SETTINGS[number];

type SettingNames = SettingsUnion["name"];

type SettingByName<Name> = Extract<SettingsUnion, { name: Name }>;

export type SettingsType = { [Name in SettingNames]?: SettingByName<Name>["value"] };

let instance: Settings | null = null;

export class Settings {
    private settings = new Map(SETTINGS.map(s => [s.name, s]));

    private constructor() {
        //
    }

    public static getInstance(): Settings {
        if (instance == null) {
            instance = new Settings();
        }
        return instance;
    }

    public async init() {
        // load regions from API
        const regions = await api.queryRegions();
        for (const region of regions) {
            const option = document.createElement("option");
            option.value = region.code;
            option.textContent = `${region.country} - ${region.region}`;
            $currentRegion.appendChild(option);
        }
    }

    public import(newSettings: SettingsType): void {
        Object.entries(newSettings).forEach(([k, v]) => {
            const s = this.settings.get(k as SettingNames);
            if (s == null) {
                console.warn(`Could not find setting with name: ${k}`);
                return;
            }
            s.value = v;
        });
    }

    public getVal<N extends SettingNames, S extends SettingByName<N>>(name: N): S["value"] {
        return this.getSetting(name).value as S["value"];
    }

    public setVal<N extends SettingNames, S extends SettingByName<N>>(name: N, val: S["value"]): void {
        this.getSetting(name).value = val;
    }

    public getSetting<N extends SettingNames, S extends SettingByName<N>>(name: N): S {
        const result = this.settings.get(name) as S;
        if (result == null) {
            throw Error(`Could not find setting with name: ${name}`);
        }
        return result;
    }

    public getAll() {
        return new Map(this.settings);
    }
}

export const settings = Settings.getInstance();
