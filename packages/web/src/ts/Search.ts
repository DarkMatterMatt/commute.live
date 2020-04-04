import Api from "./Api";
import State from "./State";
import Render from "./Render";
import { SearchRoute } from "./types";

class Search {
    routes: SearchRoute[];

    state: State;

    $search: HTMLInputElement;

    $dropdown: HTMLElement;

    constructor(state: State, $search: HTMLInputElement, $dropdown: HTMLElement) {
        this.state = state;
        this.$search = $search;
        this.$dropdown = $dropdown;

        $search.addEventListener("keyup", ev => {
            if (ev.key === "Escape") {
                // eslint-disable-next-line no-param-reassign
                $search.value = "";
                this.hideDropdown();
                return;
            }
            if (ev.key === "Enter") {
                ($dropdown.firstChild as HTMLElement).click();
                return;
            }
            this.search($search.value);
        });
    }

    async load(): Promise<void> {
        const response = await Api.queryRoutes(null, ["shortName", "longName", "type"]);
        const routes: SearchRoute[] = Object.values(response.routes) as SearchRoute[];

        const regexWord = /[a-z]+/g;
        routes.forEach(route => {
            /* eslint-disable no-param-reassign */
            route.shortNameLower = route.shortName.toLowerCase();
            route.longNameLower = route.longName.toLowerCase();
            route.longNameWords = [];

            let m;
            do {
                m = regexWord.exec(route.longNameLower);
                if (m && !["to", "via"].includes(m[0])) {
                    route.longNameWords.push(m[0]);
                }
            } while (m);
        });

        const regexTwoDigits = /^\d\d\D?$/;
        routes.sort((a, b) => {
            /*
             * Sort by route number ascending (two digit number first)
             * Then sort alphabetically, numbers first
             */
            const aInt = Number.parseInt(a.shortName, 10);
            const bInt = Number.parseInt(b.shortName, 10);
            if (aInt && bInt) {
                const aTwoDigits = regexTwoDigits.test(a.shortName);
                const bTwoDigits = regexTwoDigits.test(b.shortName);
                if (aTwoDigits !== bTwoDigits) {
                    return Number(bTwoDigits) - Number(aTwoDigits);
                }
                return aInt - bInt;
            }
            return a.shortName < b.shortName ? -1 : 1;
        });

        this.routes = routes;
    }

    render(routes: SearchRoute[]): void {
        Render.renderFilterDropdown(this.$dropdown, routes, routeData => {
            this.$search.value = "";
            this.state.activateRoute(routeData);
        });
    }

    hideDropdown(): void {
        this.render([]);
    }

    search(query_: string): void {
        const query = query_.toLowerCase();

        if (query === "") {
            this.hideDropdown();
            return;
        }

        this.routes.forEach(r => {
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

            // eslint-disable-next-line no-param-reassign
            r.filterWeight = filterWeight;
        });

        const filtered = this.routes.filter(r => r.filterWeight && !this.state.isActive(r));
        filtered.sort((a, b) => b.filterWeight - a.filterWeight);
        this.render(filtered);
    }
}

export default Search;
