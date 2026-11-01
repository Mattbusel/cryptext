# Design: MCP Deploy Header

## 1. MCP Server Rewrite (mcp/server.ts)

### Current Problem
- Uses fake method objects: `{ method: 'tools/list_pages' }` 
- MCP protocol calls tools/list and tools/call, never tools/list_pages
- Tools cannot be invoked by MCP clients

### Solution
Use @modelcontextprotocol/sdk v1.32:
- Import: `McpServer` from server/mcp.js, `StdioServerTransport` from server/stdio.js
- Import: `z` from zod for input validation
- Use `server.tool(name, schema, handler)` method to register tools
- Use `server.connect(transport)` to establish stdio connection

### Tools
1. list_pages: No input, returns array of {n, title} objects
2. read_page: Input {n: number, format?: enum}, supports json/ansi/tti/text
3. New format "text": 25 lines of plain ASCII (no ANSI codes), one per row

### Error Handling
- Unknown page: `{ isError: true, content: [...] }` (per SDK)
- Invalid format: `{ isError: true, content: [...] }`

## 2. Header Layout Fix (src/engine/helpers.ts)

### Current Problem
- Page number (3 cols) at col 0-3: incorrect
- Title (32 cols) at col 4-35: correct centering
- Clock overwrites title, shows "26 06:39" (8 chars)

### Correct Teletext Header (40 columns)
- Col 0-3: "P" + 3-digit page number (e.g. "P300")
- Col 4: space (alpha code for color)
- Col 5-12: "CRYPTEXT" in white (8 chars)
- Col 13: cyan alpha code
- Col 14-23: page title (max 10 chars)
- Col 24: yellow alpha code
- Col 25-39: date/time "01 Nov 06:39" (15 chars, right-aligned so ends at col 39)

### Date/Time
- US Eastern timezone: America/New_York
- Format: "DD Mon HH:MM" (e.g. "01 Nov 06:39")
- Use Intl.DateTimeFormat(locale, {timeZone: 'America/New_York', ...})

### Footer Note
- Page 101 (About) footer mentions the timezone is US Eastern

## 3. Vercel Deployment Config (vercel.json)

### Current Problem
- Routes /api/* to /api/$1.ts (but api/ has .js files, not .ts)
- outputDirectory: dist (would hide public/ static files)
- No includeFiles for functions

### Solution
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "public",
  "env": { "NODE_ENV": "production" },
  "functions": {
    "api/**/*.js": {
      "includeFiles": "dist/**",
      "maxDuration": 60
    }
  },
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1.js", "methods": ["GET", "POST"] },
    { "src": "/p/([0-9]+)", "dest": "/public/index.html", "query": {"n": "$1"} },
    { "src": "/(.*)", "dest": "/public/$1" }
  ]
}
```

Key changes:
- outputDirectory: public (static web viewer)
- functions section includes dist/ in deployments
- Routes /api/* to .js files
- New rewrite /p/:n to public/index.html for deep links

## 4. Git Cleanup (.gitignore)

### Action
- Create .gitignore with:
  - node_modules/
  - dist/
- Remove dist/ from git index: `git rm -r --cached dist`
- Do not commit

## 5. MCP Server Test (tests/mcp.test.ts)

### Test Structure
- Spawn `node dist/mcp/server.js` as subprocess
- Create MCP Client with stdio transport
- Connect to server
- Call list_pages tool
- Call read_page tool with n=100, format=json or text
- Verify response structure
- Kill subprocess

### Validation
- list_pages returns array with at least [{ n: 100, title: 'INDEX' }]
- read_page returns valid page data
- format text produces 25 lines of 40 chars each

## 6. Encoder for "text" Format (src/encode/json.ts or new)

New function `encodeText(page: Page): string`
- 25 lines separated by newline
- Each line: 40 characters from page.grid row, control codes stripped
- Plain ASCII (no ANSI codes)
- Used by MCP "text" format for agent readability
