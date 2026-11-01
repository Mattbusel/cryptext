# CRYPTEXT

**Teletext, back from the grave.** Live US public data on 40x25 teletext pages: on a haunted CRT in your browser, in your terminal with `curl`, for AI agents over MCP, and as broadcast files a Raspberry Pi can put on a real analogue TV.

Live: **https://cryptext-nine.vercel.app** · Demo video: https://youtu.be/OtSXHXnzCaY · Kiroween 2026 entry, category **Resurrection** · MIT licensed

```sh
curl "https://cryptext-nine.vercel.app/api/page?n=300&format=ansi"   # earthquakes, in colour, in your terminal
```

## Why

Teletext (Ceefax 1974-2012, Oracle, and their cousins around the world) was the original glanceable public information service: no ads, no tracking, no login, readable on anything with a screen, and fast on any connection. It was switched off, not replaced. Public data today is spread across dozens of APIs and dashboards that nobody opens.

CRYPTEXT resurrects the format and points it at live, keyless US public data. Every number on every page comes from a real API call (cached 5 minutes) with the source on row 24. If a feed is down, the page says SERVICE INTERRUPTED rather than showing stale or invented numbers.

## Pages

| Page | What | Source |
|---|---|---|
| 100 | Index with a mosaic logo and a live "right now" panel | USGS, NOAA SWPC |
| 101 | About and how to use | |
| 200, 201-208, 209 | 8-city weather table, per-city forecasts with bar charts, active alerts | api.weather.gov |
| 300, 301, 302 | Today's earthquakes, the biggest one with a 2-hour histogram, counts by magnitude | earthquake.usgs.gov |
| 400, 401 | Planetary Kp with a sparkline and aurora outlook, the G-scale explained | services.swpc.noaa.gov |
| 500, 501, 502, 503 | Debt to the penny with a 30-day sparkline, interest rates, biggest contract actions, the debt clock | Treasury Fiscal Data, USAspending |
| 600, 601 | Newest Federal Register documents, counts by type and agency | federalregister.gov |
| 700, 701 | Food and drug recalls (Class I in red) | openFDA |
| 800, 801 | Hacker News top stories | HN Firebase API |
| 666 | The haunted page | |

## One page, five outputs

`GET /api/page?n=NNN&format=html|ansi|json|tti` and `GET /api/pages`.

- **Viewer** (`public/`): a CRT with scanlines, phosphor glow, a rolling interference band, power-on animation, the real page-search counter, double height, flash, conceal/reveal, and mosaic graphics drawn as 2x3 blocks. Remote control: digits, the four Fastext keys, reveal, arrows. Keyboard: digits, R G Y C, arrows, `?`. Deep links: `/p/300`.
- **ANSI** for terminals: 24-bit colour, backgrounds, and Unicode 13 sextant characters for the mosaics.
- **JSON** for programs and agents: rows as text plus every cell's attributes.
- **MCP** (`node dist/mcp/server.js`, stdio): tools `list_pages` and `read_page(n, format)` with `format` json, ansi, tti or text.
- **TTI** (VBIT2 / MRG format): drop the files into VBIT2 on a Raspberry Pi and the page goes out as a real teletext signal on composite video.

## How Kiro built it

CRYPTEXT was built with **Kiro CLI 2.37 (V3 agent engine)**, run headless (`kiro-cli chat --v3 --no-interactive`) on the free plan, mostly on Claude Haiku 4.5 to stretch the 50 monthly credits (about 38 used). Everything Kiro used is in [`.kiro/`](.kiro).

**Steering** (`.kiro/steering/`): `product.md` (no mock data ever, page-number plan, honest failure pages, house style), `tech.md` (TypeScript, zero runtime deps, keyless APIs, the FeedResult contract), `structure.md` (pure page builders, all I/O in feeds), and `teletext.md`, a condensed ETS 300 706 Level 1 reference with `inclusion: fileMatch` so it only loads when Kiro touches the engine, encoders or pages. The teletext steering file did the most work: Kiro's encoders got the attribute state machine and the TTI escaping right on the first pass because the rules were in context.

**Specs** (`.kiro/specs/`), five of them, each requirements or bugfix analysis, design, and tasks:
1. `cryptext-core`: the whole system as 56 tasks. Kiro generated the requirements (EARS), the design (module interfaces, a mermaid data flow, the attribute state machine, correctness properties) and the task order (engine, encoders, tests, feeds, pages, API, MCP, viewer), then executed it in phases.
2. `live-feed-fixes` (Bugfix Spec): a review against the live APIs found that two recorded fixtures had been invented, four endpoints were wrong, and feed tests were missing. Kiro wrote current / expected / unchanged behaviour for each bug, fixed them, re-recorded real fixtures and added 25 feed tests.
3. `mcp-deploy-header` (Bugfix Spec): the first MCP server was not protocol-compliant, the header clock overwrote the title, and the Vercel config pointed at files that did not exist.
4. `pages-v1`: run by the custom `page-designer` agent, with an ASCII mock-up of every page in the design doc.
5. `layout-properties`: 66 property and unit tests for the layout helpers added during review.

Spec-driven beat vibe coding here for a concrete reason: the design doc fixed the interfaces (`FeedResult`, `walkRow`, the registry) before any code existed, so later runs on a small model could implement one phase at a time without drifting, and bugfix specs turned review findings into checked, regression-tested fixes.

**Hooks** (`.kiro/hooks/`):
- `test-on-save.json` (PostFileSave on `src/engine`, `src/encode`, `tests`): re-runs the engine and encoder suites whenever the agent edits them.
- `no-em-dash.json` (PostFileSave on code and docs): a house-style check that fails with file and line.
- `page-lint-on-stop.json` (Stop): renders every registered page from recorded fixtures and checks the 25x40 grid, 7-bit codes, source footer and Fastext targets before the agent can finish a turn.

**Custom agent** (`.kiro/agents/page-designer.md`): a V3 Markdown agent with the teletext steering preloaded, permissions that allow writes only to `src/pages`, `tests` and `fixtures` and deny the engine and encoders, and the project's MCP server in its toolset.

**MCP** (`.kiro/settings/mcp.json`): the project's own MCP server is registered with Kiro, so the page-designer agent looked at its pages through `read_page(n, "text")` while laying them out. The tool the app ships for AI agents was also Kiro's preview tool.

**Property-based testing**: fast-check properties cover the grid invariant, encoders never throwing on random pages, TTI round-tripping through a parser, double-height rows, and the layout helpers (mosaic code ranges, bar fill precision, ASCII folding). 159 tests in total.

**Permissions**: one headless run stopped a dev server with `Stop-Process -Name node`, which kills every Node process on the machine. A user-level `~/.kiro/settings/permissions.yaml` now denies broad process kills for all Kiro sessions. Worth knowing before you run agents with `--trust-all-tools`.

**What was done outside Kiro**: Claude Code reviewed every Kiro run against the live APIs and wrote the findings into the bugfix specs above. In review it also rewrote the page layouts on a new helper module (`src/engine/layout.ts`), the browser viewer (the first Kiro version did not size its grid correctly) and the ANSI encoder's colour and sextant handling. Kiro then wrote the property tests for that code.

## Run it

```sh
npm install
npm run build
npm test                       # 159 tests, offline against recorded real responses
node scripts/dev-server.mjs    # http://localhost:3666
node scripts/record-fixtures.mjs   # refresh fixtures from the live APIs
node scripts/demo/agent.mjs 500    # an MCP client reading page 500 as text
node scripts/demo/record.mjs       # re-record the demo video (headless Chrome, Piper TTS, ffmpeg)
```

Deploys to Vercel as-is (`vercel.json`): `public/` is static, `api/` are Node functions over the compiled `dist/`.

## Data

All sources are free, keyless US public APIs: National Weather Service, USGS Earthquake Hazards, NOAA Space Weather Prediction Center, Treasury Fiscal Data, USAspending.gov, the Federal Register, openFDA, and the Hacker News API. Times are US Eastern.

Built by Tensorust LLC for Kiroween 2026.
