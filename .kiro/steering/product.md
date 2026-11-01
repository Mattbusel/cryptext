---
inclusion: always
---
# Product: CRYPTEXT

CRYPTEXT resurrects Teletext (the 1974-2012 broadcast text service: 40x25 character pages, 3-digit page numbers, coloured Fastext buttons) as a live public-data service for 2026.

Who it is for: anyone who wants fast, ad-free, glanceable public information (weather alerts, earthquakes, space weather, government spending, recalls, Federal Register), on any screen; and AI agents, which read the same pages through an MCP server.

Principles:
- Every page shows real data from a free public API, with the source named on the page. No mock data, ever. If a feed is down, the page says so honestly.
- A page is exactly 40 columns x 25 rows (row 0 is the header), using only Teletext Level 1 features: 8 colours, mosaic graphics, double height, flash, conceal/reveal.
- Page numbers are stable and memorable (100 index, 200s weather, 300s earth, 400s space, 500s money, 600s government, 700s safety, 800s tech).
- The same page renders to: the web viewer (CRT look, remote control), ANSI text for terminals (`curl`), JSON for agents (MCP), and broadcast-ready TTI files for real Teletext inserters (VBIT2 on a Raspberry Pi) so it can reach an actual analogue TV.
- Halloween flavour lives in the presentation (the haunted CRT, page 666), never in the data.

Writing style: never use the em dash character (U+2014) in code, comments, docs or page text. Use a colon, comma or full stop instead.
