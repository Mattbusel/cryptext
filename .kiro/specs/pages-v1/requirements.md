# Pages V1: CRYPTEXT Page Design Specification

## Overview
Design and implement real Teletext pages (40x25 character grid, Level 1 features) for CRYPTEXT, rendering live public data from eight free APIs. Every page shows current data with clear source attribution. If a feed fails, the page displays SERVICE INTERRUPTED.

## Page List and Data Sources

### Index Pages
- **100 INDEX**: CRYPTEXT logo in mosaic, section directory (page number and name in yellow), "now" line with latest quake and Kp index. Fastext: 200 / 300 / 500 / 666.
- **101 ABOUT**: What CRYPTEXT is, how to use it (type 3 digits, fastext keys, arrows), API access, MCP server, TTI export, timezone note.

### Weather (200-209)
- **200 WEATHER**: Table of 8 cities (New York, Los Angeles, Chicago, Houston, Phoenix, Denver, Seattle, Miami): name, current temp, short forecast, alert count in red if above zero.
- **201-208**: One city each (NYC, LA, CHI, HOU, PHX, DEN, SEA, MIA) with next 6 forecast periods (name, temp, short forecast) and mosaic bar chart of temperatures.
- **209 ALERTS**: Nationwide NWS alerts (newest first): event in yellow, area clipped, severity colour coded.

### Earth (300-302)
- **300 QUAKES**: Past-day M2.5+ earthquakes (time ET, magnitude colour coded, place clipped), newest first.
- **301 LARGEST**: The largest quake of the day double-height, depth, time, mosaic bar chart of quake counts per 2-hour bucket.
- **302 BY MAGNITUDE**: Counts by magnitude band (2-3, 3-4, 4-5, 5-6, 6+) as mosaic bars.

### Space (400-401)
- **400 SPACE**: Current Kp index double-height with NOAA storm level (G0-G5), mosaic sparkline of Kp history, one-line aurora outlook.
- **401 KP EXPLAINED**: The Kp scale and G-scale explained, with current level highlighted.

### Money (500-503)
- **500 DEBT**: Public debt outstanding double-height (trillions, 2 decimals), public vs intragovernmental split, period change, 30-day mosaic sparkline.
- **501 INTEREST**: Treasury interest rates (latest month), sorted.
- **502 CONTRACTS**: Largest federal contract transactions (past 10 days): recipient, agency, amount in $M.
- **503 PER DAY**: Daily average change in debt over 30-day window and per-second rate.

### Government (600-601)
- **600 FEDERAL REGISTER**: Latest publication date's documents, type tag coloured (RULE, PRORULE, NOTICE, PRESDOC), title clipped.
- **601 REGISTER COUNTS**: Type counts and top agencies.

### Safety (700-701)
- **700 FOOD**: Food recalls (newest first), classification colour coded (Class I red), firm and product clipped, report date.
- **701 DRUGS**: Drug recalls (same format).

### Tech (800-801)
- **800 HN 1-10**: Hacker News top 10 stories, score in green, title wrapped to 2 lines.
- **801 HN 11-20**: Hacker News stories 11-20 (same format).

### Special (666)
- **666 KIROWEEN**: Haunted page. Mosaic ghost or pumpkin, flashing red "THE SIGNAL NEVER DIED", history line "Ceefax 1974-2012", credits (Kiro, data sources). Fastext back to 100.

## Layout Rules (Every Page)

- **Row 0**: Header (engine writes it): page number, CRYPTEXT, title, date/time ET.
- **Rows 1-2**: Double-height title on coloured background band (section colour band + contrasting text colour):
  - Index: blue band, white title
  - Weather: cyan band, black title
  - Earth: red band, white title
  - Space: magenta band, white title
  - Money: green band, black title
  - Government: yellow band, black title
  - Safety: red band, white title
  - Tech: blue band, white title
  - Kiroween: black band, red flashing title
- **Rows 3-22**: Content (all numbers right-aligned in columns; colour encodes meaning).
- **Row 23**: Fastext prompts (four coloured words: red, green, yellow, cyan).
- **Row 24**: Data source (cyan) + "updated HH:MM ET".
- **If ok: false**: Call writeInterrupted() which overlays SERVICE INTERRUPTED panel.

## Colour Coding Rules

- **Earthquake magnitude**: green <4.0, yellow 4.0-4.9, red 5.0+, red+flash for 6+.
- **Alert severity**: green normal, yellow moderate, red high, red+flash urgent.
- **Federal Register type**: RULE blue, PRORULE green, NOTICE yellow, PRESDOC cyan.
- **Recall classification**: Class I red, Class II yellow, Class III green.
- **Debt change**: green if positive (decreasing), red if negative (increasing).

## Data Shape (from Feeds)

### NWS (nws.ts)
- WeatherData: cities[], alerts[]
- WeatherCity: name, state, temp, unit, forecast[] (name, temperature, shortForecast), alerts[]
- Alert: event, areaDesc, severity, ends

### USGS (usgs.ts)
- QuakeData: quakes[], count
- Quake: mag, place, time (unix ms), depth, url

### SWPC (swpc.ts)
- Array of {time_tag, kp_index, estimated_kp, kp}

### Treasury (treasury.ts)
- DebtData: date, totalDebt, publicDebt, intragovDebt, period[], history[]
- period: startDate, endDate, avg, change
- history: date, value

### USAspending (usaspending.ts)
- ContractData: contracts[], period, count
- contract: recipient, agency, amount

### Federal Register (fedregister.ts)
- RegisterData: documents[], counts{}
- document: document_number, type, title, publication_date, agency_names[]

### openFDA (openfda.ts)
- RecallData: recalls[], count
- recall: recall_number, product_type, product, classification, recall_status, recall_initiation_date, firm_name

### Hacker News (hackernews.ts)
- HnData: stories[], count
- story: id, title, score, url, by, time

## Test Requirements

- Every page builder accepts FeedResult and now: Date.
- Build from recorded fixtures in fixtures/ without live API calls.
- Assert: 25 rows x 40 columns, source footer present, fastext targets in registry, key numbers from fixture appear on page.
- Run: npm run build && npx vitest --run && node scripts/lint-pages.mjs
