import Setting, { BooleanSetting, StringSetting, NumberSetting } from "./Setting";

function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
}

const SETTINGS = [
    new BooleanSetting("darkMode", getInput("sw-dark-mode")),
];

let instance: Settings = null;

class Settings {
    settings = new Map<string, Setting>();

    private constructor() {
        SETTINGS.forEach(s => this.settings.set(s.name, s));
    }

    static getInstance(): Settings {
        if (instance == null) {
            instance = new Settings();
        }
        return instance;
    }

    import(newSettings: Record<string, any>): void {
        Object.entries(newSettings).forEach(([k, v]) => {
            if (this.settings.has(k)) {
                this.settings.get(k).value = v;
            }
        });
    }

    getBool(name: string): boolean {
        const setting = this.settings.get(name);
        if (!(setting instanceof BooleanSetting)) {
            throw Error(`Cannot call getBool on a setting of type ${setting.constructor.name}`);
        }
        return setting && setting.value;
    }

    getStr(name: string): string {
        const setting = this.settings.get(name);
        if (!(setting instanceof StringSetting)) {
            throw Error(`Cannot call getStr on a setting of type ${setting.constructor.name}`);
        }
        return setting && setting.value;
    }

    getNum(name: string): number {
        const setting = this.settings.get(name);
        if (!(setting instanceof NumberSetting)) {
            throw Error(`Cannot call getNum on a setting of type ${setting.constructor.name}`);
        }
        return setting && setting.value;
    }
}

export default Settings;

export const settings = Settings.getInstance();
