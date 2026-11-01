/**
 * Layout helpers used by every page: attribute runs, section banners, fastext row,
 * footer, mosaic bitmaps, horizontal bars and two-row sparklines.
 *
 * All helpers clip to the 40x25 grid and only ever write 7-bit codes.
 */
import { Page } from './page.js';
import * as C from './codes.js';
import { sextantByte } from './mosaic.js';

export const COLS = 40;
export const ROWS = 25;

/** Write control codes then text from (row, col). Returns the next free column. */
export function put(page: Page, row: number, col: number, attrs: number | number[], text = ''): number {
  if (row < 0 || row >= ROWS) return col;
  const codes = Array.isArray(attrs) ? attrs : [attrs];
  for (const a of codes) {
    if (col >= COLS) return col;
    page.grid[row][col++] = a & 0x7f;
  }
  for (const ch of text) {
    if (col >= COLS) return col;
    const code = ch.charCodeAt(0);
    page.grid[row][col++] = code >= 0x20 && code < 0x7f ? code : 0x3f;
  }
  return col;
}

/** Plain ASCII: strip accents and anything outside printable 7-bit range. */
export function ascii(s: string): string {
  return (s || '')
    .normalize('NFKD')
    .replace(COMBINING, '')
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-')
    .replace(/[^\x20-\x7e]/g, '');
}
const chars = (...codes: number[]) => new RegExp('[' + String.fromCharCode(...codes) + ']', 'g');
const COMBINING = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
const SINGLE_QUOTES = chars(0x2018, 0x2019);
const DOUBLE_QUOTES = chars(0x201c, 0x201d);
const DASHES = chars(0x2013, 0x2014);

/** Clip or pad to exactly w characters. */
export function fit(s: string, w: number, align: 'left' | 'right' = 'left'): string {
  const t = ascii(s);
  if (t.length >= w) return t.slice(0, w);
  return align === 'left' ? t.padEnd(w) : t.padStart(w);
}

/** Word-wrap to lines of at most w characters (max `max` lines). */
export function wrap(s: string, w: number, max = 2): string[] {
  const words = ascii(s).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    if (!cur) cur = word.slice(0, w);
    else if (cur.length + 1 + word.length <= w) cur += ' ' + word;
    else { lines.push(cur); cur = word.slice(0, w); if (lines.length === max) break; }
  }
  if (cur && lines.length < max) lines.push(cur);
  return lines;
}

/**
 * Classic section banner on rows `row` and `row+1`: a double-height title on a coloured band.
 * Row layout: [DOUBLE_HEIGHT][bg colour][NEW_BACKGROUND][fg colour] title...
 * The row below is left blank (it is covered by the double-height row).
 */
export function banner(page: Page, row: number, bg: number, fg: number, title: string, right = ''): void {
  const inner = COLS - 4;
  let text = ' ' + ascii(title);
  if (right) text = text.padEnd(inner - ascii(right).length - 1) + ascii(right) + ' ';
  put(page, row, 0, [C.DOUBLE_HEIGHT, bg, C.NEW_BACKGROUND, fg], fit(text, inner));
  for (let c = 0; c < COLS; c++) page.grid[row + 1][c] = 0x20;
}

/** Row 23: the four coloured fastext prompts. Labels are clipped to 9 characters each. */
export function fastextRow(page: Page, labels: [string, string, string, string]): void {
  const colours = [C.RED, C.GREEN, C.YELLOW, C.CYAN];
  for (let i = 0; i < 4; i++) put(page, 23, i * 10, colours[i], fit(labels[i], 9));
}

/** Eastern time HH:MM for a date. */
export function hhmmET(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(d).replace(/^24/, '00');
}

/** Row 24: data source in cyan, "upd HH:MM ET" in white at the right. */
export function footer(page: Page, source: string, fetchedAt?: string | Date): void {
  const when = fetchedAt ? hhmmET(new Date(fetchedAt)) : '';
  const right = when ? `upd ${when} ET` : '';
  const left = fit(source, COLS - 2 - right.length - 1);
  const col = put(page, 24, 0, C.CYAN, left);
  if (right) put(page, 24, col, C.WHITE, right);
}

/** Honest failure panel. */
export function interrupted(page: Page, source: string, error: string): void {
  put(page, 9, 0, [C.DOUBLE_HEIGHT, C.RED, C.NEW_BACKGROUND, C.WHITE], fit('  SERVICE INTERRUPTED', 36));
  for (let c = 0; c < COLS; c++) page.grid[10][c] = 0x20;
  put(page, 12, 0, C.WHITE, fit('The live feed did not answer:', 39));
  put(page, 13, 0, C.YELLOW, fit(source, 39));
  put(page, 14, 0, C.WHITE, fit(error, 39));
  put(page, 16, 0, C.CYAN, fit('No numbers are shown rather than old', 39));
  put(page, 17, 0, C.CYAN, fit('or invented ones. Try again shortly.', 39));
}

/**
 * Draw a bitmap with mosaic sextants. Each string is one pixel row; '#' is on.
 * Every cell covers 2x3 pixels. A mosaic colour code is placed at `col` and drawing starts at col+1.
 */
export function bitmap(page: Page, row: number, col: number, lines: string[], mosaicColour: number): void {
  const h = Math.ceil(lines.length / 3);
  const w = Math.ceil(Math.max(...lines.map((l) => l.length)) / 2);
  const px = (x: number, y: number) => (lines[y]?.[x] ?? ' ') === '#';
  for (let r = 0; r < h; r++) {
    const rr = row + r;
    if (rr < 0 || rr >= ROWS) continue;
    put(page, rr, col, mosaicColour);
    for (let c = 0; c < w; c++) {
      const cc = col + 1 + c;
      if (cc >= COLS) break;
      const x = c * 2, y = r * 3;
      page.grid[rr][cc] = sextantByte(px(x, y), px(x + 1, y), px(x, y + 1), px(x + 1, y + 1), px(x, y + 2), px(x + 1, y + 2));
    }
  }
}

const FULL = 0x7f;
const LEFT_HALF = sextantByte(true, false, true, false, true, false);

/** Horizontal bar: mosaic colour code at col, then `width` cells filled to `frac` (half-cell resolution). */
export function hbar(page: Page, row: number, col: number, width: number, frac: number, mosaicColour: number): number {
  const halves = Math.max(0, Math.min(width * 2, Math.round(frac * width * 2)));
  let c = put(page, row, col, mosaicColour);
  for (let i = 0; i < width && c < COLS; i++, c++) {
    const used = halves - i * 2;
    page.grid[row][c] = used >= 2 ? FULL : used === 1 ? LEFT_HALF : 0x20;
  }
  return c;
}

/**
 * Two-row sparkline (6 vertical levels, two samples per cell). `values` are resampled to width*2.
 * Writes a mosaic colour code at `col` on both rows, then `width` cells.
 */
export function spark(page: Page, row: number, col: number, width: number, values: number[], mosaicColour: number): void {
  if (!values.length) return;
  const n = width * 2;
  const samples: number[] = [];
  for (let i = 0; i < n; i++) samples.push(values[Math.min(values.length - 1, Math.floor((i * values.length) / n))]);
  const min = Math.min(...samples), max = Math.max(...samples);
  const lvl = samples.map((v) => (max === min ? 3 : 1 + Math.round(((v - min) / (max - min)) * 5)));
  put(page, row, col, mosaicColour);
  put(page, row + 1, col, mosaicColour);
  for (let c = 0; c < width; c++) {
    const a = lvl[c * 2], b = lvl[c * 2 + 1];
    // bottom row holds levels 1-3, top row levels 4-6; pixel rows inside a cell are top, middle, bottom
    const bot = (l: number, y: number) => l >= 3 - y;          // y: 0 top, 1 mid, 2 bottom
    const top = (l: number, y: number) => l - 3 >= 3 - y;
    const cc = col + 1 + c;
    if (cc >= COLS) break;
    page.grid[row + 1][cc] = sextantByte(bot(a, 0), bot(b, 0), bot(a, 1), bot(b, 1), bot(a, 2), bot(b, 2));
    page.grid[row][cc] = sextantByte(top(a, 0), top(b, 0), top(a, 1), top(b, 1), top(a, 2), top(b, 2));
  }
}

/** Money formatting for 40 columns. */
export function money(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
