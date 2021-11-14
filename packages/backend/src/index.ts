import { checkForUpdates } from "./sources/index.js";

(async () => {
    console.log("checkForUpdates", await checkForUpdates());
})();
