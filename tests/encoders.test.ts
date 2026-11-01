import { describe, it, expect } from 'vitest';
import { encodeHtml } from '../src/encode/html.js';
import { encodeAnsi } from '../src/encode/ansi.js';
import { encodeJson } from '../src/encode/json.js';
import { encodeTti, parseTti } from '../src/encode/tti.js';
import { createSimplePage } from './helpers/fixtures.js';

describe('Encoders: HTML', () => {
  it('produces valid HTML with colour classes', () => {
    const page = createSimplePage();
    const html = encodeHtml(page);
    expect(html).toContain('class="cryptext-page"');
    expect(html).toContain('fg-red');
    expect(html).toContain('fg-green');
    expect(html).toContain('fg-cyan');
  });

  it('includes flash class', () => {
    const page = createSimplePage();
    const html = encodeHtml(page);
    expect(html).toContain('flash');
  });

  it('includes conceal class', () => {
    const page = createSimplePage();
    const html = encodeHtml(page);
    expect(html).toContain('conceal');
  });

  it('marks double-height rows', () => {
    const page = createSimplePage();
    const html = encodeHtml(page);
    expect(html).toContain('dh-top');
    expect(html).toContain('dh-bottom');
  });
});

describe('Encoders: ANSI', () => {
  it('produces text with ANSI escape sequences', () => {
    const page = createSimplePage();
    const ansi = encodeAnsi(page);
    expect(ansi).toContain('\x1b[');
    expect(ansi).toContain('m');
  });

  it('includes 24-bit colour codes', () => {
    const page = createSimplePage();
    const ansi = encodeAnsi(page);
    expect(ansi).toContain('\x1b[38;2;');
  });

  it('includes red colour sequence', () => {
    const page = createSimplePage();
    const ansi = encodeAnsi(page);
    expect(ansi).toContain('\x1b[38;2;255;0;0m');
  });

  it('includes flash (blink) code', () => {
    const page = createSimplePage();
    const ansi = encodeAnsi(page);
    expect(ansi).toContain('\x1b[5m');
  });

  it('stripCodes produces plain text', () => {
    const page = createSimplePage();
    const plain = encodeAnsi(page, true);
    expect(plain).not.toContain('\x1b[');
    const lines = plain.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(24);
    expect(lines[0]).toHaveLength(40);
  });
});

describe('Encoders: JSON', () => {
  it('produces valid JSON', () => {
    const page = createSimplePage();
    const json = encodeJson(page);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('has correct structure', () => {
    const page = createSimplePage();
    const json = JSON.parse(encodeJson(page));
    expect(json.pageNumber).toBe(100);
    expect(json.title).toBe('TEST PAGE');
    expect(json.rows).toHaveLength(25);
    expect(json.rows[0].cells).toHaveLength(40);
  });

  it('includes colour information', () => {
    const page = createSimplePage();
    const json = JSON.parse(encodeJson(page));
    const hasColours = json.rows.some((row: any) => row.cells.some((cell: any) => cell.fg !== 'white'));
    expect(hasColours).toBe(true);
  });

  it('includes flash attribute', () => {
    const page = createSimplePage();
    const json = JSON.parse(encodeJson(page));
    const hasFlash = json.rows.some((row: any) => row.cells.some((cell: any) => cell.flash));
    expect(hasFlash).toBe(true);
  });

  it('includes conceal attribute', () => {
    const page = createSimplePage();
    const json = JSON.parse(encodeJson(page));
    const hasConceal = json.rows.some((row: any) => row.cells.some((cell: any) => cell.conceal));
    expect(hasConceal).toBe(true);
  });

  it('includes double-height attribute', () => {
    const page = createSimplePage();
    const json = JSON.parse(encodeJson(page));
    const hasDh = json.rows.some((row: any) => row.cells.some((cell: any) => cell.doubleHeight));
    expect(hasDh).toBe(true);
  });
});

describe('Encoders: TTI', () => {
  it('starts with DE,CRYPTEXT', () => {
    const page = createSimplePage();
    const tti = encodeTti(page);
    expect(tti).toContain('DE,CRYPTEXT');
  });

  it('includes PN (page number) line', () => {
    const page = createSimplePage();
    const tti = encodeTti(page);
    expect(tti).toContain('PN,10000');
  });

  it('includes OL lines for each row', () => {
    const page = createSimplePage();
    const tti = encodeTti(page);
    for (let i = 0; i < 25; i++) {
      expect(tti).toContain(`OL,${i},`);
    }
  });

  it('includes FL (fastext) line', () => {
    const page = createSimplePage();
    const tti = encodeTti(page);
    expect(tti).toContain('FL,');
  });

  it('encodes fastext links correctly', () => {
    const page = createSimplePage();
    const tti = encodeTti(page);
    expect(tti).toContain('FL,100,200,300,400,');
  });

  it('round-trip: encode then parse recovers grid', () => {
    const page = createSimplePage();
    const tti = encodeTti(page);
    const recovered = parseTti(tti);

    expect(recovered).toHaveLength(25);
    for (let r = 0; r < 25; r++) {
      expect(recovered[r]).toHaveLength(40);
      for (let c = 0; c < 40; c++) {
        expect(recovered[r][c]).toBe(page.grid[r][c]);
      }
    }
  });
});
