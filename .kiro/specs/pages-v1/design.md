# Pages V1: ASCII Design Mock-ups

Each page is 40 columns x 25 rows (rows 0-24). Row 0 header managed by engine. Rows 1-2 double-height titles. Rows 3-22 content. Row 23 fastext. Row 24 source footer.

## Page 100: INDEX

```
P 100 CRYPTEXT          15 Nov 14:32
+CRYPTEXT+ [blue bg]
CRYPTEXT [blue bg]
200 WEATHER
300 QUAKES
400 SPACE WEATHER
500 PUBLIC DEBT
600 FEDERAL REGISTER
700 FOOD RECALLS
800 TECH NEWS
(latest quake and Kp here)
Latest M4.3 Kasilof AK
Kp index: 4 G1
                    [fastext]
api.weather.gov        [updated time]
```

## Page 101: ABOUT

```
P 101 CRYPTEXT          15 Nov 14:32
+ABOUT+ [blue bg]
CRYPTEXT [blue bg]
Teletext 1974-2012, back from the
grave on live public data. Fast,
glanceless, ad-free.

Type 3 digits to jump. Use fastext
keys (R G Y C) for links. Arrow keys
to browse next/previous page.

Access via curl:
curl https://.../api/page?n=300&format=ansi

AI agents: MCP server read_page tool

TTI files for VBIT2 Teletext inserter

All times US Eastern
                    [fastext: 100]
index                      [updated]
```

## Page 200: WEATHER

```
P 200 CRYPTEXT          15 Nov 14:32
+WEATHER+ [cyan bg]
WEATHER [cyan bg]
City          Temp  Forecast      Alerts
New York NY     45  Cloudy         0
Los Angeles CA  72  Sunny          0
Chicago IL      38  Rain           1
Houston TX      65  Mostly cloudy  0
Phoenix AZ      68  Sunny          0
Denver CO       35  Snow           0
Seattle WA      48  Rainy          2
Miami FL        75  Sunny          1
                    [fastext]
api.weather.gov            [updated]
```

## Page 201: NEW YORK

```
P 201 CRYPTEXT          15 Nov 14:32
+NYC+ [cyan bg]
NEW YORK [cyan bg]
Period          Temp  Forecast
Tonight          35  Cloudy
Tomorrow        42  Partly cloudy
Tomornight      38  Rain
Later           45  Clearing
       
[mosaic bar chart of temps:]
45 XX
42 XX
38 XX
35 XX

                    [fastext: 200]
api.weather.gov        [updated]
```

## Page 300: QUAKES

```
P 300 CRYPTEXT          15 Nov 14:32
+QUAKES+ [red bg]
EARTHQUAKES [red bg]
Time      Mag  Place
12:34 ET  4.3  Kasilof AK
11:45 ET  4.2  Farkhār AFG
10:22 ET  3.8  California
09:15 ET  3.1  Oklahoma
08:50 ET  2.9  Hawaii
(continuing...)
                    [fastext: 301]
earthquake.usgs.gov    [updated]
```

## Page 301: LARGEST

```
P 301 CRYPTEXT          15 Nov 14:32
+LARGEST+ [red bg]
LARGEST [red bg]

          4.3
        Kasilof
        Alaska
Depth: 69 km
Time: 12:34 ET

Quakes per 2-hour bucket:
[mosaic bar chart]

                    [fastext: 300]
earthquake.usgs.gov    [updated]
```

## Page 400: SPACE

```
P 400 CRYPTEXT          15 Nov 14:32
+SPACE+ [magenta bg]
SPACE WEATHER [magenta bg]

Kp Index:    4
Storm Level: G1 (Minor)

Aurora visible:
northern US states

Kp sparkline:
[mosaic sparkline 30 values]

                    [fastext: 401]
swpc.noaa.gov          [updated]
```

## Page 401: KP EXPLAINED

```
P 401 CRYPTEXT          15 Nov 14:32
+KP SCALE+ [magenta bg]
KP SCALE [magenta bg]
Kp Index: 0-9 measure
G-scale:
0 (G0) No impact
1 (G1) Minor storm
2 (G2) Moderate storm
3 (G3) Strong storm
4 (G4) Severe storm
5 (G5) Extreme storm

Current: Kp 4, G1 (Minor)

                    [fastext: 400]
swpc.noaa.gov          [updated]
```

## Page 500: DEBT

```
P 500 CRYPTEXT          15 Nov 14:32
+PUBLIC DEBT+ [green bg]
PUBLIC DEBT [green bg]

Total Outstanding:
      33.8 Trillions
Public: 27.5T (82%)
Intragovt: 6.3T (18%)

30-day change: +0.05T

30-day sparkline:
[mosaic sparkline 30 values]

                    [fastext: 501]
treasury.gov           [updated]
```

## Page 501: INTEREST RATES

```
P 501 CRYPTEXT          15 Nov 14:32
+INTEREST RATES+ [green bg]
INTEREST RATES [green bg]
Rate              Latest Month Avg
3-month bills        5.42%
6-month bills        5.35%
1-year bills         5.28%
2-year notes         4.85%
5-year notes         4.20%
10-year bonds        3.95%
30-year bonds        3.85%

                    [fastext: 500]
treasury.gov           [updated]
```

## Page 600: FEDERAL REGISTER

```
P 600 CRYPTEXT          15 Nov 14:32
+FEDERAL REGISTER+ [yellow bg]
FEDERAL REGISTER [yellow bg]
Type Doc        Title
RULE  FR-123    Environmental...
PRORULE FR-456  Proposed Rule...
NOTICE FR-789   Public Notice...
PRESDOC FR-999  Executive Order
(continuing...)

                    [fastext: 601]
federalregister.gov    [updated]
```

## Page 700: FOOD RECALLS

```
P 700 CRYPTEXT          15 Nov 14:32
+FOOD RECALLS+ [red bg]
FOOD RECALLS [red bg]
Date       Classification Product
2026-11-01 Class I       Spinach
2026-10-31 Class II      Peanut Butter
2026-10-29 Class III     Yogurt
(continuing...)

                    [fastext: 701]
openfda.fda.gov        [updated]
```

## Page 800: HACKER NEWS 1-10

```
P 800 CRYPTEXT          15 Nov 14:32
+TECH NEWS+ [blue bg]
TECH NEWS [blue bg]
1. 1,245 New AI Model Solves N.P
   Problem in Polynomial Time
2. 892  Show HN: Build Your Own OS
3. 756  React 20 Released With New
   Hooks API
(continuing...)

                    [fastext: 801]
news.ycombinator.com   [updated]
```

## Page 666: KIROWEEN

```
P 666 CRYPTEXT          15 Nov 14:32
+KIROWEEN+ [black bg, red text]
THE SIGNAL NEVER DIED [flashing red]

[Mosaic ghost or pumpkin ASCII art]

Ceefax 1974-2012

Built with Kiro
Data: NOAA NWS, USGS, SWPC,
Treasury, FedRegister, FDA,
CPSC, Hacker News

                    [fastext: 100]
CRYPTEXT               [updated]
```

## Layout Notes

### Double-Height Title (Rows 1-2)
- Row 1: colour code (NEW_BACKGROUND) + title text in contrasting colour
- Row 2: blank (covered by row 1 double-height)
- Colours by section:
  - INDEX: 0x04 (BLUE) bg, 0x07 (WHITE) text
  - WEATHER: 0x06 (CYAN) bg, 0x1c (BLACK_BACKGROUND) - means use black on cyan
  - EARTH: 0x01 (RED) bg, 0x07 (WHITE) text
  - SPACE: 0x05 (MAGENTA) bg, 0x07 (WHITE) text
  - MONEY: 0x02 (GREEN) bg, 0x1c (BLACK_BACKGROUND)
  - GOVERNMENT: 0x03 (YELLOW) bg, 0x1c (BLACK_BACKGROUND)
  - SAFETY: 0x01 (RED) bg, 0x07 (WHITE) text
  - TECH: 0x04 (BLUE) bg, 0x07 (WHITE) text
  - KIROWEEN: 0x1c (BLACK_BACKGROUND) bg, 0x01 (RED) text + FLASH

### Fastext Row (Row 23)
Four words in red, green, yellow, cyan at approximate positions:
- Col 0: RED link label (page number)
- Col 10: GREEN link label (page number)
- Col 20: YELLOW link label (page number)
- Col 30: CYAN link label (page number)

### Source Footer (Row 24)
- Col 0-35: Source name in CYAN
- Col 36-39: Fastext link indicators (encoded by renderer)
- After source or on same row: "updated HH:MM ET" timestamp

## Content Constraints

- Truncate all text to fit within 40 columns
- Numbers right-aligned in columns for tables
- Mosaic bars/sparklines use sextants (6-height bars)
- No em dashes; use colon, comma, or period
- If feed ok: false, writeInterrupted() replaces rows 10-15
