import { Page } from './page.js';
import * as codes from './codes.js';

export interface CellState {
  fg: number;
  bg: number;
  mosaic: boolean;
  flash: boolean;
  doubleHeight: boolean;
  conceal: boolean;
  holdMosaic: boolean;
  contiguous: boolean;
}

// Walk through a row and produce attribute state for each cell
export function walkRow(row: Uint8Array): CellState[] {
  const states: CellState[] = [];
  let state: CellState = {
    fg: codes.WHITE,
    bg: codes.BLACK_BACKGROUND,
    mosaic: false,
    flash: false,
    doubleHeight: false,
    conceal: false,
    holdMosaic: false,
    contiguous: true,
  };

  for (let i = 0; i < 40; i++) {
    const code = row[i];

    // Process control codes (0x00-0x1F)
    if (code <= 0x1f) {
      if (code >= 0x01 && code <= 0x07) {
        // Alpha colour codes
        state.fg = code;
        state.mosaic = false;
      } else if (code === codes.FLASH) {
        state.flash = true;
      } else if (code === codes.STEADY) {
        state.flash = false;
      } else if (code === codes.NORMAL_HEIGHT) {
        state.doubleHeight = false;
      } else if (code === codes.DOUBLE_HEIGHT) {
        state.doubleHeight = true;
      } else if (code >= 0x11 && code <= 0x17) {
        // Mosaic colour codes
        state.fg = code;
        state.mosaic = true;
      } else if (code === codes.CONCEAL) {
        state.conceal = true;
      } else if (code === codes.CONTIGUOUS_MOSAIC) {
        state.mosaic = true;
        state.contiguous = true;
      } else if (code === codes.SEPARATED_MOSAIC) {
        state.mosaic = true;
        state.contiguous = false;
      } else if (code === codes.BLACK_BACKGROUND) {
        state.bg = codes.BLACK_BACKGROUND;
      } else if (code === codes.NEW_BACKGROUND) {
        state.bg = state.fg;
      } else if (code === codes.HOLD_MOSAICS) {
        state.holdMosaic = true;
      } else if (code === codes.RELEASE_MOSAICS) {
        state.holdMosaic = false;
      }
    }

    states.push({ ...state });
  }

  return states;
}

// Write a string starting at (row, col); clips at col 39
export function writeText(
  page: Page,
  row: number,
  col: number,
  text: string,
  attrBefore?: number,
): void {
  if (row < 0 || row >= 25) return;

  if (attrBefore !== undefined && col < 40) {
    page.grid[row][col] = attrBefore & 0x7f;
    col++;
  }

  for (const char of text) {
    if (col >= 40) break;
    page.grid[row][col] = char.charCodeAt(0) & 0x7f;
    col++;
  }
}

// Write with padding/alignment
export function writePadded(
  page: Page,
  row: number,
  col: number,
  text: string,
  width: number,
  align: 'left' | 'right' | 'center',
  attrBefore?: number,
): void {
  if (row < 0 || row >= 25) return;

  let padded = text;

  if (align === 'left') {
    padded = text.padEnd(width, ' ').substring(0, width);
  } else if (align === 'right') {
    padded = text.padStart(width, ' ').substring(0, width);
  } else if (align === 'center') {
    const leftPad = Math.floor((width - text.length) / 2);
    const rightPad = width - text.length - leftPad;
    padded = ' '.repeat(Math.max(0, leftPad)) + text + ' '.repeat(Math.max(0, rightPad));
    padded = padded.substring(0, width);
  }

  writeText(page, row, col, padded, attrBefore);
}

// Write the standard header row
export function writeHeader(page: Page, now: Date): void {
  // Col 0-3: "P" + 3-digit page number
  const pageNumStr = 'P' + String(page.number).padStart(3, '0');
  writeText(page, 0, 0, pageNumStr);

  // Col 5-12: "CRYPTEXT" in white
  writeText(page, 0, 5, 'CRYPTEXT');

  // Col 13: cyan code
  if (page.grid[0][13] !== undefined) {
    page.grid[0][13] = codes.CYAN;
  }

  // Col 14-23: page title (max 10 chars)
  const title = page.title.substring(0, 10).padEnd(10, ' ');
  writeText(page, 0, 14, title);

  // Col 24: yellow code
  if (page.grid[0][24] !== undefined) {
    page.grid[0][24] = codes.YELLOW;
  }

  // Col 25-39: date/time formatted as "DD Mon HH:MM" (15 chars, right-aligned)
  // US Eastern timezone
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(now);
  const dayPart = parts.find((p) => p.type === 'day')?.value || '01';
  const monthPart = parts.find((p) => p.type === 'month')?.value || 'JAN';
  const hourPart = parts.find((p) => p.type === 'hour')?.value || '00';
  const minutePart = parts.find((p) => p.type === 'minute')?.value || '00';

  const dateTimeStr = `${dayPart} ${monthPart} ${hourPart}:${minutePart}`;
  // Right-align so it ends at col 39
  const startCol = 40 - dateTimeStr.length;
  writeText(page, 0, Math.max(25, startCol), dateTimeStr);
}

// Write the standard source footer on row 24
export function writeSource(page: Page, source: string): void {
  // Truncate source to fit before fastext squares (cols 0-35)
  const truncated = source.substring(0, 36);
  writeText(page, 24, 0, truncated, codes.CYAN);

  // Write fastext link squares at cols 36-39
  const links = page.fastext;
  const linkOrder: (keyof typeof links)[] = ['red', 'green', 'yellow', 'cyan'];
  let col = 36;

  for (const linkKey of linkOrder) {
    if (links[linkKey]) {
      page.grid[24][col] = 0x20; // Placeholder; actual rendering handled by encoders
    } else {
      page.grid[24][col] = 0x20;
    }
    col++;
  }
}

// Write SERVICE INTERRUPTED panel
export function writeInterrupted(page: Page, source: string, error: string): void {
  // Clear rows 10-15
  for (let r = 10; r <= 15; r++) {
    for (let c = 0; c < 40; c++) {
      page.grid[r][c] = 0x20;
    }
  }

  // Write panel header centered on row 10
  const title = 'SERVICE INTERRUPTED';
  const titleStart = Math.max(0, Math.floor((40 - title.length) / 2));
  writeText(page, 10, titleStart, title);

  // Write source name on row 12
  const sourceText = `Source: ${source}`.substring(0, 28);
  const sourceStart = Math.max(0, Math.floor((40 - sourceText.length) / 2));
  writeText(page, 12, sourceStart, sourceText);

  // Write error message on row 13
  const errorText = `Error: ${error}`.substring(0, 28);
  const errorStart = Math.max(0, Math.floor((40 - errorText.length) / 2));
  writeText(page, 13, errorStart, errorText);

  // Set fastext link to return to index
  page.fastext.red = 100;
}
