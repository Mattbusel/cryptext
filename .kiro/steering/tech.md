---
inclusion: always
---
# Tech

- TypeScript (strict), Node 22, ES modules. No framework on the server: Vercel serverless functions in `api/`, static viewer in `public/`.
- Tests: vitest. Property-based tests with fast-check for the page engine (grid size, control codes, encoders round-trip).
- Data: free, keyless public APIs only (NWS api.weather.gov, USGS earthquake GeoJSON, NOAA SWPC, Treasury Fiscal Data, USAspending, Federal Register, openFDA / CPSC recalls, Hacker News Firebase API). Always send a descriptive User-Agent. Cache responses in memory for at least 5 minutes per feed.
- Every feed module exports `fetchX(): Promise<FeedResult<T>>` where FeedResult is `{ ok: true, data, fetchedAt, source } | { ok: false, error, source }`. Pages must render a clear "SERVICE INTERRUPTED" panel on `ok: false`.
- No secrets, no API keys, no paid services.
- Keep dependencies minimal: runtime deps should be zero or near zero (`@modelcontextprotocol/sdk` for the MCP server is fine).
