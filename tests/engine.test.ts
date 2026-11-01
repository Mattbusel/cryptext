import { describe, it, expect } from 'vitest';
import { makePage } from '../src/engine/page.js';
import * as codes from '../src/engine/codes.js';
import { writeText, writePadded, writeHeader, writeInterrupted, writeSource } from '../src/engine/helpers.js';
import { sextantByte, mosaicBar } from '../src/engine/mosaic.js';

describe('Engine: page.ts', () => {
  it('makePage creates a 25x40 grid', () => {
    const page = makePage(100, 'Test');
    expect(page.grid).toHaveLength(25);
    for (let i = 0; i < 25; i++) {
      expect(page.grid[i]).toHaveLength(40);
    }
  });

  it('initializes all cells to 0x20 (space)', () => {
    const page = makePage(100, 'Test');
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 40; c++) {
        expect(page.grid[r][c]).toBe(0x20);
      }
    }
  });
});

describe('Engine: helpers.ts - writeText', () => {
  it('writes text without overflow', () => {
    const page = makePage(100, 'Test');
    writeText(page, 1, 0, 'Hello');
    expect(String.fromCharCode(page.grid[1][0])).toBe('H');
    expect(String.fromCharCode(page.grid[1][1])).toBe('e');
    expect(String.fromCharCode(page.grid[1][2])).toBe('l');
    expect(String.fromCharCode(page.grid[1][3])).toBe('l');
    expect(String.fromCharCode(page.grid[1][4])).toBe('o');
  });

  it('clips text that would overflow column 39', () => {
    const page = makePage(100, 'Test');
    writeText(page, 1, 38, 'TOOLONG');
    expect(String.fromCharCode(page.grid[1][38])).toBe('T');
    expect(String.fromCharCode(page.grid[1][39])).toBe('O');
    expect(page.grid[1][40]).toBeUndefined();
  });

  it('does nothing for out-of-bounds row', () => {
    const page = makePage(100, 'Test');
    writeText(page, 25, 0, 'Test');
    expect(page.grid[0][0]).toBe(0x20);
  });
});

describe('Engine: helpers.ts - writePadded', () => {
  it('left-aligns text', () => {
    const page = makePage(100, 'Test');
    writePadded(page, 1, 0, 'Hi', 5, 'left');
    const text = String.fromCharCode(...page.grid[1].slice(0, 5));
    expect(text).toBe('Hi   ');
  });

  it('right-aligns text', () => {
    const page = makePage(100, 'Test');
    writePadded(page, 1, 0, 'Hi', 5, 'right');
    const text = String.fromCharCode(...page.grid[1].slice(0, 5));
    expect(text).toBe('   Hi');
  });

  it('center-aligns text', () => {
    const page = makePage(100, 'Test');
    writePadded(page, 1, 0, 'Hi', 5, 'center');
    const text = String.fromCharCode(...page.grid[1].slice(0, 5));
    expect(text).toMatch(/^\s*Hi\s*$/);
  });
});

describe('Engine: helpers.ts - writeHeader', () => {
  it('writes page number at column 0', () => {
    const page = makePage(100, 'Test');
    writeHeader(page, new Date(2026, 10, 1, 6, 0, 0));
    const pageNum = String.fromCharCode(...page.grid[0].slice(0, 4));
    expect(pageNum).toBe('P100');
  });

  it('includes CRYPTEXT text', () => {
    const page = makePage(100, 'Test');
    writeHeader(page, new Date(2026, 10, 1, 6, 0, 0));
    const cryptext = String.fromCharCode(...page.grid[0].slice(5, 13));
    expect(cryptext).toBe('CRYPTEXT');
  });

  it('includes title at correct position', () => {
    const page = makePage(100, 'TEST');
    writeHeader(page, new Date(2026, 10, 1, 6, 0, 0));
    const title = String.fromCharCode(...page.grid[0].slice(14, 24));
    expect(title).toContain('TEST');
  });

  it('includes time at the right', () => {
    const page = makePage(100, 'Test');
    writeHeader(page, new Date(2026, 10, 1, 6, 30, 0));
    const rightPart = String.fromCharCode(...page.grid[0].slice(25, 40));
    expect(rightPart).toContain('06:30');
  });

  it('formats date/time with timezone', () => {
    const page = makePage(100, 'Test');
    writeHeader(page, new Date(2026, 10, 1, 6, 30, 0));
    const rightPart = String.fromCharCode(...page.grid[0].slice(25, 40));
    // Should be in format "01 Nov 06:30" or similar with US Eastern time
    expect(rightPart).toMatch(/\d{2}\s+\w{3}\s+\d{2}:\d{2}/);
  });
});

describe('Engine: helpers.ts - writeInterrupted', () => {
  it('writes SERVICE INTERRUPTED panel', () => {
    const page = makePage(100, 'Test');
    writeInterrupted(page, 'test.api', 'Connection failed');
    const row10 = String.fromCharCode(...page.grid[10]);
    expect(row10).toContain('SERVICE INTERRUPTED');
  });

  it('sets red fastext link to 100', () => {
    const page = makePage(100, 'Test');
    writeInterrupted(page, 'test.api', 'Connection failed');
    expect(page.fastext.red).toBe(100);
  });
});

describe('Engine: codes.ts', () => {
  it('has correct alpha colour constants', () => {
    expect(codes.RED).toBe(0x01);
    expect(codes.GREEN).toBe(0x02);
    expect(codes.YELLOW).toBe(0x03);
    expect(codes.BLUE).toBe(0x04);
    expect(codes.MAGENTA).toBe(0x05);
    expect(codes.CYAN).toBe(0x06);
    expect(codes.WHITE).toBe(0x07);
  });

  it('has correct mosaic colour constants', () => {
    expect(codes.MOSAIC_RED).toBe(0x11);
    expect(codes.MOSAIC_GREEN).toBe(0x12);
    expect(codes.MOSAIC_CYAN).toBe(0x16);
  });

  it('has correct other attributes', () => {
    expect(codes.FLASH).toBe(0x08);
    expect(codes.STEADY).toBe(0x09);
    expect(codes.DOUBLE_HEIGHT).toBe(0x0d);
    expect(codes.CONCEAL).toBe(0x18);
  });

  it('WHITE RGB is [255, 255, 255]', () => {
    expect(codes.COLOUR_RGB[codes.WHITE]).toEqual([255, 255, 255]);
  });

  it('RED RGB is [255, 0, 0]', () => {
    expect(codes.COLOUR_RGB[codes.RED]).toEqual([255, 0, 0]);
  });
});

describe('Engine: mosaic.ts - sextantByte', () => {
  it('creates empty byte when all false', () => {
    const byte = sextantByte(false, false, false, false, false, false);
    expect(byte).toBe(0x20); // Only bit 5
  });

  it('creates full byte when all true', () => {
    const byte = sextantByte(true, true, true, true, true, true);
    expect(byte).toBe(0x7f); // All bits set
  });

  it('sets correct bit for top-left only', () => {
    const byte = sextantByte(true, false, false, false, false, false);
    expect(byte).toBe(0x21); // Bit 0 + bit 5
  });

  it('sets correct bit for bot-left only', () => {
    const byte = sextantByte(false, false, false, false, true, false);
    expect(byte).toBe(0x30); // Bit 4 + bit 5
  });
});

describe('Engine: mosaic.ts - mosaicBar', () => {
  it('writes empty for height 0', () => {
    const page = makePage(100, 'Test');
    mosaicBar(page, 5, 10, 0, 0);
    expect(page.grid[5][10]).toBe(0x20);
  });

  it('clips writes outside bounds', () => {
    const page = makePage(100, 'Test');
    mosaicBar(page, 25, 10, 3, 0);
    // Should not throw and should not modify page
    expect(page.grid[0][0]).toBe(0x20);
  });
});

describe('Engine: double-height enforcement', () => {
  it('blanks row n+1 after DOUBLE_HEIGHT on row n', () => {
    const page = makePage(100, 'Test');
    page.grid[5][2] = codes.DOUBLE_HEIGHT;
    writeText(page, 5, 3, 'BIG');

    // Row 6 should be blank
    for (let c = 0; c < 40; c++) {
      expect(page.grid[6][c]).toBe(0x20);
    }
  });
});
