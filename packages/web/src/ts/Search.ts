import { createPromise, type RegionCode } from "@commutelive/common";
import { api } from "./Api";
import { render } from "./Render";
import Route from "./Route";
import type State from "./State";
import type { SearchRoute } from "./types";

class Search {
    private state: State;

    private $search: HTMLInputElement;

    private $dropdown: HTMLElement;

    private currentRegion: RegionCode | null = null;

    private routesCache: null | Promise<SearchRoute[]> = null;

    public constructor(state: State, $search: HTMLInputElement, $dropdown: HTMLElement) {
        this.state = state;
        this.$search = $search;
        this.$dropdown = $dropdown;

        $search.addEventListener("focus", () => {
            // enable lazy loading of routes
            this.load();
        });

        $search.addEventListener("blur", () => {
            this.clear();
        });

        $search.addEventListener("input", () => {
            this.search($search.value);
        });

        $search.addEventListener("keyup", ev => {
            if (ev.key === "Escape") {
                this.clear();
            }
            if (ev.key === "Enter") {
                const $topResult = $dropdown.firstChild as HTMLElement;
                if ($topResult !== null) {
                    $topResult.click();
                    this.clear();
                }
            }
        });
    }

    public setRegion(region: RegionCode, displayName: string): void {
        if (this.currentRegion === region) {
            return;
        }
        this.currentRegion = region;
        this.routesCache = null;
        this.$search.placeholder = `Searching routes in ${displayName}`;
    }

    private async load(): Promise<SearchRoute[]> {
        const region = this.currentRegion;
        if (region == null) {
            throw new Error("Region must be set before loading routes");
        }

        if (this.routesCache != null) {
            return this.routesCache;
        }

        // immediately set the cache to a promise so that if this function is called
        // again while the routes are loading, it will return the same promise
        const [promise, resolve] = createPromise<SearchRoute[]>();
        this.routesCache = promise;


        const REGEX_WORD = /[a-z]+/g;
        const routes = (await api.listRoutes(region)).map(r => {
            const longName = Route.getLongName(r.longNames);
            const shortNameLower = r.shortName.toLowerCase();
            const longNameLower = longName.toLowerCase();
            const longNameWords = [];

            let m;
            do {
                m = REGEX_WORD.exec(longNameLower);
                if (m && !["to", "via"].includes(m[0])) {
                    longNameWords.push(m[0]);
                }
            } while (m);

            return {
                region,
                id: r.id,
                type: r.type,
                shortName: r.shortName,
                shortNameLower,
                longName,
                longNameLower,
                longNameWords,
            };
        });

        routes.sort((a, b) => {
            // sort by route number ascending, then alphabetically
            const aInt = Number.parseInt(a.shortName, 10);
            const bInt = Number.parseInt(b.shortName, 10);
            if (aInt !== bInt) {
                return aInt - bInt;
            }
            return a.shortName.localeCompare(b.shortName);
        });

        resolve(routes);
        return promise;
    }

    private render(routes: SearchRoute[]): void {
        render.renderFilterDropdown(this.$dropdown, routes, routeData => {
            this.clear();
            this.state.activateRoute(routeData);
        });
    }

    private clear(): void {
        this.render([]);
        this.$search.value = "";
        this.$search.blur();
    }

    private async search(query_: string): Promise<void> {
        const query = query_.toLowerCase();

        if (query === "") {
            this.render([]);
            return;
        }

        const weighted = (await this.load()).map(r => {
            let filterWeight = 0;
            if (r.shortNameLower === query) {
                filterWeight += 50;
            }
            else if (r.shortNameLower.startsWith(query)) {
                filterWeight += 25;
            }
            if (r.longNameLower.includes(query)) {
                filterWeight += 5;
            }
            r.longNameWords.forEach(word => {
                if (word.startsWith(query)) {
                    filterWeight += 5;
                }
                else if (word.includes(query)) {
                    filterWeight += 1;
                }
            });

            return [filterWeight, r] as const;
        });

        const filtered = weighted.filter(([weight, r]) => weight && !this.state.isActive(r));
        filtered.sort(([a], [b]) => b - a);
        this.render(filtered.map(([, r]) => r));
    }
}

export default Search;
