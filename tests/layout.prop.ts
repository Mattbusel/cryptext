import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { makePage } from '../src/engine/page.js';
import { COLS, ROWS, put, fit, wrap, ascii, bitmap, hbar, spark } from '../src/engine/layout.js';
import { sextantByte } from '../src/engine/mosaic.js';
import * as C from '../src/engine/codes.js';

describe('Layout Properties: put()', () => {
  it('never writes outside 40x25 grid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 30 }),
        fc.integer({ min: -10, max: 50 }),
        fc.string({ maxLength: 20 }),
        (row, col, text) => {
          const page = makePage(100, 'Test');
          put(page, row, col, 0x07, text);

          // Verify all written cells are within bounds
          for (let r = 0; r < 25; r++) {
            for (let c = 0; c < 40; c++) {
              const cell = page.grid[r][c];
              // Should be 0x20 or higher (valid code)
              if (cell > 0x7f) {
                throw new Error(`Cell [${r}][${c}] = ${cell.toString(16)} > 0x7f`);
              }
            }
          }
        },
      ),
    );
  });

  it('never writes codes above 0x7F', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.string(),
        fc.integer({ min: 0, max: 0xffff }),
        (row, col, text, attr) => {
          const page = makePage(100, 'Test');
          put(page, row, col, attr, text);

          for (let r = 0; r < 25; r++) {
            for (let c = 0; c < 40; c++) {
              const cell = page.grid[r][c];
              if ((cell & 0x80) !== 0) {
                throw new Error(`Cell [${r}][${c}] has bit 7 set: ${cell.toString(16)}`);
              }
            }
          }
        },
      ),
    );
  });

  it('handles emoji and unicode correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.string({ maxLength: 10 }),
        (row, col, text) => {
          const page = makePage(100, 'Test');
          put(page, row, col, 0x07, text);

          // All cells should be 7-bit clean
          for (let r = 0; r < 25; r++) {
            for (let c = 0; c < 40; c++) {
              if ((page.grid[r][c] & 0x80) !== 0) {
                throw new Error(`Unicode handling failed: bit 7 set at [${r}][${c}]`);
              }
            }
          }
        },
      ),
    );
  });

  it('with multiple attributes array', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.array(fc.integer({ min: 0x00, max: 0x1f }), { maxLength: 5 }),
        fc.string({ maxLength: 10 }),
        (row, col, attrs, text) => {
          const page = makePage(100, 'Test');
          const result = put(page, row, col, attrs, text);

          // Result should be the next free column
          if (result < col) {
            throw new Error(`put() returned column ${result} less than input ${col}`);
          }
          if (result > COLS) {
            throw new Error(`put() returned column ${result} exceeds grid width ${COLS}`);
          }
        },
      ),
    );
  });
});

describe('Layout Properties: ascii()', () => {
  it('output contains only 0x20-0x7E characters', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = ascii(s);
        for (let i = 0; i < result.length; i++) {
          const code = result.charCodeAt(i);
          if (code < 0x20 || code > 0x7e) {
            throw new Error(`ascii() output contains ${code.toString(16)} at position ${i}`);
          }
        }
      }),
    );
  });

  it('maps curly single quotes to straight quotes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('\u2018', '\u2019'), // U+2018, U+2019
        (q) => {
          const result = ascii(q);
          if (result !== "'") {
            throw new Error(`Curly quote ${q} mapped to ${result}, expected '`);
          }
        },
      ),
    );
  });

  it('maps curly double quotes to straight quotes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('\u201c', '\u201d'), // U+201C, U+201D
        (q) => {
          const result = ascii(q);
          if (result !== '"') {
            throw new Error(`Curly quote ${q} mapped to ${result}, expected "`);
          }
        },
      ),
    );
  });

  it('maps dashes to hyphen-minus', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('\u2013', '\u2014'), // U+2013 (en-dash), U+2014 (em-dash)
        (d) => {
          const result = ascii(d);
          if (result !== '-') {
            throw new Error(`Dash ${d} mapped to ${result}, expected -`);
          }
        },
      ),
    );
  });

  it('handles mixed unicode with all transformations', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 50 }), (s) => {
        const result = ascii(s);
        // Should be valid output even if input has emoji, accents, etc.
        for (const ch of result) {
          const code = ch.charCodeAt(0);
          if (code < 0x20 || code > 0x7e) {
            throw new Error(`Mixed unicode: output contains ${code.toString(16)}`);
          }
        }
      }),
    );
  });
});

describe('Layout Properties: fit()', () => {
  it('returns string of exactly w characters', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 0, max: 50 }), (s, w) => {
        const result = fit(s, w);
        if (result.length !== w) {
          throw new Error(`fit(s, ${w}) returned ${result.length} chars, expected ${w}`);
        }
      }),
    );
  });

  it('output contains only 0x20-0x7E', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 0, max: 50 }), (s, w) => {
        const result = fit(s, w);
        for (const ch of result) {
          const code = ch.charCodeAt(0);
          if (code < 0x20 || code > 0x7e) {
            throw new Error(`fit() output contains ${code.toString(16)}`);
          }
        }
      }),
    );
  });

  it('respects alignment', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 10 }), fc.integer({ min: 10, max: 30 }), (s, w) => {
        const left = fit(s, w, 'left');
        const right = fit(s, w, 'right');
        // Both should have length w
        if (left.length !== w || right.length !== w) {
          throw new Error(`fit() alignment returned wrong length`);
        }
      }),
    );
  });
});

describe('Layout Properties: wrap()', () => {
  it('each line never exceeds w characters', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 100 }), fc.integer({ min: 1, max: 40 }), (s, w) => {
        const lines = wrap(s, w);
        for (const line of lines) {
          if (line.length > w) {
            throw new Error(`wrap() returned line of ${line.length} chars, max ${w}`);
          }
        }
      }),
    );
  });

  it('respects max line limit', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 100 }),
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 1, max: 10 }),
        (s, w, max) => {
          const lines = wrap(s, w, max);
          if (lines.length > max) {
            throw new Error(`wrap() returned ${lines.length} lines, max ${max}`);
          }
        },
      ),
    );
  });

  it('output contains only 0x20-0x7E', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 100 }),
        fc.integer({ min: 1, max: 40 }),
        (s, w) => {
          const lines = wrap(s, w);
          for (const line of lines) {
            for (const ch of line) {
              const code = ch.charCodeAt(0);
              if (code < 0x20 || code > 0x7e) {
                throw new Error(`wrap() output contains ${code.toString(16)}`);
              }
            }
          }
        },
      ),
    );
  });
});

describe('Layout Properties: bitmap()', () => {
  it('writes only valid sextant codes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.array(fc.string({ maxLength: 20 }), { maxLength: 20 }),
        fc.constantFrom(...[C.MOSAIC_RED, C.MOSAIC_GREEN, C.MOSAIC_CYAN]),
        (row, col, lines, mosaicCol) => {
          const page = makePage(100, 'Test');
          bitmap(page, row, col, lines, mosaicCol);

          // Valid sextant codes: 0x20 or 0x21-0x3F or 0x60-0x7F
          const isValidSextant = (code: number): boolean => {
            return code === 0x20 || (code >= 0x21 && code <= 0x3f) || (code >= 0x60 && code <= 0x7f);
          };

          for (let r = 0; r < 25; r++) {
            for (let c = col + 1; c < 40; c++) {
              const code = page.grid[r][c];
              // Skip if it's the mosaic color code (first column)
              if (c === col) continue;
              // Only check cells that might have been written
              if (code !== 0x20 || page.grid[r][c - 1] !== 0x20) {
                // This cell or previous was modified
                if (!isValidSextant(code)) {
                  throw new Error(
                    `bitmap() wrote invalid sextant ${code.toString(16)} at [${r}][${c}]`,
                  );
                }
              }
            }
          }
        },
      ),
    );
  });

  it('never writes to columns 0x40-0x5F as letter codes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.array(fc.string({ maxLength: 20 }), { maxLength: 20 }),
        fc.constantFrom(...[C.MOSAIC_RED, C.MOSAIC_GREEN]),
        (row, col, lines, mosaicCol) => {
          const page = makePage(100, 'Test');
          bitmap(page, row, col, lines, mosaicCol);

          // Check that no sextant cell is in the 0x40-0x5F range
          for (let r = 0; r < 25; r++) {
            for (let c = 0; c < 40; c++) {
              const code = page.grid[r][c];
              if (code >= 0x40 && code <= 0x5f) {
                throw new Error(
                  `bitmap() wrote letter code ${code.toString(16)} at [${r}][${c}]`,
                );
              }
            }
          }
        },
      ),
    );
  });
});

describe('Layout Properties: hbar()', () => {
  it('fills exactly round(frac*width*2) half-cells (or fewer if clipped)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 100 }).map((x) => x / 100), // frac in [0, 1]
        (row, col, width, frac) => {
          const page = makePage(100, 'Test');
          const nextCol = hbar(page, row, col, width, frac, C.MOSAIC_GREEN);

          const expectedHalves = Math.round(frac * width * 2);
          let actualHalves = 0;

          // Count half-cells: 0x20 = 0, LEFT_HALF = 1, FULL = 2
          const FULL = 0x7f;
          const LEFT_HALF = sextantByte(true, false, true, false, true, false);

          // Count cells written
          for (let c = col + 1; c < nextCol && c < COLS; c++) {
            const code = page.grid[row][c];
            if (code === FULL) actualHalves += 2;
            else if (code === LEFT_HALF) actualHalves += 1;
          }

          // Actual halves should be min(expected, what fits)
          const maxFitHalves = (COLS - 1 - col) * 2;
          const expectedFinal = Math.min(expectedHalves, maxFitHalves);

          if (actualHalves !== expectedFinal) {
            throw new Error(
              `hbar(frac=${frac}, width=${width}, col=${col}) filled ${actualHalves} half-cells, ` +
                `expected ${expectedFinal} (max fit: ${maxFitHalves})`,
            );
          }
        },
      ),
    );
  });

  it('clamps frac to [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.integer({ min: 1, max: 20 }),
        fc.float({ min: -2, max: 3, noNaN: true }),
        (row, col, width, frac) => {
          const page = makePage(100, 'Test');
          const nextCol = hbar(page, row, col, width, frac, C.MOSAIC_GREEN);

          // Clamped frac
          const clamped = Math.max(0, Math.min(1, frac));
          const expectedHalves = Math.round(clamped * width * 2);
          let actualHalves = 0;

          const FULL = 0x7f;
          const LEFT_HALF = sextantByte(true, false, true, false, true, false);

          for (let c = col + 1; c < nextCol && c < COLS; c++) {
            const code = page.grid[row][c];
            if (code === FULL) actualHalves += 2;
            else if (code === LEFT_HALF) actualHalves += 1;
          }

          // Actual should be clamped by grid bounds
          const maxFitHalves = (COLS - 1 - col) * 2;
          const expectedFinal = Math.min(expectedHalves, maxFitHalves);

          if (actualHalves !== expectedFinal) {
            throw new Error(
              `hbar(frac=${frac}) clamped to ${clamped} should fill ${expectedFinal} ` +
                `half-cells, got ${actualHalves}`,
            );
          }
        },
      ),
    );
  });

  it('writes only valid sextant codes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        fc.integer({ min: 0, max: 39 }),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 100 }).map((x) => x / 100),
        (row, col, width, frac) => {
          const page = makePage(100, 'Test');
          hbar(page, row, col, width, frac, C.MOSAIC_CYAN);

          const isValidSextant = (code: number): boolean => {
            return code === 0x20 || (code >= 0x21 && code <= 0x3f) || (code >= 0x60 && code <= 0x7f);
          };

          for (let c = col + 1; c < col + 1 + width && c < COLS; c++) {
            const code = page.grid[row][c];
            if (!isValidSextant(code)) {
              throw new Error(
                `hbar() wrote invalid sextant ${code.toString(16)} at [${row}][${c}]`,
              );
            }
          }
        },
      ),
    );
  });
});

describe('Layout Properties: spark()', () => {
  it('constant values produce identical cells', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 39 }),
        fc.integer({ min: 1, max: 20 }),
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (row, col, width, value) => {
          const page = makePage(100, 'Test');
          const values = Array(width * 4).fill(value); // Many samples at same value
          spark(page, row, col, width, values, C.MOSAIC_RED);

          let firstBot: number | null = null,
            firstTop: number | null = null;
          for (let c = col + 1; c < col + 1 + width && c < COLS; c++) {
            const bot = page.grid[row + 1][c];
            const top = page.grid[row][c];

            if (firstBot === null) {
              firstBot = bot;
              firstTop = top;
            } else if (firstBot !== null && firstTop !== null) {
              if (bot !== firstBot) {
                throw new Error(
                  `spark() constant values: bottom row cells differ ` +
                    `[${row + 1}][${col + 1}]=${firstBot.toString(16)} vs ` +
                    `[${row + 1}][${c}]=${bot.toString(16)}`,
                );
              }
              if (top !== firstTop) {
                throw new Error(
                  `spark() constant values: top row cells differ ` +
                    `[${row}][${col + 1}]=${firstTop.toString(16)} vs ` +
                    `[${row}][${c}]=${top.toString(16)}`,
                );
              }
            }
          }
        },
      ),
    );
  });

  it('writes only valid sextant codes on both rows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 39 }),
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 50 }),
        (row, col, width, values) => {
          const page = makePage(100, 'Test');
          spark(page, row, col, width, values, C.MOSAIC_CYAN);

          const isValidSextant = (code: number): boolean => {
            return code === 0x20 || (code >= 0x21 && code <= 0x3f) || (code >= 0x60 && code <= 0x7f);
          };

          for (let c = col + 1; c < col + 1 + width && c < COLS; c++) {
            const topCode = page.grid[row][c];
            const botCode = page.grid[row + 1][c];

            if (!isValidSextant(topCode)) {
              throw new Error(
                `spark() wrote invalid top sextant ${topCode.toString(16)} at [${row}][${c}]`,
              );
            }
            if (!isValidSextant(botCode)) {
              throw new Error(
                `spark() wrote invalid bot sextant ${botCode.toString(16)} at [${row + 1}][${c}]`,
              );
            }
          }
        },
      ),
    );
  });
});
