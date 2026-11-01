import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { makePage } from '../src/engine/page.js';
import { encodeHtml } from '../src/encode/html.js';
import { encodeAnsi } from '../src/encode/ansi.js';
import { encodeJson } from '../src/encode/json.js';
import { encodeTti, parseTti } from '../src/encode/tti.js';

describe('Property Tests: Encoder Safety', () => {
  it('HTML encoder does not throw on random valid pages', () => {
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
              page.grid[row][col] = code;
            }
          }

          const html = encodeHtml(page);
          if (typeof html !== 'string') {
            throw new Error('HTML encoder did not return a string');
          }
        },
      ),
    );
  });

  it('ANSI encoder does not throw on random valid pages', () => {
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
              page.grid[row][col] = code;
            }
          }

          const ansi = encodeAnsi(page);
          if (typeof ansi !== 'string') {
            throw new Error('ANSI encoder did not return a string');
          }
        },
      ),
    );
  });

  it('JSON encoder does not throw on random valid pages', () => {
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
              page.grid[row][col] = code;
            }
          }

          const json = encodeJson(page);
          if (typeof json !== 'string') {
            throw new Error('JSON encoder did not return a string');
          }
          JSON.parse(json); // Will throw if invalid
        },
      ),
    );
  });

  it('TTI encoder does not throw on random valid pages', () => {
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
              page.grid[row][col] = code;
            }
          }

          const tti = encodeTti(page);
          if (typeof tti !== 'string') {
            throw new Error('TTI encoder did not return a string');
          }
        },
      ),
    );
  });
});

describe('Property Tests: TTI Round-Trip', () => {
  it('TTI round-trip preserves grid exactly', () => {
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
              page.grid[row][col] = code;
            }
          }

          const tti = encodeTti(page);
          const recovered = parseTti(tti);

          for (let r = 0; r < 25; r++) {
            for (let c = 0; c < 40; c++) {
              if (recovered[r][c] !== page.grid[r][c]) {
                throw new Error(
                  `Round-trip mismatch at [${r}][${c}]: ${recovered[r][c]} !== ${page.grid[r][c]}`,
                );
              }
            }
          }
        },
      ),
    );
  });
});
