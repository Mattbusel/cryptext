# CRYPTEXT: Tasks

Tasks are ordered so the engine and encoders are complete and tested before
feeds, pages, API, MCP, or the viewer are built. Each task references the
requirement(s) it satisfies.

---

## Phase 1: Project Scaffold

- [x] **T01**: Initialise the project
  - Create `package.json` with `"type": "module"`, `vitest` as a dev
    dependency, and `@modelcontextprotocol/sdk` as a runtime dependency.
  - Create `tsconfig.json`: `strict`, `module: NodeNext`,
    `moduleResolution: NodeNext`, `target: ES2022`, `outDir: dist`.
  - Create `vercel.json` routing `/api/*` to `api/` Node.js functions.
  - Create the directory structure:
    `src/engine/`, `src/encode/`, `src/feeds/`, `src/pages/`,
    `api/`, `mcp/`, `public/`, `tests/`, `tests/helpers/`.
  - *Refs: structure steering*

- [x] **T02**: Stub vitest configuration
  - Add `vitest.config.ts` with `include: ['tests/**/*.{test,prop}.ts']`
    and `globals: false`.
  - Verify `npx vitest --run` passes with zero test files.
  - *Refs: R8*

---

## Phase 2: Page Engine

- [x] **T03**: Implement `src/engine/page.ts`
  - Define the `Cell`, `FastextLinks`, and `Page` interfaces.
  - Implement `makePage(number, title): Page` that allocates a
    `Uint8Array[25]` grid, each row 40 bytes initialised to 0x20 (space).
  - Ensure cell writes mask to 7 bits (`value & 0x7F`).
  - *Refs: R1.1*

- [x] **T04**: Implement `src/engine/codes.ts`
  - Export all alpha colour constants `RED`…`WHITE` (0x01–0x07).
  - Export all mosaic colour constants `MOSAIC_RED`…`MOSAIC_WHITE`
    (0x11–0x17).
  - Export `FLASH`, `STEADY`, `NORMAL_HEIGHT`, `DOUBLE_HEIGHT`, `CONCEAL`,
    `CONTIGUOUS_MOSAIC`, `SEPARATED_MOSAIC`, `BLACK_BACKGROUND`,
    `NEW_BACKGROUND`, `HOLD_MOSAICS`, `RELEASE_MOSAICS`.
  - Export `COLOUR_RGB: Record<number, [number, number, number]>` mapping
    each alpha/mosaic colour code to its 24-bit RGB value.
  - *Refs: R1.2*

- [x] **T05**: Implement `walkRow()` in `src/engine/helpers.ts`
  - Implement the attribute state machine described in design §4.
  - Returns an array of 40 `CellState` objects (fg, bg, mosaic, flash,
    doubleHeight, conceal, holdMosaic, contiguous).
  - This is the single source of truth consumed by all four encoders.
  - *Refs: R1.2, design §4*

- [x] **T06**: Implement text helpers in `src/engine/helpers.ts`
  - `writeText(page, row, col, text, attrBefore?)`: writes each character,
    clipping when `col + i >= 40`.
  - `writePadded(page, row, col, text, width, align, attrBefore?)`: pads
    left/right/both before writing; clips if text > width.
  - `writeHeader(page, now)`: writes page number, title, and clock on row 0.
  - `writeSource(page, source)`: writes source string on row 24 in CYAN,
    followed by colour squares for active fastext links at cols 36–39.
  - `writeInterrupted(page, source, error)`: fills rows 10–15 with a
    centred SERVICE INTERRUPTED panel in red/white.
  - *Refs: R1.3, R3.1*

- [x] **T07**: Implement `src/engine/mosaic.ts`
  - `sextantByte(tl, tr, ml, mr, bl, br): number`: compose bits per ETS
    300 706 and set bit 5.
  - `mosaicBar(page, row, col, height6, colourCode)`: write a 1-column
    mosaic bar using sextant fractions for heights 0–6.
  - `sparkline(page, row, col, values, width, colourCode)`: scale values
    to 0–6 and call `mosaicBar` for each column.
  - Clip all writes silently when coords are out of range.
  - *Refs: R1.4, R1.5*

- [x] **T08**: Enforce clipping invariant across all engine helpers
  - Audit `writeText`, `writePadded`, and mosaic helpers to guarantee no
    write occurs when `row >= 25` or `col >= 40`.
  - Add `DOUBLE_HEIGHT` enforcement: after writing code 0x0D on row *r*,
    helpers zero-fill row *r+1*.
  - *Refs: R1.2, R1.5*

---

## Phase 3: Encoders

- [x] **T09**: Implement `src/encode/html.ts`
  - Use `walkRow()` to produce cell states.
  - Emit `<div class="row …">` per row; group runs of identical state into
    `<span class="fg-X bg-Y [flash] [conceal]">`.
  - Mosaic characters: emit `<span class="mosaic" data-sextants="N">` with
    6 child `<span class="sx">` elements.
  - Double-height: add `dh-top` class to row *r*; render row *r+1* as
    `<div class="row dh-bottom"></div>`.
  - *Refs: R2.1*

- [x] **T10**: Implement `src/encode/ansi.ts`
  - Use `walkRow()` to produce cell states.
  - Emit 24-bit ANSI sequences using `COLOUR_RGB` from `codes.ts`.
  - Map mosaic sextant bytes to Unicode Symbols for Legacy Computing
    (U+1FB00 range); fall back to half-block chars if unavailable.
  - Implement `stripCodes` flag for plain 25×40 text output.
  - Reset attributes with `\x1b[0m` after each row.
  - *Refs: R2.2*

- [x] **T11**: Implement `src/encode/json.ts`
  - Produce `JsonPage` (design §3.7) via `JSON.stringify`.
  - Every row must have exactly 25 entries; every `cells` array exactly 40.
  - *Refs: R2.3*

- [x] **T12**: Implement `src/encode/tti.ts`
  - Produce VBIT2/MRG TTI output per design §3.8 and R2.4.
  - Escape control codes 0x00–0x1F as `ESC (code+0x40)`.
  - Write `FL,…` fastext line when links are present.
  - Implement `parseTti(tti): Uint8Array[]` internal round-trip parser.
  - *Refs: R2.4*

---

## Phase 4: Engine & Encoder Tests

- [x] **T13**: Unit tests: engine (`tests/engine.test.ts`)
  - `writeText` with string that overflows column 39: no exception, row
    unchanged beyond col 39.
  - `writePadded` left, right, center alignment: correct padding.
  - `writeHeader`: page number at col 0, clock right-aligned at col 39.
  - `writeInterrupted`: row 12 contains "SERVICE INTERRUPTED".
  - *Refs: R8.1*

- [x] **T14**: Unit tests: codes (`tests/codes.test.ts`)
  - Each constant has the expected numeric value per ETS 300 706.
  - `COLOUR_RGB[WHITE]` is `[255, 255, 255]`.
  - Double-height placement: after `writePadded` with `DOUBLE_HEIGHT` attr
    on row 5, row 6 is all 0x20.
  - *Refs: R8.1*

- [x] **T15**: Unit tests: mosaic (`tests/engine.test.ts`)
  - `sextantByte(true, false, false, false, false, false)` → `0x21`
    (bit 0 + bit 5).
  - `sextantByte(true, true, true, true, true, true)` → `0x7F` (all set).
  - `mosaicBar` with height 0 writes `0x20` (empty); height 6 writes `0x7F`.
  - `sparkline` writes correct bar heights for a known series.
  - *Refs: R8.1*

- [x] **T16**: Unit tests: encoders fixture (`tests/encoders.test.ts`)
  - Build a known fixture page with text, colour, mosaic, flash, conceal,
    double-height using `tests/helpers/fixtures.ts`.
  - HTML: output contains `fg-red`, `fg-cyan`, `mosaic`, `flash`, `conceal`.
  - ANSI: output contains `\x1b[38;2;255;0;0m` for red.
  - JSON: `JSON.parse` succeeds; `rows.length === 25`; first row cells
    have correct `fg`, `mosaic`, `flash` values.
  - TTI: output contains `OL,0,`; fastext line `FL,` is present.
  - *Refs: R8.5*

- [x] **T17**: Property tests: grid invariant (`tests/engine.prop.ts`)
  - `fc.array(fc.tuple(fc.integer(0,24), fc.integer(0,39), fc.string()))`:
    apply all writes to a fresh page; assert grid is 25×40 after each.
  - Assert every cell value satisfies `v & 0x80 === 0`.
  - *Refs: R8.2*

- [x] **T18**: Property tests: encoders (`tests/encoders.prop.ts`)
  - Generate random valid `Page` (cells filled with random 7-bit values).
  - Assert all four encoders complete without throwing.
  - Assert TTI round-trip: `parseTti(encodeTti(page))` grid equals original.
  - *Refs: R8.3*

- [x] **T19**: Property tests: double-height (`tests/engine.prop.ts`)
  - `fc.integer(0, 23)`: place `DOUBLE_HEIGHT` on row *r*; assert row *r+1*
    is all 0x20.
  - *Refs: R8.4*

---

## Phase 5: Feed Infrastructure

- [x] **T20**: Implement `src/feeds/_http.ts`
  - Wrap Node 22 `fetch` with: `User-Agent: CRYPTEXT/1.0
    (https://github.com/<user>/cryptext)`, 10-second `AbortController`
    timeout, and a helper `fetchJson<T>(url): Promise<T>`.
  - *Refs: R3.3*

- [x] **T21**: Implement `src/feeds/_cache.ts`
  - `withCache<T>(key, fetcher)`: stores result in a module-level `Map`.
  - Returns cached result if age < 300 000 ms.
  - On fetch failure, returns stale result if one exists.
  - *Refs: R3.2*

- [x] **T22**: Implement `src/feeds/nws.ts`
  - Fetch active alerts from `https://api.weather.gov/alerts/active`.
  - Fetch forecast for each of 8 fixed cities using NWS gridpoint endpoints.
  - Return `FeedResult<WeatherData>`.
  - Per-city failure: mark city `temp: null` rather than failing whole feed.
  - *Refs: R3.4*

- [x] **T23**: Implement `src/feeds/usgs.ts`
  - Fetch `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson`.
  - Return `FeedResult<QuakeData>`.
  - *Refs: R3.5*

- [x] **T24**: Implement `src/feeds/swpc.ts`
  - Fetch NOAA SWPC planetary K-index JSON from
    `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`.
  - Derive `auroraLatitude` from current Kp using the standard formula
    (`66.5° - 2.5° × Kp`).
  - Return `FeedResult<SpaceWeatherData>`.
  - *Refs: R3.6*

- [x] **T25**: Implement `src/feeds/treasury.ts`
  - Fetch debt to the penny from the Treasury Fiscal Data API
    (`/v1/accounting/od/debt_to_penny`).
  - Fetch average interest rates from
    `/v2/accounting/od/avg_interest_rates`.
  - Return `FeedResult<FiscalData>`.
  - *Refs: R3.7*

- [x] **T26**: Implement `src/feeds/usaspending.ts`
  - POST to `https://api.usaspending.gov/api/v2/search/spending_by_award/`
    with a filter for the 10 most recent awards with `award_amount > 1e8`.
  - Return `FeedResult<SpendingData>`.
  - *Refs: R3.8*

- [x] **T27**: Implement `src/feeds/fedregister.ts`
  - Fetch `https://www.federalregister.gov/api/v1/documents.json` filtered
    to today's publication date, fields: `title`, `type`, `agencies`,
    `document_number`.
  - Return `FeedResult<FedRegData>`.
  - *Refs: R3.9*

- [x] **T28**: Implement `src/feeds/openfda.ts`
  - Fetch `https://api.fda.gov/food/enforcement.json?limit=10` and
    `https://api.fda.gov/drug/enforcement.json?limit=10`.
  - Merge into a single recall list sorted by `initiation_date` descending.
  - Return `FeedResult<RecallData>`.
  - *Refs: R3.10*

- [x] **T29**: Implement `src/feeds/hackernews.ts`
  - Fetch `https://hacker-news.firebaseio.com/v0/topstories.json`.
  - Fetch item details for the first 20 IDs in parallel; skip failed items.
  - Return `FeedResult<HNData>`.
  - *Refs: R3.11*

- [x] **T30**: Feed unit tests (`tests/feeds.test.ts`)
  - Mock `_http.ts` with vitest's `vi.mock`.
  - Test `withCache`: second call within 5 min skips fetcher; after TTL
    expires it calls again; on failure returns stale.
  - Test each feed's `ok: false` path: never throws.
  - *Refs: R3.1, R3.2, R8.1*

---

## Phase 6: Pages & Registry

- [ ] **T31**: Implement `src/registry.ts`
  - Create the `RegistryEntry` interface and the `Map<number, RegistryEntry>`.
  - Export `lookupPage(n)` and `allPages()`.
  - Initially empty; pages register themselves (imported by registry).
  - *Refs: R4.2*

- [x] **T32**: Implement `src/pages/about.ts` (page 101)
  - Static content: service description, how to navigate, keyboard shortcuts,
    `curl` example, page number map.
  - Fastext: red → 100 (index).
  - *Refs: R4.3*

- [x] **T33**: Implement `src/pages/index.ts` (page 100)
  - Use `allPages()` from registry to list all page numbers with titles.
  - Refresh automatically (pure function of `allPages()` output).
  - Fastext: cyan → 101 (about).
  - *Refs: R4.3, R4.4*

- [x] **T34**: Implement `src/pages/weather.ts` (pages 200–209)
  - Page 200: 8-city summary showing temp, alert count.
  - Pages 201–208: one full page per city (forecast periods, alerts,
    temperature sparkline where data allows).
  - Page 209: weather legend / key.
  - All pages: source row 24, fastext red → 100.
  - SERVICE INTERRUPTED if feed `ok: false`.
  - *Refs: R3.4, R4.3*

- [x] **T35**: Implement `src/pages/quake.ts` (pages 300–302)
  - Page 300: summary: total count, max magnitude, most recent.
  - Pages 301–302: paginated list of quakes with mag, place, time, depth.
  - Mosaic bar for magnitude (0–9 scaled to 0–6 sextants).
  - *Refs: R3.5, R4.3*

- [x] **T36**: Implement `src/pages/space.ts` (pages 400–401)
  - Page 400: current Kp, storm level, aurora latitude, 24-hour Kp sparkline.
  - Page 401: extended Kp table with colours (green < 4, yellow 4–5, red > 5).
  - *Refs: R3.6, R4.3*

- [x] **T37**: Implement `src/pages/money.ts` (pages 500–503)
  - Page 500: debt to the penny in large formatted text.
  - Page 501: average interest rates table.
  - Pages 502–503: recent USAspending large awards.
  - *Refs: R3.7, R3.8, R4.3*

- [x] **T38**: Implement `src/pages/govt.ts` (pages 600–601)
  - Pages 600–601: paginated list of today's Federal Register documents
    (type, agency, title truncated to fit).
  - *Refs: R3.9, R4.3*

- [x] **T39**: Implement `src/pages/safety.ts` (pages 700–701)
  - Page 700: recent food recalls.
  - Page 701: recent drug recalls.
  - Classification shown in colour (Class I → red, II → yellow, III → green).
  - *Refs: R3.10, R4.3*

- [x] **T40**: Implement `src/pages/tech.ts` (pages 800–801)
  - Pages 800–801: top HN stories paginated, showing title (truncated),
    score, comment count, and author.
  - *Refs: R3.11, R4.3*

- [x] **T41**: Implement `src/pages/kiroween.ts` (page 666)
  - Haunted CRT credits page with Halloween presentation.
  - Must still show a real data source or a timestamp on row 24.
  - Fastext: red → 100.
  - *Refs: R4.3*

- [x] **T42**: Wire all pages into `src/registry.ts`
  - Import every page module; call their registration helpers.
  - Verify `allPages()` returns pages in ascending numeric order.
  - *Refs: R4.2, R4.3*

- [x] **T43**: Page & registry tests (`tests/pages.test.ts`,
    `tests/registry.test.ts`)
  - For every registered page: call builder with `ok: false` FeedResult;
    assert returned Page is 25×40 and contains "SERVICE INTERRUPTED".
  - Assert `lookupPage(999)` returns `undefined`.
  - Assert `allPages()` is sorted ascending.
  - Assert row 24 of every page contains a source string.
  - *Refs: R4.1, R4.2, R8.1*

---

- [x] **T43a**: Implement `src/lint.ts` exporting `lintAllPages(): Promise<string[]>`
  - Render every registered page from the recorded fixtures in `fixtures/` (no network), and report any page that is not exactly 25x40, contains a code above 0x7F, lacks a source footer on row 24, or has a fastext link to an unregistered page.
  - `scripts/lint-pages.mjs` (already present, wired to the Stop hook) imports it from `dist/src/lint.js`.
  - *Refs: R4, R8*

---

## Phase 7: HTTP API

- [x] **T44**: Implement `api/page.ts`
  - Parse `n` and `format` query parameters.
  - Look up entry in registry; return 404 if not found.
  - Validate format; return 400 for unknown values.
  - Invoke `entry.fetch()` then `entry.build()` then encoder.
  - Set correct `Content-Type` and `Cache-Control: public, max-age=300`.
  - Set `Access-Control-Allow-Origin: *`.
  - Default format to `html` when omitted.
  - *Refs: R5.1, R5.3*

- [x] **T45**: Implement `api/pages.ts`
  - Return `allPages()` as a JSON array `[{ n, title }]` sorted ascending.
  - Set CORS headers.
  - *Refs: R5.2, R5.3*

- [x] **T46**: Smoke-test the API locally
  - Run `vercel dev` (developer instruction, not automated).
  - Confirm `curl "localhost:3000/api/page?n=300&format=ansi"` outputs
    coloured text.
  - Confirm `curl "localhost:3000/api/pages"` returns JSON array.
  - Confirm 404 for unknown page, 400 for invalid format.
  - Document results in a brief note; no code change needed if passing.
  - *Refs: R5.1, R5.2*

---

## Phase 8: MCP Server

- [x] **T47**: Implement `mcp/server.ts`
  - Instantiate `Server` from `@modelcontextprotocol/sdk/server/index.js`
    over `StdioServerTransport`.
  - Register `list_pages` tool: no args; returns `allPages()` JSON.
  - Register `read_page` tool: args `{ n: number, format?: string }`;
    runs registry pipeline; returns encoded string or MCP tool error.
  - *Refs: R6.1, R6.2, R6.3*

- [x] **T48**: Test MCP server
  - Start the server as a child process in a vitest test; send a
    `list_pages` call over stdio; assert the response contains known page
    numbers.
  - Send `read_page({ n: 100, format: "json" })`; assert response is valid
    JSON with `pageNumber: 100`.
  - Send `read_page({ n: 999 })`; assert a tool error is returned.
  - *Refs: R6.2, R6.3*

---

## Phase 9: Web Viewer

- [x] **T49**: Create `public/index.html`
  - Static HTML skeleton: CRT frame `<div id="crt">`, inner screen
    `<div id="screen">`, on-screen remote `<div id="remote">`.
  - Include `viewer.css` and `viewer.js` via `<link>` / `<script>` tags.
  - No build step required.
  - *Refs: R7.5*

- [x] **T50**: Create `public/viewer.css`
  - CRT frame: rounded corners, bezel shadow, dark grey enclosure.
  - Screen: `background: #000`; `font-family: monospace`; phosphor green
    glow (`text-shadow`); scanline overlay using a repeating linear gradient.
  - Screen curvature: subtle `border-radius` + `perspective` transform on
    the inner screen div.
  - Power-on animation: keyframes for flicker-in / roll-in effect on load.
  - Colour classes: `.fg-red`, `.fg-green`, `.fg-yellow`, `.fg-blue`,
    `.fg-magenta`, `.fg-cyan`, `.fg-white`, `.fg-black`; corresponding `.bg-*`.
  - `.flash` class: CSS `animation: blink 1s step-start infinite`.
  - `.conceal` class: `color: transparent` toggled by `.revealed` on parent.
  - `.dh-top`: `font-size: 200%; line-height: 1;` (double height row).
  - `.dh-bottom`: `display: none`.
  - Mosaic `<span class="mosaic">`: CSS grid 2×3 sub-cells.
  - Responsive: screen scales with `clamp()` / `vw` units.
  - *Refs: R7.1*

- [x] **T51**: Create `public/viewer.js`
  - State: `currentPage`, `digitBuffer` (up to 3 digits), `revealed`.
  - On load: navigate to page 100; trigger power-on animation.
  - `navigateTo(n)`: show P### cycling counter (R7.4); `fetch` `/api/page?n=N&format=html`;
    inject response into `#screen`; update fastext buttons.
  - Digit buttons (0–9): append to `digitBuffer`; on 3rd digit call
    `navigateTo`.
  - Fastext buttons: read link from current page's `data-fastext-*`
    attributes; call `navigateTo`.
  - REVEAL button: toggle `revealed` class on `#screen`.
  - Arrow-up / arrow-down: `navigateTo(currentPage ± 1)`.
  - Keyboard: digits 0–9, arrows, R/G/Y/C, ENTER (flush buffer).
  - P### counter: set header page-number span to cycling values (±1 per
    100 ms) until fetch resolves.
  - *Refs: R7.2, R7.3, R7.4*

---

## Phase 10: Final Integration & Cleanup

- [ ] **T52**: Run the full test suite (`npx vitest --run`)
  - All unit and property tests must pass.
  - Fix any regressions found during integration.
  - *Refs: R8.1–R8.5*

- [ ] **T53**: End-to-end manual check
  - Open viewer locally; navigate to each page range (100, 200, 300, 400,
    500, 600, 700, 800, 666).
  - Verify SERVICE INTERRUPTED pages render correctly when an API is mocked
    to fail.
  - Verify `curl` ANSI output looks correct in a terminal.
  - Verify TTI file output can be validated by checking the OL line count
    equals 25.
  - *Refs: R4.1, R5.1, R7.1*

- [ ] **T54**: Write `README.md`
  - Document: what CRYPTEXT is, page number map, how to run locally
    (`vercel dev` + `npx serve public`), how to use the MCP server, how to
    export TTI files for VBIT2.
  - *Refs: product steering*

- [ ] **T55**: Vercel deployment configuration
  - Confirm `vercel.json` routes are correct.
  - Set `Node.js 22` runtime in Vercel project settings (document this step).
  - Confirm `public/` is the static output directory.
  - *Refs: design §11*
