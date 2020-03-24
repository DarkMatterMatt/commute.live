import Route from "./Route";

const STATE_VERSION = 1;

class State {
    map: google.maps.Map;

    ws: WebSocket;

    version: number;

    routesByShortName: Map<string, Route>;

    constructor() {
        const dataStr = localStorage.getItem("state");
        const defaults: Record<string, any> = {
            version: STATE_VERSION,
            routes:  [],
        };

        let data = defaults;
        if (dataStr !== null) {
            data = State.migrate({ ...defaults, ...JSON.parse(dataStr) });
        }

        this.version = data.version;
        this.map = data.map;

        this.routesByShortName  = new Map();
        for (const [type, shortName, active, color] of data.routes) {
            this.routesByShortName.set(shortName, new Route({
                shortName,
                active,
                color,
                type,
                map: this.map,
            }));
        }
    }

    static migrate(data: Record<string, any>): Record<string, any> {
        /* eslint-disable no-param-reassign */
        data.version = STATE_VERSION;
        return data;
    }

    isActive(shortName: string): boolean {
        const route = this.routesByShortName.get(shortName);
        return route ? route.active : false;
    }

    toJSON(): Record<string, any> {
        return {
            version: this.version,
            routes:  [...this.routesByShortName.values()].map(r => [r.type, r.shortName, r.active, r.color]),
        };
    }
}

export default State;
