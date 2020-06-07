/* eslint-disable max-classes-per-file */

export default abstract class Setting {
    private changeListeners: ((value: any, name: string) => void)[] = [];

    protected $elem: HTMLInputElement;

    name: string;

    constructor(name: string, $elem: HTMLInputElement) {
        this.name = name;
        this.$elem = $elem;

        this.$elem.addEventListener("change", () => this.triggerChange());
    }

    abstract get value(): any;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    abstract set value(x: any);

    addChangeListener(l: (value: any, name: string) => void): void {
        this.changeListeners.push(l);
    }

    removeChangeListener(l: (value: any, name: string) => void): void {
        this.changeListeners = this.changeListeners.filter(x => x !== l);
    }

    triggerChange(): void {
        this.changeListeners.forEach(l => l(this.value, this.name));
    }
}

export class BooleanSetting extends Setting {
    get value(): boolean {
        return this.$elem.checked;
    }

    set value(x: boolean) {
        this.$elem.checked = x;
    }

    addChangeListener(l: (value: boolean, name: string) => void): void {
        super.addChangeListener(l);
    }

    removeChangeListener(l: (value: boolean, name: string) => void): void {
        super.removeChangeListener(l);
    }
}

export class StringSetting extends Setting {
    get value(): string {
        return this.$elem.value;
    }

    set value(x: string) {
        this.$elem.value = x;
    }

    addChangeListener(l: (value: string, name: string) => void): void {
        super.addChangeListener(l);
    }

    removeChangeListener(l: (value: string, name: string) => void): void {
        super.removeChangeListener(l);
    }
}

export class NumberSetting extends Setting {
    get value(): number {
        return Number.parseFloat(this.$elem.value);
    }

    set value(x: number) {
        this.$elem.value = x.toString();
    }

    addChangeListener(l: (value: number, name: string) => void): void {
        super.addChangeListener(l);
    }

    removeChangeListener(l: (value: number, name: string) => void): void {
        super.removeChangeListener(l);
    }
}
