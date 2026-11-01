/**
 * MCP (Model Context Protocol) server for CRYPTEXT.
 * Provides tools: list_pages, read_page
 * Run: node dist/mcp/server.js
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { lookupPage, allPages, initializePages } from '../src/registry.js';
import { encodeJson } from '../src/encode/json.js';
import { encodeAnsi } from '../src/encode/ansi.js';
import { encodeTti } from '../src/encode/tti.js';

// Plain text for agents: 25 lines x 40 columns, attributes dropped, mosaics as Unicode sextants.
function encodeText(page: Parameters<typeof encodeAnsi>[0]): string {
  const text = encodeAnsi(page, true);
  return text.endsWith('\n') ? text.slice(0, -1) : text;
}

// Initialize pages before starting the server
await initializePages();

const server = new McpServer({
  name: 'cryptext',
  version: '1.0.0',
});

// Register list_pages tool
server.tool(
  'list_pages',
  'List all available CRYPTEXT pages',
  async () => {
    const pages = allPages();
    const pageList = pages.map((p) => ({
      n: p.n,
      title: p.title,
    }));
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(pageList, null, 2),
        },
      ],
    };
  }
);

// Register read_page tool
server.tool(
  'read_page',
  'Read a specific CRYPTEXT page in the requested format',
  {
    n: z.number().int().min(0).max(999).describe('Page number'),
    format: z.enum(['json', 'ansi', 'tti', 'text']).optional().default('json').describe('Output format'),
  },
  async (args: any) => {
    const n = args.n as number;
    const format = (args.format as string) || 'json';

    const entry = lookupPage(n);
    if (!entry) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Page ${n} not found` }),
          },
        ],
        isError: true,
      };
    }

    try {
      const feedResult = await entry.fetch();
      const page = entry.build(feedResult, new Date());

      let encoded: string;
      switch (format) {
        case 'json':
          encoded = encodeJson(page);
          break;
        case 'ansi':
          encoded = encodeAnsi(page);
          break;
        case 'tti':
          encoded = encodeTti(page);
          break;
        case 'text':
          encoded = encodeText(page);
          break;
        default:
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: 'Invalid format' }),
              },
            ],
            isError: true,
          };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: encoded,
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: msg }),
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('[CRYPTEXT MCP] Server started');

