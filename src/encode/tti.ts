import { Page } from '../engine/page.js';

export function encodeTti(page: Page): string {
  let tti = 'DE,CRYPTEXT\n';

  // Magazine and page number
  const mag = Math.floor(page.number / 100);
  const pgNum = page.number % 100;
  tti += `PN,${mag}${String(pgNum).padStart(2, '0')}00\n`;

  tti += 'SC,0000\n';
  tti += 'PS,8000\n';

  // Write each row
  for (let rowIdx = 0; rowIdx < 25; rowIdx++) {
    const row = page.grid[rowIdx];
    const escaped = escapeRowForTti(row);
    tti += `OL,${rowIdx},${escaped}\n`;
  }

  // Write fastext links
  const red = page.fastext.red || '000';
  const green = page.fastext.green || '000';
  const yellow = page.fastext.yellow || '000';
  const cyan = page.fastext.cyan || '000';
  tti += `FL,${String(red).padStart(3, '0')},${String(green).padStart(3, '0')},${String(yellow).padStart(3, '0')},${String(cyan).padStart(3, '0')},8ff,100\n`;

  return tti;
}

function escapeRowForTti(row: Uint8Array): string {
  let escaped = '';

  for (let i = 0; i < 40; i++) {
    const code = row[i];

    if (code < 0x20) {
      // Control code: escape as ESC (code + 0x40)
      escaped += String.fromCharCode(0x1b); // ESC
      escaped += String.fromCharCode(code + 0x40);
    } else if (code === 0x1b) {
      // ESC itself: encode as ESC followed by 0x5B ([)
      escaped += String.fromCharCode(0x1b); // ESC
      escaped += String.fromCharCode(0x5b); // [
    } else {
      escaped += String.fromCharCode(code);
    }
  }

  return escaped;
}

// Internal: round-trip parser for testing
export function parseTti(tti: string): Uint8Array[] {
  const grid: Uint8Array[] = [];

  const lines = tti.split('\n');
  for (const line of lines) {
    if (!line.startsWith('OL,')) continue;

    const parts = line.split(',', 2);
    if (parts.length < 2) continue;

    const content = line.substring(parts[0].length + 1 + parts[1].length + 1);
    const rowIdx = parseInt(parts[1]);

    if (rowIdx < 0 || rowIdx >= 25) continue;

    const row = new Uint8Array(40);
    let colIdx = 0;
    let i = 0;

    while (i < content.length && colIdx < 40) {
      const char = content.charCodeAt(i);

      if (char === 0x1b) {
        // Escape sequence
        i++;
        if (i < content.length) {
          const escaped = content.charCodeAt(i);
          if (escaped === 0x5b) {
            // ESC followed by [ means ESC itself
            row[colIdx] = 0x1b;
          } else {
            // ESC followed by (code + 0x40) means control code
            row[colIdx] = escaped - 0x40;
          }
          colIdx++;
          i++;
        }
      } else {
        row[colIdx] = char;
        colIdx++;
        i++;
      }
    }

    // Pad remainder with spaces
    while (colIdx < 40) {
      row[colIdx] = 0x20;
      colIdx++;
    }

    grid[rowIdx] = row;
  }

  // Ensure all 25 rows exist
  while (grid.length < 25) {
    const row = new Uint8Array(40);
    for (let i = 0; i < 40; i++) {
      row[i] = 0x20;
    }
    grid.push(row);
  }

  return grid;
}
