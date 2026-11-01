import { Page } from '../engine/page.js';
import { walkRow } from '../engine/helpers.js';
import { COLOUR_RGB, BLACK_BACKGROUND } from '../engine/codes.js';

/**
 * ANSI 24-bit colour rendering for terminals (`curl .../api/page?n=300&format=ansi`).
 * Foreground and background follow the Level 1 attribute state of every cell; mosaics become
 * Unicode 13 sextant characters (Symbols for Legacy Computing). With stripCodes the output is
 * plain text with the same 40x25 layout.
 */
export function encodeAnsi(page: Page, stripCodes?: boolean): string {
  let output = '';
  for (let rowIdx = 0; rowIdx < 25; rowIdx++) {
    const row = page.grid[rowIdx];
    const states = walkRow(row);
    let fg = -1, bg = -1, flash = false;
    for (let colIdx = 0; colIdx < 40; colIdx++) {
      const code = row[colIdx];
      const state = states[colIdx];
      if (!stripCodes) {
        if (state.fg !== fg) {
          const [r, g, b] = COLOUR_RGB[state.fg] ?? [255, 255, 255];
          output += `\x1b[38;2;${r};${g};${b}m`;
          fg = state.fg;
        }
        if (state.bg !== bg) {
          if (state.bg === BLACK_BACKGROUND || !COLOUR_RGB[state.bg]) output += '\x1b[48;2;0;0;0m';
          else { const [r, g, b] = COLOUR_RGB[state.bg]; output += `\x1b[48;2;${r};${g};${b}m`; }
          bg = state.bg;
        }
        if (state.flash !== flash) { output += state.flash ? '\x1b[5m' : '\x1b[25m'; flash = state.flash; }
      }
      let ch: string;
      if (code <= 0x1f) ch = ' ';
      else if (state.mosaic && !(code >= 0x40 && code <= 0x5f)) ch = sextantToUnicode(code);
      else ch = String.fromCharCode(code);
      output += state.conceal && !stripCodes ? ' ' : ch;
    }
    output += stripCodes ? '\n' : '\x1b[0m\n';
  }
  return output;
}

/** Teletext sextant byte -> Unicode sextant (U+1FB00 block), with the four shapes Unicode reuses elsewhere. */
export function sextantToUnicode(byte: number): string {
  const n =
    (byte & 0x01 ? 1 : 0) | (byte & 0x02 ? 2 : 0) | (byte & 0x04 ? 4 : 0) |
    (byte & 0x08 ? 8 : 0) | (byte & 0x10 ? 16 : 0) | (byte & 0x40 ? 32 : 0);
  if (n === 0) return ' ';
  if (n === 21) return '▌'; // left half block
  if (n === 42) return '▐'; // right half block
  if (n === 63) return '█'; // full block
  const offset = n - 1 - (n > 21 ? 1 : 0) - (n > 42 ? 1 : 0);
  return String.fromCodePoint(0x1fb00 + offset);
}
