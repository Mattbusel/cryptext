# Bugfix: MCP Deploy Header

## Summary
Four critical issues prevent deployment and MCP compliance:
1. MCP server violates MCP protocol: fake method objects prevent tool invocation
2. Header layout is broken: clock overwrites title
3. Vercel deployment config routes to non-existent files
4. dist/ is committed to git

## Impact
- MCP clients cannot call any tools (list_pages, read_page)
- Header renders incorrectly on all pages
- Deployment fails or serves incorrect files
- Repository bloat and CI pollution

## Scope
- Rewrite mcp/server.ts to be MCP-compliant
- Fix header row layout in engine
- Correct vercel.json routing and build config
- Clean git index of dist/

## Verification
- npm run build succeeds
- npx vitest --run passes
- dev-server responds correctly to /api/page?n=100&format=ansi and /api/pages
- MCP server can be spawned and connects over stdio
