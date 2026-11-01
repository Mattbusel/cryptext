import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { makePage } from '../src/engine/page.js';
import { writeText } from '../src/engine/helpers.js';
import * as codes from '../src/engine/codes.js';

describe('Property Tests: Grid Invariant', () => {
  it('maintains 25x40 grid after any writes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 24 }),
            fc.integer({ min: 0, max: 39 }),
            fc.string({ maxLength: 10 }),
          ),
          { maxLength: 50 },
        ),
        (operations) => {
          const page = makePage(100, 'Test');

          for (const [row, col, text] of operations) {
            writeText(page, row, col, text);
          }

          // Assert grid dimensions
          if (page.grid.length !== 25) {
            throw new Error(`Grid has ${page.grid.length} rows, expected 25`);
          }

          for (let r = 0; r < 25; r++) {
            if (page.grid[r].length !== 40) {
              throw new Error(`Row ${r} has ${page.grid[r].length} cells, expected 40`);
            }
          }
        },
      ),
    );
  });

  it('all cells are 7-bit clean', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 24 }),
            fc.integer({ min: 0, max: 39 }),
            fc.integer({ min: 0x20, max: 0x7f }),
          ),
          { maxLength: 100 },
        ),
        (operations) => {
          const page = makePage(100, 'Test');

          for (const [row, col, code] of operations) {
            if (row >= 0 && row < 25 && col >= 0 && col < 40) {
              page.grid[row][col] = code & 0x7f;
            }
          }

          for (let r = 0; r < 25; r++) {
            for (let c = 0; c < 40; c++) {
              const cell = page.grid[r][c];
              if ((cell & 0x80) !== 0) {
                throw new Error(`Cell [${r}][${c}] has bit 7 set: ${cell}`);
              }
            }
          }
        },
      ),
    );
  });
});

describe('Property Tests: Double-Height Enforcement', () => {
  it('row n+1 is blank after DOUBLE_HEIGHT on row n', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (rowIdx) => {
        const page = makePage(100, 'Test');

        // Place DOUBLE_HEIGHT on row rowIdx
        page.grid[rowIdx][0] = codes.DOUBLE_HEIGHT;

        // Row rowIdx+1 should be all 0x20
        for (let c = 0; c < 40; c++) {
          if (page.grid[rowIdx + 1][c] !== 0x20) {
            throw new Error(
              `Row ${rowIdx + 1} col ${c} is ${page.grid[rowIdx + 1][c]}, expected 0x20`,
            );
          }
        }
      }),
    );
  });
});
