export abstract class Setting<Name extends string, V> {
    private changeListeners: ((value: V, name: Name) => void)[] = [];

    public abstract readonly defaultValue: V;

    public constructor(public readonly name: Name, protected readonly $elem: HTMLInputElement) {
        this.$elem.addEventListener("change", () => this.triggerChange());
    }

    public abstract get value(): V;

    public abstract set value(x: V);

    public addChangeListener(l: (value: V, name: Name) => void, triggerNow = true): void {
        this.changeListeners.push(l);

        if (triggerNow) {
            // trigger the listener once with the current value
            l(this.value, this.name);
        }
    }

    public removeChangeListener(l: (value: V, name: Name) => void): void {
        this.changeListeners = this.changeListeners.filter(x => x !== l);
    }

    protected triggerChange(): void {
        this.changeListeners.forEach(l => l(this.value, this.name));
    }
}

export class BooleanSetting<Name extends string, V extends boolean> extends Setting<Name, V> {
    public readonly defaultValue = this.value;

    public get value() {
        return this.$elem.checked as V;
    }

    public set value(x) {
        if (this.value !== x) {
            this.$elem.checked = x;
            this.triggerChange();
        }
    }
}

export class StringSetting<Name extends string, V extends string> extends Setting<Name, V> {
    public readonly defaultValue = this.value;

    public get value() {
        return this.$elem.value as V;
    }

    public set value(x) {
        if (this.value !== x) {
            this.$elem.value = x;
            this.triggerChange();
        }
    }
}

export class NumberSetting<Name extends string, V extends number> extends Setting<Name, V> {
    public readonly defaultValue = this.value;

    public get value() {
        return Number.parseFloat(this.$elem.value) as V;
    }

    public set value(x) {
        const s = x.toString();
        if (this.$elem.value !== s) {
            this.$elem.value = s;
            this.triggerChange();
        }
    }
}
