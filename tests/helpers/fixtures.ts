import { makePage } from '../../src/engine/page.js';
import * as codes from '../../src/engine/codes.js';
import { writeText, writeHeader } from '../../src/engine/helpers.js';

export function createSimplePage(): ReturnType<typeof makePage> {
  const page = makePage(100, 'TEST PAGE');

  writeHeader(page, new Date(2026, 10, 1, 6, 0, 0)); // Nov 1, 2026 06:00

  // Write some text with colour
  writeText(page, 2, 2, 'This is RED text', codes.RED);
  writeText(page, 3, 2, 'This is GREEN text', codes.GREEN);
  writeText(page, 4, 2, 'This is YELLOW text', codes.YELLOW);
  writeText(page, 5, 2, 'This is CYAN text', codes.CYAN);

  // Write flash text
  writeText(page, 7, 2, 'FLASH: ', undefined);
  page.grid[7][9] = codes.FLASH;
  writeText(page, 7, 10, 'This flashes');

  // Write double-height at row 9, then ensure row 10 is blank
  page.grid[9][2] = codes.DOUBLE_HEIGHT;
  writeText(page, 9, 3, 'DOUBLE HEIGHT');
  for (let c = 0; c < 40; c++) {
    page.grid[10][c] = 0x20;
  }

  // Write conceal
  page.grid[12][2] = codes.CONCEAL;
  writeText(page, 12, 3, 'SECRET');

  // Set fastext links
  page.fastext.red = 100;
  page.fastext.green = 200;
  page.fastext.yellow = 300;
  page.fastext.cyan = 400;

  // Set source info
  page.source = 'test.example.com';
  page.fetchedAt = '2026-11-01T06:00:00Z';

  return page;
}
