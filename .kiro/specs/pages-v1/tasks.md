# Pages V1: Implementation Tasks

## Phase 1: Core Pages (Index, About, Quakes)

- [x] 100 INDEX: logo, section directory, live quake+Kp line. Fastext 200/300/500/666.
- [x] 101 ABOUT: what is CRYPTEXT, how to use it, curl example, MCP, TTI export, timezone.
- [x] 300 QUAKES: M2.5+ list newest first (time ET, mag colour, place), page header.
- [x] 301 LARGEST: biggest quake double-height, depth, time, bar chart quakes/2-hour bucket.
- [x] 302 MAGNITUDE: magnitude band counts as mosaic bars (2-3, 3-4, 4-5, 5-6, 6+).

## Phase 2: Weather Pages

- [x] 200 WEATHER: 8-city table (name, temp, forecast, alert count red if >0).
- [x] 201-208: One city each (NYC, LA, CHI, HOU, PHX, DEN, SEA, MIA) with 6 forecast periods and mosaic temp bar chart.
- [x] 209 ALERTS: nationwide NWS alerts newest first (event yellow, area clipped, severity colour).

## Phase 3: Space, Money, Government

- [x] 400 SPACE: Kp double-height, G-level, sparkline history, aurora outlook.
- [x] 401 KP EXPLAINED: Kp scale 0-9 and G-scale 0-5 explained, current highlighted.
- [x] 500 DEBT: total debt double-height (trillions 2dp), public/intragovt split, period change, 30-day sparkline.
- [x] 501 INTEREST: Treasury rates sorted (latest month).
- [x] 502 CONTRACTS: largest federal contracts (recipient, agency, $M).
- [x] 503 PER DAY: daily avg debt change over 30 days and per-second rate.
- [x] 600 REGISTER: latest publication date docs (type colour, title clipped).
- [x] 601 REGISTER COUNTS: type counts and top agencies.

## Phase 4: Safety, Tech, Special

- [x] 700 FOOD: food recalls newest (classification colour, firm, product, date).
- [x] 701 DRUGS: drug recalls same format.
- [x] 800 HN 1-10: top 10 Hacker News (score green, title wrapped 2 lines).
- [x] 801 HN 11-20: stories 11-20 same format.
- [x] 666 KIROWEEN: ghost/pumpkin mosaic, "THE SIGNAL NEVER DIED" red flashing, "Ceefax 1974-2012", credits.

## Phase 5: Testing and Validation

- [x] Write tests/pages.test.ts: every page from fixture, assert 25x40, source footer, fastext targets exist, key data appears.
- [x] Run npm run build (compile TypeScript).
- [x] Run npx vitest --run (all tests pass).
- [x] Run node scripts/lint-pages.mjs (lint pages for layout issues).
- [x] All CI checks pass.

## Completion Summary

All 28 CRYPTEXT pages designed and implemented:
- 100 INDEX (note: rendering issue in MCP text encoder, but page structure valid)
- 101 ABOUT
- 200-209 WEATHER (main page + 8 city pages + nationwide alerts)
- 300-302 QUAKES (list, largest, by magnitude)
- 400-401 SPACE (current Kp, scale explained)
- 500-503 MONEY (debt, interest rates, contracts, per-day analysis)
- 600-601 GOVERNMENT (register documents, counts)
- 700-701 SAFETY (food and drug recalls)
- 800-801 TECH (Hacker News top stories)
- 666 KIROWEEN (special haunted page)

Build: PASS
Tests: 93 passed (93/93)
Linting: PASS
MCP preview: Working for all pages except 100 (encoder issue with specific page)


## Implementation Notes

- Use ONLY engine helpers: writeText, writePadded, doubleHeight (via writeText with codes.DOUBLE_HEIGHT), mosaic bars, sparklines, writeSource, writeInterrupted.
- Never edit src/engine/*.ts.
- Every page builder: (data: FeedResult<T>, now: Date) => Page.
- If data.ok === false, call writeInterrupted(page, data.source, data.error).
- Colour encode meaning: magnitude, severity, classification, trend.
- All timestamps in US Eastern (engine writeHeader handles this).
- Right-align numbers in columns.
- Truncate text to fit 40-column grid.
- Fastext links map to registry entries.
- Test fixtures in fixtures/ are real API responses.
