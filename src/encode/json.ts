import { Page } from '../engine/page.js';
import { walkRow } from '../engine/helpers.js';
import { COLOUR_NAMES } from '../engine/codes.js';

export interface JsonCell {
  char: string;
  code: number;
  fg: string;
  bg: string;
  flash: boolean;
  conceal: boolean;
  doubleHeight: boolean;
  mosaic: boolean;
  sextantBits?: number;
}

export interface JsonRow {
  text: string;
  cells: JsonCell[];
}

export interface JsonPage {
  pageNumber: number;
  title: string;
  fetchedAt?: string;
  source?: string;
  rows: JsonRow[];
  fastextLinks: {
    red?: number;
    green?: number;
    yellow?: number;
    cyan?: number;
  };
}

export function encodeJson(page: Page): string {
  const rows: JsonRow[] = [];

  for (let rowIdx = 0; rowIdx < 25; rowIdx++) {
    const row = page.grid[rowIdx];
    const states = walkRow(row);

    const cells: JsonCell[] = [];
    let textLine = '';

    for (let colIdx = 0; colIdx < 40; colIdx++) {
      const code = row[colIdx];
      const state = states[colIdx];
      const isControl = code <= 0x1f;

      const fgName = COLOUR_NAMES[state.fg] || 'white';
      const bgName = COLOUR_NAMES[state.bg] || 'black';

      let char: string;
      if (isControl) {
        char = ' ';
        textLine += ' ';
      } else if (state.conceal) {
        char = ' ';
        textLine += ' ';
      } else {
        char = String.fromCharCode(code);
        textLine += char;
      }

      const cell: JsonCell = {
        char,
        code,
        fg: fgName,
        bg: bgName,
        flash: state.flash,
        conceal: state.conceal,
        doubleHeight: state.doubleHeight,
        mosaic: state.mosaic && !isControl,
      };

      if (cell.mosaic) {
        // Extract sextant bits
        cell.sextantBits =
          ((code & 0x01) ? 1 : 0) |
          ((code & 0x02) ? 2 : 0) |
          ((code & 0x04) ? 4 : 0) |
          ((code & 0x08) ? 8 : 0) |
          ((code & 0x10) ? 16 : 0) |
          ((code & 0x40) ? 32 : 0);
      }

      cells.push(cell);
    }

    rows.push({
      text: textLine,
      cells,
    });
  }

  const jsonPage: JsonPage = {
    pageNumber: page.number,
    title: page.title,
    fetchedAt: page.fetchedAt,
    source: page.source,
    rows,
    fastextLinks: page.fastext,
  };

  return JSON.stringify(jsonPage);
}
