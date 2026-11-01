---
inclusion: always
---
# Structure

```
src/engine/     page model, control codes, layout helpers (text, double height, mosaic bars/sparklines)
src/encode/     renderers: html.ts (web), ansi.ts (terminal), json.ts (agents), tti.ts (broadcast)
src/feeds/      one file per public data source, each returning FeedResult
src/pages/      one file per page or page range, pure functions (feed data -> Page)
src/registry.ts page number -> page builder map, index generation
api/            Vercel functions: /api/page?n=101&format=html|ansi|json|tti, /api/index
mcp/            stdio MCP server exposing list_pages / read_page tools
public/         the CRT viewer (vanilla JS, no build step)
tests/          vitest + fast-check
```

Rules:
- Page builders are pure: `(data, now) => Page`. All I/O lives in feeds.
- Never write outside the 40x25 grid; use engine helpers that clip and pad.
