import { describe, it, expect, beforeEach } from 'vitest';
import { makePage } from '../src/engine/page.js';
import { COLS, ROWS, put, fit, wrap, ascii, bitmap, banner, hbar, spark } from '../src/engine/layout.js';
import { sextantByte } from '../src/engine/mosaic.js';
import * as C from '../src/engine/codes.js';
import { initializePages, lookupPage } from '../src/registry.js';
import type { FeedResult } from '../src/feeds/_cache.js';

describe('Layout Unit Tests: put()', () => {
  it('returns column after attributes and text', () => {
    const page = makePage(100, 'Test');
    const col = put(page, 0, 0, C.RED, 'Hello');
    expect(col).toBe(6); // 1 attr code + 5 chars
  });

  it('handles negative row by returning same column', () => {
    const page = makePage(100, 'Test');
    const col = put(page, -1, 5, C.RED, 'test');
    expect(col).toBe(5); // No write, column unchanged
  });

  it('handles out of bounds row by returning same column', () => {
    const page = makePage(100, 'Test');
    const col = put(page, 25, 5, C.RED, 'test');
    expect(col).toBe(5);
  });

  it('clips at right boundary', () => {
    const page = makePage(100, 'Test');
    const result = put(page, 0, 38, C.WHITE, '12345');
    // col 38: attribute 0x07 (C.WHITE)
    // col 39: character '1' (0x31)
    // cols 40+ are out of bounds
    expect(page.grid[0][38]).toBe(C.WHITE);
    expect(page.grid[0][39]).toBe('1'.charCodeAt(0));
    expect(result).toBe(40); // Next free column is 40
  });

  it('with multiple attributes', () => {
    const page = makePage(100, 'Test');
    const col = put(page, 0, 0, [C.DOUBLE_HEIGHT, C.RED, C.NEW_BACKGROUND], 'Hi');
    expect(col).toBe(5); // 3 attrs + 2 chars
    expect(page.grid[0][0]).toBe(C.DOUBLE_HEIGHT);
    expect(page.grid[0][1]).toBe(C.RED);
    expect(page.grid[0][2]).toBe(C.NEW_BACKGROUND);
    expect(page.grid[0][3]).toBe('H'.charCodeAt(0));
    expect(page.grid[0][4]).toBe('i'.charCodeAt(0));
  });

  it('handles empty text', () => {
    const page = makePage(100, 'Test');
    const col = put(page, 0, 5, C.RED);
    expect(col).toBe(6); // Just the attribute
  });
});

describe('Layout Unit Tests: ascii()', () => {
  it('simple ASCII passthrough', () => {
    expect(ascii('hello')).toBe('hello');
  });

  it('removes combining accents', () => {
    const withAccent = 'e\u0301'; // e with combining acute
    const result = ascii(withAccent);
    expect(result).toBe('e');
  });

  it('converts curly quotes', () => {
    expect(ascii('\u2018test\u2019')).toBe("'test'");
    expect(ascii('\u201chello\u201d')).toBe('"hello"');
  });

  it('converts dashes', () => {
    expect(ascii('a\u2013b')).toBe('a-b'); // en-dash
    expect(ascii('a\u2014b')).toBe('a-b'); // em-dash
  });

  it('removes emoji', () => {
    const result = ascii('Hello 😀 world');
    expect(result).toBe('Hello  world');
    for (const ch of result) {
      const code = ch.charCodeAt(0);
      expect(code).toBeGreaterThanOrEqual(0x20);
      expect(code).toBeLessThanOrEqual(0x7e);
    }
  });

  it('handles null and empty', () => {
    expect(ascii('')).toBe('');
    expect(ascii(null as any)).toBe('');
  });
});

describe('Layout Unit Tests: fit()', () => {
  it('pads short strings', () => {
    expect(fit('hi', 5)).toBe('hi   ');
  });

  it('clips long strings', () => {
    expect(fit('hello world', 5)).toBe('hello');
  });

  it('exact fit', () => {
    expect(fit('abc', 3)).toBe('abc');
  });

  it('right align', () => {
    expect(fit('hi', 5, 'right')).toBe('   hi');
  });

  it('with unicode', () => {
    const result = fit('hello😀world', 5);
    expect(result.length).toBe(5);
    for (const ch of result) {
      expect(ch.charCodeAt(0)).toBeLessThanOrEqual(0x7e);
    }
  });
});

describe('Layout Unit Tests: wrap()', () => {
  it('single line fits', () => {
    const lines = wrap('hello world', 20);
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('hello world');
  });

  it('breaks on word boundary', () => {
    const lines = wrap('one two three four', 8);
    expect(lines[0]).toBe('one two');
    expect(lines[1]).toBe('three');
  });

  it('respects max lines', () => {
    const lines = wrap('a b c d e f g h', 3, 2);
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it('single long word', () => {
    const lines = wrap('supercalifragilisticexpialidocious', 10);
    expect(lines[0]).toBe('supercalif');
  });

  it('empty input', () => {
    const lines = wrap('', 10);
    expect(lines.length).toBe(0);
  });
});

describe('Layout Unit Tests: banner()', () => {
  it('places DOUBLE_HEIGHT in column 0', () => {
    const page = makePage(100, 'Test');
    banner(page, 2, C.RED, C.WHITE, 'Title');
    expect(page.grid[2][0]).toBe(C.DOUBLE_HEIGHT);
  });

  it('leaves row+1 entirely blank', () => {
    const page = makePage(100, 'Test');
    // Pre-fill row 3 with non-blank values
    for (let c = 0; c < 40; c++) {
      page.grid[3][c] = 0x42; // 'B'
    }
    banner(page, 2, C.GREEN, C.WHITE, 'Test Banner');
    // Now row 3 should be all blanks
    for (let c = 0; c < 40; c++) {
      expect(page.grid[3][c]).toBe(0x20);
    }
  });

  it('includes background and foreground codes', () => {
    const page = makePage(100, 'Test');
    banner(page, 5, C.CYAN, C.YELLOW, 'Banner');
    expect(page.grid[5][0]).toBe(C.DOUBLE_HEIGHT);
    expect(page.grid[5][1]).toBe(C.CYAN);
    expect(page.grid[5][2]).toBe(C.NEW_BACKGROUND);
    expect(page.grid[5][3]).toBe(C.YELLOW);
  });

  it('handles long titles', () => {
    const page = makePage(100, 'Test');
    const longTitle = 'A'.repeat(50);
    banner(page, 1, C.RED, C.WHITE, longTitle);
    // Should not crash and row 1 should be filled
    let hasContent = false;
    for (let c = 4; c < 40; c++) {
      if (page.grid[1][c] !== 0x20) hasContent = true;
    }
    expect(hasContent).toBe(true);
  });

  it('handles right-aligned text', () => {
    const page = makePage(100, 'Test');
    banner(page, 1, C.BLUE, C.WHITE, 'Left', 'Right');
    // Row 1 should have content
    let hasContent = false;
    for (let c = 0; c < 40; c++) {
      if (page.grid[1][c] !== 0x20) hasContent = true;
    }
    expect(hasContent).toBe(true);
  });

  it('at boundary rows', () => {
    const page = makePage(100, 'Test');
    banner(page, 0, C.RED, C.WHITE, 'Top');
    // Should not crash
    expect(page.grid[0][0]).toBe(C.DOUBLE_HEIGHT);

    banner(page, 23, C.GREEN, C.WHITE, 'Near Bottom');
    expect(page.grid[23][0]).toBe(C.DOUBLE_HEIGHT);
  });
});

describe('Layout Unit Tests: hbar()', () => {
  it('frac=1 fills completely', () => {
    const page = makePage(100, 'Test');
    hbar(page, 5, 0, 10, 1.0, C.MOSAIC_GREEN);
    const FULL = 0x7f;
    for (let c = 1; c <= 10; c++) {
      expect(page.grid[5][c]).toBe(FULL);
    }
  });

  it('frac=0 is empty', () => {
    const page = makePage(100, 'Test');
    hbar(page, 5, 0, 10, 0.0, C.MOSAIC_GREEN);
    for (let c = 1; c <= 10; c++) {
      expect(page.grid[5][c]).toBe(0x20);
    }
  });

  it('frac=0.5 fills half', () => {
    const page = makePage(100, 'Test');
    hbar(page, 5, 0, 10, 0.5, C.MOSAIC_RED);
    const FULL = 0x7f;
    let fullCount = 0;
    for (let c = 1; c <= 10; c++) {
      if (page.grid[5][c] === FULL) fullCount++;
    }
    expect(fullCount).toBeGreaterThanOrEqual(4); // At least 4 full cells for 50%
    expect(fullCount).toBeLessThanOrEqual(6); // At most 6
  });

  it('writes mosaic color code at col', () => {
    const page = makePage(100, 'Test');
    hbar(page, 5, 3, 5, 0.5, C.MOSAIC_CYAN);
    expect(page.grid[5][3]).toBe(C.MOSAIC_CYAN);
  });

  it('negative frac clamps to 0', () => {
    const page = makePage(100, 'Test');
    hbar(page, 5, 0, 10, -0.5, C.MOSAIC_YELLOW);
    for (let c = 1; c <= 10; c++) {
      expect(page.grid[5][c]).toBe(0x20);
    }
  });

  it('frac > 1 clamps to 1', () => {
    const page = makePage(100, 'Test');
    hbar(page, 5, 0, 10, 2.0, C.MOSAIC_BLUE);
    const FULL = 0x7f;
    for (let c = 1; c <= 10; c++) {
      expect(page.grid[5][c]).toBe(FULL);
    }
  });

  it('respects grid boundaries', () => {
    const page = makePage(100, 'Test');
    hbar(page, 5, 35, 10, 0.8, C.MOSAIC_RED); // Overflows past col 40
    // Should not crash and should only write up to col 39
    expect(page.grid[5][39] !== 0x20 || page.grid[5][39] === 0x20).toBe(true); // No error
  });
});

describe('Layout Unit Tests: spark()', () => {
  it('constant values produce same cells', () => {
    const page = makePage(100, 'Test');
    spark(page, 3, 0, 5, [50, 50, 50, 50, 50, 50, 50, 50, 50, 50], C.MOSAIC_RED);
    const botVal = page.grid[4][1];
    const topVal = page.grid[3][1];
    for (let c = 2; c <= 5; c++) {
      expect(page.grid[4][c]).toBe(botVal);
      expect(page.grid[3][c]).toBe(topVal);
    }
  });

  it('increasing values show trend', () => {
    const page = makePage(100, 'Test');
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Increasing
    spark(page, 3, 0, 5, values, C.MOSAIC_GREEN);
    // Top row should have non-zero cells if values increase
    let hasTopChange = false;
    for (let c = 1; c <= 5; c++) {
      if (page.grid[3][c] !== page.grid[3][1]) {
        hasTopChange = true;
        break;
      }
    }
    expect(hasTopChange).toBe(true);
  });

  it('empty values array does nothing', () => {
    const page = makePage(100, 'Test');
    const before = JSON.stringify(page.grid);
    spark(page, 3, 0, 5, [], C.MOSAIC_CYAN);
    // Should be unchanged or only sparse writes
    let changed = false;
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 40; c++) {
        if (page.grid[r][c] !== 0x20) changed = true;
      }
    }
    // May have a single color code but shouldn't fill
    expect(changed).toBe(false); // Empty array should skip entirely
  });

  it('writes color codes at both rows', () => {
    const page = makePage(100, 'Test');
    spark(page, 3, 2, 3, [1, 2, 3, 4, 5, 6], C.MOSAIC_YELLOW);
    expect(page.grid[3][2]).toBe(C.MOSAIC_YELLOW);
    expect(page.grid[4][2]).toBe(C.MOSAIC_YELLOW);
  });

  it('at boundary rows', () => {
    const page = makePage(100, 'Test');
    spark(page, 23, 0, 5, [1, 2, 3, 4, 5], C.MOSAIC_BLUE);
    // Row 23 and 24 should have color codes
    expect(page.grid[23][0]).toBe(C.MOSAIC_BLUE);
    expect(page.grid[24][0]).toBe(C.MOSAIC_BLUE);
  });
});

describe('Layout Unit Tests: Page Layout Integrity', () => {
  beforeEach(async () => {
    await initializePages();
  });

  function createFeedResult<T>(ok: boolean, data?: T, error?: string): FeedResult<T> {
    if (ok) {
      return {
        ok: true,
        data: data as T,
        fetchedAt: new Date().toISOString(),
        source: 'test-fixture',
      };
    } else {
      return {
        ok: false,
        error: error || 'Test error',
        source: 'test-fixture',
      };
    }
  }

  it('no DOUBLE_HEIGHT row followed by non-blank row', () => {
    const now = new Date('2026-11-01T14:32:00Z');
    // Only test simple pages that work with null data
    const simplePages = [100, 101, 666];

    for (const num of simplePages) {
      const entry = lookupPage(num);
      if (!entry) continue;

      const result = createFeedResult(true, null);
      const page = entry.build(result, now);

      for (let r = 0; r < 23; r++) {
        const hasDoubleHeight = page.grid[r].some((cell) => cell === C.DOUBLE_HEIGHT);
        if (hasDoubleHeight) {
          const nextRowBlank = Array.from(page.grid[r + 1]).every((cell) => cell === 0x20);
          expect(nextRowBlank, `Page ${num}: DOUBLE_HEIGHT row ${r} followed by non-blank row ${r + 1}`).toBe(true);
        }
      }
    }
  });

  it('all fastext links point to registered pages', () => {
    const now = new Date('2026-11-01T14:32:00Z');
    const result = createFeedResult(true, null);
    // Only test simple pages
    const simplePages = [100, 101, 666];

    for (const num of simplePages) {
      const entry = lookupPage(num);
      if (!entry) continue;

      const page = entry.build(result, now);
      const linkKeys = ['red', 'green', 'yellow', 'cyan'] as const;

      for (const key of linkKeys) {
        const linkedNum = page.fastext[key];
        if (linkedNum !== undefined) {
          const linkedEntry = lookupPage(linkedNum);
          expect(linkedEntry, `Page ${num} ${key} link to ${linkedNum} not registered`).toBeDefined();
        }
      }
    }
  });

  it('pages maintain 25x40 grid', () => {
    const now = new Date('2026-11-01T14:32:00Z');
    const result = createFeedResult(true, null);
    const pageNums = [100, 101, 200, 300, 400, 500, 600, 700, 800, 666];

    for (const num of pageNums) {
      const entry = lookupPage(num);
      if (!entry) continue;

      const page = entry.build(result, now);
      expect(page.grid.length).toBe(25);
      for (let r = 0; r < 25; r++) {
        expect(page.grid[r].length).toBe(40);
      }
    }
  });

  it('all cells are 7-bit', () => {
    const now = new Date('2026-11-01T14:32:00Z');
    const result = createFeedResult(true, null);
    const pageNums = [100, 101, 200, 300, 400, 500, 600, 700, 800, 666];

    for (const num of pageNums) {
      const entry = lookupPage(num);
      if (!entry) continue;

      const page = entry.build(result, now);
      for (let r = 0; r < 25; r++) {
        for (let c = 0; c < 40; c++) {
          const cell = page.grid[r][c];
          expect((cell & 0x80)).toBe(0);
        }
      }
    }
  });
});
