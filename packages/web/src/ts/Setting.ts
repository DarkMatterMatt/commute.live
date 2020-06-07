/* eslint-disable max-classes-per-file */

export default abstract class Setting {
    private changeListeners: ((name: string, value: any) => void)[] = [];

    protected $elem: HTMLInputElement;

    name: string;

    constructor(name: string, $elem: HTMLInputElement) {
        this.name = name;
        this.$elem = $elem;

        this.$elem.addEventListener("change", () => this.changeListeners.forEach(l => l(this.name, this.value)));
    }

    abstract get value(): any;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    abstract set value(x: any);

    addChangeListener(l: (name: string, value: any) => void): void {
        this.changeListeners.push(l);
    }

    removeChangeListener(l: (name: string, value: any) => void): void {
        this.changeListeners = this.changeListeners.filter(x => x !== l);
    }
}

export class BooleanSetting extends Setting {
    get value(): boolean {
        return this.$elem.checked;
    }

    set value(x: boolean) {
        this.$elem.checked = x;
    }

    addChangeListener(l: (name: string, value: boolean) => void): void {
        super.addChangeListener(l);
    }

    removeChangeListener(l: (name: string, value: boolean) => void): void {
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

    addChangeListener(l: (name: string, value: string) => void): void {
        super.addChangeListener(l);
    }

    removeChangeListener(l: (name: string, value: string) => void): void {
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

    addChangeListener(l: (name: string, value: number) => void): void {
        super.addChangeListener(l);
    }

    removeChangeListener(l: (name: string, value: number) => void): void {
        super.removeChangeListener(l);
    }
}
