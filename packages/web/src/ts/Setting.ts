/* eslint-disable max-classes-per-file */

export default abstract class Setting {
    private changeListeners: ((value: any, name: string) => void)[] = [];

    protected $elem: HTMLInputElement;

    name: string;

    defaultValue: any;

    constructor(name: string, $elem: HTMLInputElement) {
        this.name = name;
        this.$elem = $elem;

        this.$elem.addEventListener("change", () => this.triggerChange());
    }

    abstract get value(): any;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    abstract set value(x: any);

    addChangeListener(l: (value: any, name: string) => void, triggerNow = true): void {
        this.changeListeners.push(l);

        if (triggerNow) {
            // trigger the listener once with the current value
            l(this.value, this.name);
        }
    }

    removeChangeListener(l: (value: any, name: string) => void): void {
        this.changeListeners = this.changeListeners.filter(x => x !== l);
    }

    triggerChange(): void {
        this.changeListeners.forEach(l => l(this.value, this.name));
    }
}

export class BooleanSetting extends Setting {
    defaultValue = this.value;

    get value(): boolean {
        return this.$elem.checked;
    }

    set value(x: boolean) {
        this.$elem.checked = x;
        this.triggerChange();
    }

    addChangeListener(l: (value: boolean, name: string) => void, triggerNow = true): void {
        super.addChangeListener(l, triggerNow);
    }

    removeChangeListener(l: (value: boolean, name: string) => void): void {
        super.removeChangeListener(l);
    }
}

export class StringSetting extends Setting {
    defaultValue = this.value;

    get value(): string {
        return this.$elem.value;
    }

    set value(x: string) {
        this.$elem.value = x;
        this.triggerChange();
    }

    addChangeListener(l: (value: string, name: string) => void, triggerNow = true): void {
        super.addChangeListener(l, triggerNow);
    }

    removeChangeListener(l: (value: string, name: string) => void): void {
        super.removeChangeListener(l);
    }
}

export class NumberSetting extends Setting {
    defaultValue = this.value;

    get value(): number {
        return Number.parseFloat(this.$elem.value);
    }

    set value(x: number) {
        this.$elem.value = x.toString();
        this.triggerChange();
    }

    addChangeListener(l: (value: number, name: string) => void, triggerNow = true): void {
        super.addChangeListener(l, triggerNow);
    }

    removeChangeListener(l: (value: number, name: string) => void): void {
        super.removeChangeListener(l);
    }
}
