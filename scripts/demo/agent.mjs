// A minimal MCP client, the way an AI agent would use CRYPTEXT: list the pages, then read one as text.
//   node scripts/demo/agent.mjs [page]
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const n = Number(process.argv[2] || 500);
const transport = new StdioClientTransport({ command: "node", args: ["dist/mcp/server.js"], cwd: ROOT, stderr: "ignore" });
const client = new Client({ name: "demo-agent", version: "1.0.0" });
await client.connect(transport);
const tools = (await client.listTools()).tools.map((t) => t.name);
const list = JSON.parse((await client.callTool({ name: "list_pages", arguments: {} })).content[0].text);
const text = (await client.callTool({ name: "read_page", arguments: { n, format: "text" } })).content[0].text;
console.log(`\x1b[36mtools:\x1b[0m ${tools.join(", ")}`);
console.log(`\x1b[36mlist_pages:\x1b[0m ${list.length} pages (${list.slice(0, 6).map((p) => p.n).join(", ")}, ...)`);
console.log(`\x1b[36mread_page(${n}, "text"):\x1b[0m`);
console.log(text);
await client.close();
