# CRYPTEXT: Requirements

## Overview

CRYPTEXT is a Teletext revival service that presents live public-data feeds on
40×25 character pages styled and numbered like original 1980s Teletext. The
same pages are served to web browsers (CRT viewer), terminals (ANSI escape
codes), AI agents (JSON/MCP), and real analogue TVs (TTI broadcast files). All
data comes from free, keyless public APIs. No mock data is ever shown; if a
feed is unavailable the page says so honestly.

---

## Requirement Areas

| ID | Area |
|----|------|
| R1 | Page Engine |
| R2 | Encoders |
| R3 | Data Feeds |
| R4 | Pages & Registry |
| R5 | HTTP API |
| R6 | MCP Server |
| R7 | Web Viewer |
| R8 | Tests |

---

## R1 – Page Engine

### R1.1 Page model
**As a** page builder,  
**I want** a typed `Page` object that holds a 25×40 grid of 7-bit cells, a
header row, and fastext links,  
**So that** all rendering targets receive a single canonical representation.

**Acceptance criteria (EARS):**
- **WHEN** a `Page` is constructed, **THEN** it SHALL contain exactly 25 rows
  and 40 columns.
- **WHEN** a cell value is set, **THEN** the value SHALL be masked to 7 bits
  (0x00–0x7F).
- **WHEN** fastext links are set, **THEN** the `Page` SHALL store up to four
  links keyed by colour (red, green, yellow, cyan) mapped to 3-digit page
  numbers (100–899).
- **WHERE** the page has a header row, **THEN** row 0 SHALL hold page number
  (left), service name (centre), and clock/date (right) within 40 columns.

### R1.2 Spacing attribute control codes
**As a** page builder,  
**I want** named constants and a helper to inject Teletext Level 1 spacing
attributes into a row,  
**So that** colours, flash, double height, mosaic mode, and conceal are set
correctly without magic numbers.

**Acceptance criteria:**
- **WHEN** a colour attribute constant is used, **THEN** the correct code in
  the range 0x01–0x07 (alpha) or 0x11–0x17 (mosaic) SHALL be written to that
  cell.
- **WHEN** `DOUBLE_HEIGHT` (0x0D) is placed on row *n*, **THEN** the engine
  SHALL guarantee row *n+1* is left blank (all 0x20 spaces).
- **WHEN** any attribute is written, **THEN** the cell at that column SHALL
  appear as a space (0x20) in text-only renderers.
- **WHEN** a row begins, **THEN** attributes SHALL reset to: white alpha,
  steady, normal height, black background.

### R1.3 Text helpers
**As a** page builder,  
**I want** helpers `writeText(row, col, text, attr?)` and
`writePadded(row, col, text, width, align, attr?)`,  
**So that** I can place text on a page without manually managing column
arithmetic.

**Acceptance criteria:**
- **WHEN** `writeText` is called with a string that would overflow column 39,
  **THEN** the text SHALL be clipped at column 39 with no exception thrown.
- **WHEN** `writePadded` is called with `align: 'right'`, **THEN** the text
  SHALL be right-justified inside the given width.
- **WHEN** `writePadded` is called with `align: 'center'`, **THEN** the text
  SHALL be centred, with extra padding on the right.

### R1.4 Mosaic graphics helpers
**As a** page builder,  
**I want** helpers `mosaicBar(row, col, height6, colour)` and
`sparkline(row, col, values, width, colour)`,  
**So that** I can render bar charts and sparklines from 2×3 sextant mosaic
characters.

**Acceptance criteria:**
- **WHEN** `mosaicBar` is called with a height in the range 0–6,
  **THEN** the correct sextant byte (bit 5 always set, bits 0/1/2/3/4/6 per
  the ETS 300 706 encoding) SHALL be written.
- **WHEN** `sparkline` is called with a series of values, **THEN** each column
  SHALL display a 1-character-wide bar scaled proportionally to the min/max of
  the series.
- **WHEN** mosaic colour is set via 0x11–0x17, **THEN** subsequent mosaic
  characters on that row SHALL render in that colour until the next colour
  attribute.
- **WHEN** either helper is called with out-of-range coordinates, **THEN** it
  SHALL clip silently without throwing.

### R1.5 Clipping and padding invariants
**As a** rendering pipeline,  
**I want** engine helpers to enforce the 40×25 hard boundary,  
**So that** no encoder receives a malformed grid.

**Acceptance criteria:**
- **WHEN** any write helper is called with `col >= 40` or `row >= 25`,
  **THEN** the write SHALL be silently discarded.
- **WHEN** a page is returned from any builder function, **THEN** every row
  SHALL have exactly 40 cells.

---

## R2 – Encoders

### R2.1 HTML encoder
**As a** web viewer,  
**I want** an HTML encoder that converts a `Page` to an HTML fragment,  
**So that** a browser can display the Teletext page with correct colours,
mosaic graphics, flash, double-height, and conceal/reveal.

**Acceptance criteria:**
- **WHEN** a text cell has a foreground colour attribute preceding it, **THEN**
  the rendered `<span>` SHALL carry the corresponding CSS colour class
  (`fg-red`, `fg-green`, etc.).
- **WHEN** a mosaic character (0x20–0x3F or 0x60–0x7F in graphics mode) is
  encoded, **THEN** it SHALL be rendered as a block-grid `<span>` with six
  CSS sub-cells reflecting the correct sextant bits.
- **WHEN** a `FLASH` attribute is active, **THEN** the affected cells SHALL
  carry a `flash` CSS class.
- **WHEN** a `DOUBLE_HEIGHT` row is encoded, **THEN** the row container SHALL
  carry a `double-height` CSS class and the row below SHALL be rendered as
  empty (blank row).
- **WHEN** a `CONCEAL` attribute is active, **THEN** the cells SHALL carry a
  `conceal` CSS class; a "reveal" user action SHALL toggle their visibility.
- **WHEN** encoding produces HTML, **THEN** no cell content SHALL exceed the
  40-column boundary.

### R2.2 ANSI encoder
**As a** terminal user,  
**I want** an ANSI encoder that emits 24-bit VT100 escape sequences,  
**So that** `curl https://<host>/api/page?n=300&format=ansi` renders a
coloured page in any modern terminal.

**Acceptance criteria:**
- **WHEN** a foreground colour attribute is encountered, **THEN** the encoder
  SHALL emit the ANSI `\e[38;2;R;G;Bm` sequence for the Teletext colour's
  24-bit RGB value.
- **WHEN** a background colour is set via `NEW_BACKGROUND`, **THEN** the
  encoder SHALL emit `\e[48;2;R;G;Bm`.
- **WHEN** a `FLASH` cell is encoded, **THEN** the encoder SHALL emit
  `\e[5m` (slow blink).
- **WHEN** a mosaic character is encountered, **THEN** the encoder SHALL
  substitute an appropriate Unicode block character (e.g., Braille/block
  elements) to approximate the sextant.
- **WHEN** each row is complete, **THEN** the encoder SHALL emit `\e[0m` reset
  followed by a newline.
- **WHEN** the output is piped to a file, **THEN** the ANSI encoder SHALL also
  support a "plain text" mode that strips all escape codes, producing 25 lines
  of 40 characters.

### R2.3 JSON encoder
**As an** AI agent,  
**I want** a JSON encoder that serialises a `Page` to a structured object,  
**So that** agents and other programs can parse page content without parsing
ANSI or HTML.

**Acceptance criteria:**
- **WHEN** the JSON encoder runs, **THEN** the output SHALL be valid JSON with
  a top-level object containing `pageNumber`, `title`, `fetchedAt`, `source`,
  `rows` (array of 25), and `fastextLinks`.
- **WHEN** a row is encoded, **THEN** it SHALL contain both a `text` string
  (40 printable characters, attributes replaced by spaces) and a `cells` array
  of 40 objects each with `char`, `fg`, `bg`, `flash`, `conceal`,
  `doubleHeight`, `mosaic` flags.
- **WHEN** `mosaic` is true for a cell, **THEN** the `sextantBits` field SHALL
  be present with the 6-bit pattern.

### R2.4 TTI encoder
**As a** broadcast operator,  
**I want** a TTI encoder that produces VBIT2/MRG-compatible `.tti` text,  
**So that** I can insert the page into a real Teletext broadcast via a
Raspberry Pi running VBIT2.

**Acceptance criteria:**
- **WHEN** a page is encoded to TTI, **THEN** the output SHALL begin with
  `DE,CRYPTEXT` and include `PN,<mag><page>00`, `SC,0000`, `PS,8000`.
- **WHEN** a control code (0x00–0x1F) appears in a row, **THEN** it SHALL be
  escaped as `ESC` followed by `(code + 0x40)` in the OL line.
- **WHEN** each row is written, **THEN** the output SHALL contain exactly one
  `OL,<n>,<text>` line per row (rows 0–24).
- **WHEN** fastext links are present, **THEN** the file SHALL end with
  `FL,<red>,<green>,<yellow>,<cyan>,8ff,100`.
- **WHEN** a TTI file is parsed back by a round-trip parser, **THEN** the
  recovered grid SHALL be byte-for-byte identical to the original `Page` grid.

---

## R3 – Data Feeds

### R3.1 FeedResult contract
**As a** page builder,  
**I want** every feed module to export `fetchX(): Promise<FeedResult<T>>`
where `FeedResult<T>` is a tagged union,  
**So that** pages can uniformly handle success and failure.

**Acceptance criteria:**
- **WHEN** a feed succeeds, **THEN** it SHALL return
  `{ ok: true, data: T, fetchedAt: string (ISO-8601), source: string }`.
- **WHEN** a feed fails (network error, parse error, non-2xx response),
  **THEN** it SHALL return `{ ok: false, error: string, source: string }`
  and SHALL NOT throw.
- **WHEN** a page builder receives `ok: false`, **THEN** the rendered page
  SHALL display a `SERVICE INTERRUPTED` panel with the feed name and a
  timestamp.

### R3.2 In-memory cache
**As a** Vercel serverless function,  
**I want** each feed to cache its last successful result in module-level
memory for at least 5 minutes,  
**So that** repeated page requests do not hammer upstream APIs.

**Acceptance criteria:**
- **WHEN** a feed is called within 5 minutes of a successful fetch,
  **THEN** it SHALL return the cached result without making an HTTP request.
- **WHEN** more than 5 minutes have elapsed or no cache entry exists,
  **THEN** the feed SHALL make a fresh HTTP request.
- **WHEN** a fresh request fails but a cached result exists (stale fallback),
  **THEN** the feed SHALL return the cached result with a `stale: true` flag
  appended (best effort; not required to surface in UI).

### R3.3 User-Agent header
**As a** responsible API citizen,  
**I want** every outbound HTTP request to include a descriptive `User-Agent`
header,  
**So that** upstream API operators can identify the client.

**Acceptance criteria:**
- **WHEN** any feed makes an HTTP request, **THEN** the `User-Agent` header
  SHALL contain the string `CRYPTEXT/1.0` and a contact URL or repo link.

### R3.4 NWS weather feed
**As a** weather page,  
**I want** a feed that fetches NWS active alerts and 7-day forecasts for a
fixed set of 8 US cities,  
**So that** pages 200–209 can display current conditions.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL request data from
  `https://api.weather.gov/` using only keyless endpoints.
- **WHEN** the feed succeeds, **THEN** `data` SHALL include alert count,
  forecast periods, and temperature for each of the 8 cities.
- **WHEN** a city's office is unreachable, **THEN** that city's slot SHALL
  show `N/A` rather than failing the whole feed.

### R3.5 USGS earthquake feed
**As an** earthquake page,  
**I want** a feed that fetches USGS GeoJSON for earthquakes in the past day
at M2.5+,  
**So that** pages 300–302 can list recent significant events.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL request
  `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson`.
- **WHEN** the feed succeeds, **THEN** `data` SHALL include each quake's
  magnitude, place, time, and depth.

### R3.6 NOAA SWPC space-weather feed
**As a** space-weather page,  
**I want** a feed that fetches the planetary K-index and aurora forecast from
NOAA SWPC,  
**So that** pages 400–401 can show current solar activity.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL request the NOAA SWPC
  planetary K-index JSON endpoint (`https://services.swpc.noaa.gov/`).
- **WHEN** the feed succeeds, **THEN** `data` SHALL include the current
  Kp index, the 24-hour Kp history array, and the aurora viewing latitude.

### R3.7 Treasury Fiscal Data feed
**As a** money page,  
**I want** a feed that fetches the US national debt (to the penny) and
average interest rates from the Treasury Fiscal Data API,  
**So that** pages 500–503 can display current fiscal figures.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL request
  `https://api.fiscaldata.treasury.gov/` without any API key.
- **WHEN** the feed succeeds, **THEN** `data` SHALL include total public
  debt outstanding and the most recent average interest rate record.

### R3.8 USAspending feed
**As a** spending page,  
**I want** a feed that fetches the latest large federal awards from
USAspending.gov,  
**So that** pages 500–503 can display recent contract/grant activity.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL POST to the USAspending
  Awards Search API with a filter returning the most recent awards above a
  threshold.
- **WHEN** the feed succeeds, **THEN** `data` SHALL include recipient name,
  award amount, and awarding agency for each award.

### R3.9 Federal Register feed
**As a** government page,  
**I want** a feed that fetches Federal Register documents published today,  
**So that** pages 600–601 can list the day's new regulatory documents.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL request
  `https://www.federalregister.gov/api/v1/documents` filtered to today's
  publication date.
- **WHEN** the feed succeeds, **THEN** `data` SHALL include document title,
  document type (rule, notice, etc.), and agency for each document.

### R3.10 openFDA recalls feed
**As a** safety page,  
**I want** a feed that fetches recent food and drug recalls from the openFDA
API,  
**So that** pages 700–701 can list active public safety recalls.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL request
  `https://api.fda.gov/food/enforcement.json` and
  `https://api.fda.gov/drug/enforcement.json` without any API key.
- **WHEN** the feed succeeds, **THEN** `data` SHALL include recall number,
  product description, recalling firm, and recall class for the most recent
  20 records across both categories.

### R3.11 Hacker News feed
**As a** tech news page,  
**I want** a feed that fetches the top Hacker News story IDs and their
details via the Firebase REST API,  
**So that** pages 800–801 can display current top stories.

**Acceptance criteria:**
- **WHEN** the feed is called, **THEN** it SHALL request
  `https://hacker-news.firebaseio.com/v0/topstories.json` and then fetch
  details for the top 20 stories.
- **WHEN** the feed succeeds, **THEN** `data` SHALL include title, score,
  comment count, and author for each story.
- **WHEN** a story detail fetch fails, **THEN** that story's slot SHALL be
  omitted rather than failing the whole feed.

---

## R4 – Pages & Registry

### R4.1 Page builder contract
**As a** page system,  
**I want** every page builder to be a pure function `(data, now: Date) => Page`,  
**So that** builders are testable without I/O and can be composed freely.

**Acceptance criteria:**
- **WHEN** a page builder is called with the same inputs, **THEN** it SHALL
  return the same `Page` every time (pure/deterministic given `now`).
- **WHEN** `data` is a failed `FeedResult` (`ok: false`), **THEN** the builder
  SHALL return a valid `Page` with a `SERVICE INTERRUPTED` panel.
- **WHEN** any builder runs, **THEN** the returned `Page` SHALL pass the 25×40
  invariant check.

### R4.2 Page number map
**As a** user navigating by page number,  
**I want** a stable registry mapping page numbers to builder functions,  
**So that** the API and viewer can look up any page by its 3-digit number.

**Acceptance criteria:**
- **WHEN** the registry is queried with a known page number, **THEN** it SHALL
  return the corresponding builder function.
- **WHEN** the registry is queried with an unknown page number, **THEN** it
  SHALL return `undefined` (not throw).
- **WHEN** the registry is iterated, **THEN** it SHALL yield all registered
  page numbers in ascending numeric order.

### R4.3 Defined pages
**As a** user browsing CRYPTEXT,  
**I want** the following page numbers to be registered with appropriate content:

| Range | Content |
|-------|---------|
| 100 | Site index with all page numbers and one-line descriptions |
| 101 | About / How to use CRYPTEXT |
| 200–209 | Weather – one page per city (8 cities + overflow) |
| 300–302 | Earthquakes – recent M2.5+ events |
| 400–401 | Space weather – K-index sparkline, aurora forecast |
| 500–503 | Money – national debt, interest rates, USAspending awards |
| 600–601 | Federal Register – today's documents |
| 700–701 | Safety recalls – food & drug |
| 800–801 | Tech news – Hacker News top stories |
| 666 | Kiroween – haunted CRT credits / Easter egg page |

**Acceptance criteria:**
- **WHEN** any registered page is rendered, **THEN** row 24 SHALL display the
  data source URL or name.
- **WHEN** any registered page is rendered, **THEN** it SHALL have at least
  one fastext link (e.g., red → index page 100).
- **WHEN** the weather pages are rendered, **THEN** each of the 8 cities SHALL
  appear on its own sub-page (200–207) plus a summary on 200.
- **WHEN** page 666 is rendered, **THEN** it SHALL display a Kiroween/haunted
  theme in its presentation while its data (if any) is real.

### R4.4 Index page generation
**As a** new user on page 100,  
**I want** an auto-generated index that lists every registered page number,  
**So that** I can discover the full content of the service.

**Acceptance criteria:**
- **WHEN** the index page is rendered, **THEN** it SHALL list every page
  number registered in the registry along with a short description.
- **WHEN** new pages are added to the registry, **THEN** the index SHALL
  reflect them without a separate manual edit.

---

## R5 – HTTP API

### R5.1 Page endpoint
**As a** client (browser, terminal, agent),  
**I want** a GET `/api/page?n=<number>&format=<html|ansi|json|tti>` endpoint,  
**So that** I can retrieve any page in the format I need.

**Acceptance criteria:**
- **WHEN** a valid page number and format are provided, **THEN** the endpoint
  SHALL return 200 with the correct `Content-Type`
  (`text/html`, `text/plain`, `application/json`, `text/plain`).
- **WHEN** `format=ansi` is requested, **THEN** the `Content-Type` SHALL be
  `text/plain; charset=utf-8` so `curl` displays it without saving.
- **WHEN** an unknown page number is requested, **THEN** the endpoint SHALL
  return 404 with a JSON body `{ error: "Page not found" }`.
- **WHEN** an invalid format is requested, **THEN** the endpoint SHALL return
  400 with a JSON body `{ error: "Invalid format" }`.
- **WHEN** the endpoint is called, **THEN** it SHALL invoke the relevant feed,
  build the page, and encode it in the requested format within a single
  serverless function execution.
- **WHEN** a `format` query parameter is absent, **THEN** the default SHALL be
  `html`.

### R5.2 Index endpoint
**As a** client discovering the service,  
**I want** a GET `/api/pages` endpoint,  
**So that** I can retrieve the list of all available page numbers and titles.

**Acceptance criteria:**
- **WHEN** the endpoint is called, **THEN** it SHALL return 200 with
  `application/json` and a JSON array of `{ n: number, title: string }`
  objects sorted by page number.

### R5.3 CORS and caching headers
**As a** web viewer,  
**I want** appropriate CORS and cache headers on API responses,  
**So that** the browser viewer and third-party clients can access the API.

**Acceptance criteria:**
- **WHEN** any API response is sent, **THEN** it SHALL include
  `Access-Control-Allow-Origin: *`.
- **WHEN** an API response is sent for a data page, **THEN** it SHALL include
  `Cache-Control: public, max-age=300` (matching the 5-minute feed cache).

---

## R6 – MCP Server

### R6.1 MCP transport and SDK
**As an** AI agent,  
**I want** a stdio MCP server built with `@modelcontextprotocol/sdk`,  
**So that** I can connect to CRYPTEXT using any MCP-compatible agent
framework.

**Acceptance criteria:**
- **WHEN** the MCP server process starts, **THEN** it SHALL communicate over
  stdin/stdout using the MCP protocol.
- **WHEN** the server starts, **THEN** it SHALL advertise the tools
  `list_pages` and `read_page`.

### R6.2 list_pages tool
**As an** AI agent,  
**I want** a `list_pages` tool with no required arguments,  
**So that** I can discover all available CRYPTEXT page numbers.

**Acceptance criteria:**
- **WHEN** `list_pages` is called, **THEN** it SHALL return a JSON array of
  `{ n: number, title: string }` for every registered page.

### R6.3 read_page tool
**As an** AI agent,  
**I want** a `read_page(n: number, format?: "json"|"ansi"|"tti")` tool,  
**So that** I can retrieve the content of a specific page.

**Acceptance criteria:**
- **WHEN** `read_page` is called with a valid page number, **THEN** it SHALL
  return the encoded page in the requested format (default `json`).
- **WHEN** `read_page` is called with an unknown page number, **THEN** it
  SHALL return a tool error with a descriptive message.
- **WHEN** `format=json` is used, **THEN** the returned content SHALL conform
  to the JSON encoder output (R2.3).

---

## R7 – Web Viewer

### R7.1 CRT visual presentation
**As a** web visitor,  
**I want** a static HTML/CSS/JS page that renders any CRYPTEXT page with a
CRT monitor aesthetic,  
**So that** browsing feels like using a real 1980s Teletext set.

**Acceptance criteria:**
- **WHEN** the viewer loads, **THEN** it SHALL display a CRT frame with
  scanlines, phosphor glow, and slight screen curvature effects using CSS
  only.
- **WHEN** the viewer first opens, **THEN** it SHALL play a power-on animation
  (e.g. screen flash / roll-in).
- **WHEN** a page is displayed, **THEN** the 40×25 grid SHALL scale to fit
  the viewport, including on mobile screens, while preserving aspect ratio.

### R7.2 On-screen remote control
**As a** web visitor,  
**I want** an on-screen remote control with digit buttons, four fastext
colour buttons, a REVEAL button, and navigation arrows,  
**So that** I can browse pages without a keyboard.

**Acceptance criteria:**
- **WHEN** a digit button is pressed, **THEN** it SHALL contribute to a
  3-digit page number accumulator and navigate when the third digit is entered.
- **WHEN** a fastext colour button is pressed, **THEN** the viewer SHALL
  navigate to the corresponding linked page number.
- **WHEN** the REVEAL button is pressed, **THEN** cells with the `conceal`
  class SHALL become visible.
- **WHEN** navigation arrows are pressed, **THEN** they SHALL increment or
  decrement the current page number by 1.

### R7.3 Keyboard navigation
**As a** power user,  
**I want** keyboard shortcuts for all navigation actions,  
**So that** I can browse without touching the mouse.

**Acceptance criteria:**
- **WHEN** digit keys (0–9) are pressed, **THEN** they SHALL feed into the
  page number accumulator as per R7.2.
- **WHEN** arrow-up / arrow-down keys are pressed, **THEN** they SHALL
  navigate to the next/previous page number.
- **WHEN** R, G, Y, or C keys are pressed, **THEN** they SHALL activate the
  red, green, yellow, or cyan fastext link respectively.
- **WHEN** the ENTER key is pressed during digit accumulation, **THEN** the
  accumulated number SHALL be submitted immediately.

### R7.4 Page-search "P" counter
**As a** viewer familiar with Teletext,  
**I want** a "P###" counter in the header area that cycles while a page is
loading,  
**So that** the experience feels authentic.

**Acceptance criteria:**
- **WHEN** a page navigation request is initiated, **THEN** the header's page
  number area SHALL display a cycling counter (e.g. `P100` → `P101` …)
  until the page content arrives.
- **WHEN** the page content is loaded, **THEN** the counter SHALL stop and
  the correct page number SHALL be shown.

### R7.5 No build step
**As a** deployer,  
**I want** the entire `public/` viewer to work as static files with no
bundler or transpiler,  
**So that** deployment is a simple file copy and local development needs only
a static file server.

**Acceptance criteria:**
- **WHEN** `public/index.html` is opened from a static file server, **THEN**
  it SHALL load and function without any build step.
- **WHEN** the viewer fetches page content, **THEN** it SHALL call the
  `/api/page?n=<n>&format=html` endpoint.

---

## R8 – Tests

### R8.1 Page engine unit tests
**As a** developer,  
**I want** vitest unit tests for all engine helpers,  
**So that** I can refactor the engine safely.

**Acceptance criteria:**
- **WHEN** tests run, **THEN** `writeText`, `writePadded`, `mosaicBar`, and
  `sparkline` SHALL all have passing unit tests covering boundary conditions.
- **WHEN** the double-height helper is tested, **THEN** the test SHALL assert
  that row *n+1* is blank after placing a double-height attribute on row *n*.

### R8.2 Property tests – grid invariant
**As a** developer using fast-check,  
**I want** a property test that generates random page-write operations and
asserts the 25×40 invariant,  
**So that** the clipping logic is verified for all input combinations.

**Acceptance criteria:**
- **WHEN** fast-check generates random (row, col, text) triples, **THEN** the
  resulting page SHALL always have exactly 25 rows of exactly 40 cells after
  each write operation.

### R8.3 Property tests – encoder round-trip
**As a** developer,  
**I want** property tests that run random `Page` objects through each encoder
and assert no exceptions are thrown,  
**So that** encoder edge cases are covered.

**Acceptance criteria:**
- **WHEN** fast-check generates a random valid `Page`, **THEN** each of the
  four encoders (HTML, ANSI, JSON, TTI) SHALL complete without throwing.
- **WHEN** fast-check generates a random valid `Page` and encodes it to TTI,
  **THEN** a round-trip parse SHALL recover an identical grid.

### R8.4 Double-height property test
**As a** developer,  
**I want** a property test that asserts double-height row semantics,  
**So that** the "row below is blank" rule cannot be accidentally broken.

**Acceptance criteria:**
- **WHEN** fast-check places `DOUBLE_HEIGHT` on a random row *r* (0–23),
  **THEN** the page SHALL always show row *r+1* as all 0x20 characters.

### R8.5 Encoder output correctness tests
**As a** developer,  
**I want** deterministic vitest unit tests that exercise each encoder with a
known `Page` fixture,  
**So that** I get fast, readable failure messages when an encoder regresses.

**Acceptance criteria:**
- **WHEN** the HTML encoder runs on a fixture page, **THEN** the output SHALL
  contain the expected colour class names and mosaic `<span>` elements.
- **WHEN** the ANSI encoder runs on a fixture page, **THEN** the output SHALL
  contain the expected `\e[38;2;…m` sequences.
- **WHEN** the JSON encoder runs on a fixture page, **THEN** `JSON.parse`
  SHALL succeed and the structure SHALL match the schema in R2.3.
- **WHEN** the TTI encoder runs on a fixture page, **THEN** each row SHALL
  have a corresponding `OL,<n>,` line and fastext SHALL appear as `FL,…`.
