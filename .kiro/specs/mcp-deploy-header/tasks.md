# Tasks: MCP Deploy Header

## Task 1: Add zod dependency
- [ ] Add zod to package.json dependencies

## Task 2: Rewrite MCP server (mcp/server.ts)
- [ ] Import McpServer and StdioServerTransport from SDK v1.32
- [ ] Import z from zod for input validation
- [ ] Remove fake method objects
- [ ] Register list_pages tool with SDK tool() method
- [ ] Register read_page tool with input schema {n, format?}
- [ ] Add support for format "text"
- [ ] Handle unknown pages with { isError: true, content: [...] }
- [ ] Connect with StdioServerTransport

## Task 3: Fix header layout (src/engine/helpers.ts)
- [ ] Change page number format to "P" + 3 digits at col 0-3
- [ ] Add "CRYPTEXT" text at col 5-12 with white color
- [ ] Add page title (max 10 chars) at col 14-23 with cyan prefix
- [ ] Fix date/time format to "DD Mon HH:MM" with US Eastern timezone
- [ ] Right-align date/time to end at col 39
- [ ] Use Intl.DateTimeFormat for timezone handling

## Task 4: Add text encoder function
- [ ] Create encodeText(page: Page): string function
- [ ] Output 25 lines of plain ASCII, 40 chars each
- [ ] Strip control codes, show only printable characters
- [ ] Export from appropriate module (ansi.ts or new file)

## Task 5: Fix Vercel deployment config (vercel.json)
- [ ] Change outputDirectory from "dist" to "public"
- [ ] Add functions section with includeFiles: "dist/**"
- [ ] Fix /api/* routes to point to .js files instead of .ts
- [ ] Add /p/:n rewrite for deep links to viewer

## Task 6: Create .gitignore
- [ ] Create .gitignore with node_modules/ and dist/

## Task 7: Remove dist/ from git index
- [ ] Run git rm -r --cached dist

## Task 8: Create MCP server test (tests/mcp.test.ts)
- [ ] Spawn node dist/mcp/server.js as subprocess
- [ ] Create MCP Client with stdio transport
- [ ] Test list_pages tool
- [ ] Test read_page with format=text
- [ ] Verify response structure
- [ ] Kill subprocess

## Task 9: Build and test
- [ ] Run npm run build
- [ ] Run npx vitest --run
- [ ] Start dev-server and test /api/page?n=100&format=ansi
- [ ] Test /api/pages endpoint
- [ ] Stop dev-server

## Task 10: Verify header tests
- [ ] Review and update any header-related tests to match new layout
- [ ] Ensure timezone handling tests pass
