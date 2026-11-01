import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP Server', () => {
  let process: ChildProcess;
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Create stdio transport
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/mcp/server.js'],
    });

    // Create client and connect
    client = new Client({
      name: 'cryptext-test-client',
      version: '1.0.0',
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    // Disconnect and close transport
    if (client) {
      await client.close();
    }
    if (transport) {
      await transport.close();
    }
  });

  it('should list available pages', async () => {
    const result = (await client.callTool({
      name: 'list_pages',
      arguments: {},
    })) as any;

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);

    // Parse the text response
    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();
    if (textContent && textContent.type === 'text') {
      const pages = JSON.parse(textContent.text);
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThan(0);

      // Check that page 100 (index) is in the list
      const page100 = pages.find((p: any) => p.n === 100);
      expect(page100).toBeDefined();
      expect(page100.title).toBe('Index');
    }
  });

  it('should read page 100 in text format', async () => {
    const result = (await client.callTool({
      name: 'read_page',
      arguments: {
        n: 100,
        format: 'text',
      },
    })) as any;

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();

    if (textContent && textContent.type === 'text') {
      const text = textContent.text;
      // Should be 25 lines
      const lines = text.split('\n');
      expect(lines.length).toBe(25);

      // Each line should be 40 characters (code points: mosaic sextants are astral Unicode characters)
      for (let i = 0; i < 25; i++) {
        expect([...lines[i]]).toHaveLength(40);
      }

      // First line (header) should contain page number
      expect(lines[0]).toContain('P100');
    }
  });

  it('should read page 100 in json format', async () => {
    const result = (await client.callTool({
      name: 'read_page',
      arguments: {
        n: 100,
        format: 'json',
      },
    })) as any;

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();

    if (textContent && textContent.type === 'text') {
      const json = JSON.parse(textContent.text);
      expect(json.pageNumber).toBe(100);
      expect(json.title).toBe('INDEX');
      expect(json.rows).toHaveLength(25);
    }
  });

  it('should read page 100 in ansi format', async () => {
    const result = (await client.callTool({
      name: 'read_page',
      arguments: {
        n: 100,
        format: 'ansi',
      },
    })) as any;

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();

    if (textContent && textContent.type === 'text') {
      const ansi = textContent.text;
      // Should contain ANSI escape codes
      expect(ansi).toContain('\x1b[');
    }
  });

  it('should read page 100 in tti format', async () => {
    const result = (await client.callTool({
      name: 'read_page',
      arguments: {
        n: 100,
        format: 'tti',
      },
    })) as any;

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();

    if (textContent && textContent.type === 'text') {
      const tti = textContent.text;
      expect(tti).toContain('DE,CRYPTEXT');
      expect(tti).toContain('PN,10000');
    }
  });

  it('should return error for unknown page', async () => {
    const result = (await client.callTool({
      name: 'read_page',
      arguments: {
        n: 999,
        format: 'json',
      },
    })) as any;

    expect(result).toBeDefined();
    expect(result.isError).toBe(true);
  });

  it('should use default format (json)', async () => {
    const result = (await client.callTool({
      name: 'read_page',
      arguments: {
        n: 100,
      },
    })) as any;

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();

    if (textContent && textContent.type === 'text') {
      // Should be valid JSON
      const json = JSON.parse(textContent.text);
      expect(json.pageNumber).toBe(100);
    }
  });
});
