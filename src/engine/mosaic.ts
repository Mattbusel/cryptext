import { Page } from './page.js';

// Encode a sextant pattern into a byte per ETS 300 706
// Bit 5 is always set (0x20) to keep codes >= 0x20
// Bit layout:
//   bit 0 = top-left     bit 1 = top-right
//   bit 2 = mid-left     bit 3 = mid-right
//   bit 4 = bot-left     bit 6 = bot-right
export function sextantByte(
  topLeft: boolean,
  topRight: boolean,
  midLeft: boolean,
  midRight: boolean,
  botLeft: boolean,
  botRight: boolean,
): number {
  let bits = 0;
  if (topLeft) bits |= 0x01;
  if (topRight) bits |= 0x02;
  if (midLeft) bits |= 0x04;
  if (midRight) bits |= 0x08;
  if (botLeft) bits |= 0x10;
  if (botRight) bits |= 0x40;
  return bits | 0x20; // Bit 5 always set
}

// Write a single-column mosaic bar of height h (0-6 sextant units)
// Height 0 = empty (0x20)
// Height 6 = full (0x7F)
export function mosaicBar(
  page: Page,
  row: number,
  col: number,
  height6: number,
  colourCode: number,
): void {
  if (row < 0 || row >= 25 || col < 0 || col >= 40) return;

  const h = Math.max(0, Math.min(6, height6));

  // Mosaic characters are 2 columns wide and 3 rows tall in Teletext
  // For a single column bar, we fill top to bottom
  // 0 = empty, 1 = bottom only, 2 = bottom+mid, 3 = all 3, ...
  // But we're in a single cell, so we use the 3-row pattern:
  // 0-2: bottom row filled
  // 2-4: bottom+middle rows filled
  // 4-6: all rows filled

  let byte = 0x20; // Empty by default

  if (h === 0) {
    byte = 0x20; // Empty (all bits 0)
  } else if (h === 1) {
    byte = sextantByte(false, false, false, false, true, true); // Bot only
  } else if (h === 2) {
    byte = sextantByte(false, false, true, true, true, true); // Mid + bot
  } else if (h === 3) {
    byte = sextantByte(false, false, true, true, true, true); // Mid + bot
  } else if (h === 4) {
    byte = sextantByte(false, false, true, true, true, true); // Mid + bot
  } else if (h === 5) {
    byte = sextantByte(true, true, true, true, true, true); // Top + mid + bot
  } else if (h === 6) {
    byte = sextantByte(true, true, true, true, true, true); // All filled
  }

  // If we have a colour code, write it first
  if (colourCode > 0) {
    page.grid[row][col] = colourCode & 0x7f;
    if (col + 1 < 40) {
      page.grid[row][col + 1] = byte;
    }
  } else {
    page.grid[row][col] = byte;
  }
}

// Write a sparkline across width columns
export function sparkline(
  page: Page,
  row: number,
  col: number,
  values: number[],
  width: number,
  colourCode: number,
): void {
  if (row < 0 || row >= 25 || values.length === 0 || width <= 0) return;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max === min ? 1 : max - min;

  for (let i = 0; i < width && i < values.length; i++) {
    const c = col + i;
    if (c >= 40) break;

    const normalized = (values[i] - min) / range;
    const height = Math.round(normalized * 6);

    if (colourCode > 0 && i === 0) {
      page.grid[row][c] = colourCode & 0x7f;
    } else {
      const h = Math.max(0, Math.min(6, height));
      let byte = 0x20;

      if (h === 0) {
        byte = 0x20;
      } else if (h === 1) {
        byte = sextantByte(false, false, false, false, true, true);
      } else if (h === 2) {
        byte = sextantByte(false, false, false, false, true, true);
      } else if (h === 3) {
        byte = sextantByte(false, false, true, true, true, true);
      } else if (h === 4) {
        byte = sextantByte(false, false, true, true, true, true);
      } else if (h === 5) {
        byte = sextantByte(true, true, true, true, true, true);
      } else if (h === 6) {
        byte = sextantByte(true, true, true, true, true, true);
      }

      page.grid[row][c] = byte;
    }
  }
}
