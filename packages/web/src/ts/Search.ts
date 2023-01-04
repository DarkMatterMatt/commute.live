import type { RegionCode } from "@commutelive/common";
import { api } from "./Api";
import { render } from "./Render";
import Route from "./Route";
import type State from "./State";
import type { SearchRoute } from "./types";

class Search {
    routes: SearchRoute[] = [];

    state: State;

    $search: HTMLInputElement;

    $dropdown: HTMLElement;

    currentRegion: RegionCode | null = null;

    constructor(state: State, $search: HTMLInputElement, $dropdown: HTMLElement) {
        this.state = state;
        this.$search = $search;
        this.$dropdown = $dropdown;

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

    async load(region: RegionCode): Promise<void> {
        if (this.currentRegion === region) {
            return;
        }
        this.currentRegion = region;

        const REGEX_WORD = /[a-z]+/g;
        const REGEX_TWO_DIGITS = /^\d\d\D?$/;

        const routes = await api.listRoutes(region);
        if (this.currentRegion !== region) {
            // another region was loaded while we were waiting for the API response
            return;
        }

        this.routes = [...routes.values()].map(r => {
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
                id: r.id,
                type: r.type,
                shortName: r.shortName,
                shortNameLower,
                longName,
                longNameLower,
                longNameWords,
            };
        });

        this.routes.sort((a, b) => {
            /*
             * Sort by route number ascending (two digit number first)
             * Then sort alphabetically, numbers first
             */
            const aInt = Number.parseInt(a.shortName, 10);
            const bInt = Number.parseInt(b.shortName, 10);
            if (aInt && bInt) {
                const aTwoDigits = REGEX_TWO_DIGITS.test(a.shortName);
                const bTwoDigits = REGEX_TWO_DIGITS.test(b.shortName);
                if (aTwoDigits !== bTwoDigits) {
                    return Number(bTwoDigits) - Number(aTwoDigits);
                }
                return aInt - bInt;
            }
            return a.shortName < b.shortName ? -1 : 1;
        });
    }

    render(routes: SearchRoute[]): void {
        render.renderFilterDropdown(this.$dropdown, routes, routeData => {
            this.clear();
            this.state.activateRoute(routeData);
        });
    }

    clear(): void {
        this.render([]);
        this.$search.value = "";
        this.$search.blur();
    }

    search(query_: string): void {
        const query = query_.toLowerCase();

        if (query === "") {
            this.render([]);
            return;
        }

        const weighted = this.routes.map(r => {
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
