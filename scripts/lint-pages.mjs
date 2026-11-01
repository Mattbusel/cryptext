// Stop-hook page linter. Renders every registered page from recorded fixtures and checks the grid.
// Until the registry is built (dist/src/registry.js), it reports that and exits cleanly.
import { existsSync } from "node:fs";
if (!existsSync("dist/src/registry.js")) { console.log("lint-pages: registry not built yet (run npm run build)"); process.exit(0); }
const { lintAllPages } = await import("../dist/src/lint.js");
const problems = await lintAllPages();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log("lint-pages: all pages OK");
