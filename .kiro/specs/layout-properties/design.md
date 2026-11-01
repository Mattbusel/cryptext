# Layout Properties Design

## Correctness Properties

### Property 1: put() Grid Boundary Safety
**Description:** put() never writes outside the 40x25 grid and never writes codes above 0x7F
**Implementation:** Test with arbitrary strings, emoji, accents, control codes, and row/col values outside valid range
**Verification:** Check grid dimensions after write, verify all written codes are <= 0x7F

### Property 2: fit() Grid Boundary Safety
**Description:** fit() returns a string of exactly w characters, clipped/padded appropriately
**Implementation:** Test with arbitrary strings and width values
**Verification:** Check output length equals w, verify all characters are 0x20-0x7E

### Property 3: wrap() Grid Boundary Safety
**Description:** wrap() returns lines that never exceed w characters and respects max line limit
**Implementation:** Test with arbitrary strings, widths, and max values
**Verification:** Check each line length <= w, check line count <= max

### Property 4: ascii() Output Range
**Description:** ascii() output contains only 0x20-0x7E characters
**Implementation:** Test with all Unicode ranges: emoji (U+1F000+), accents (U+0300-0x036F), curly quotes, dashes, CJK
**Verification:** Check all output characters are in range 0x20-0x7E

### Property 5: ascii() Quote Mapping
**Description:** Curly quotes and dashes are mapped correctly
**Implementation:** Test with U+2018, U+2019, U+201C, U+201D, U+2013, U+2014
**Verification:** Verify mapped to ', ", and - respectively

### Property 6: bitmap() Sextant Codes Only
**Description:** bitmap() writes only valid sextant codes (0x20, 0x21-0x3F, 0x60-0x7F)
**Implementation:** Test with arbitrary pixel art and boundaries
**Verification:** Check each cell code in [0x20] union [0x21-0x3F] union [0x60-0x7F]

### Property 7: hbar() Fill Precision
**Description:** hbar() fills exactly round(frac*width*2) half-cells
**Implementation:** Test with frac in [0, 1] and width in [1, 40]
**Verification:** Count filled half-cells: FULL=2, LEFT_HALF=1, 0x20=0

### Property 8: hbar() Clamping
**Description:** hbar() clamps frac to [0, 1]
**Implementation:** Test with frac < 0 and frac > 1
**Verification:** Check output is same as clamped frac in [0, 1]

### Property 9: spark() Constant Values
**Description:** spark() produces identical cells for constant input
**Implementation:** Test with constant value arrays
**Verification:** Check all cells on both rows are identical

### Property 10: spark() Sextant Codes Only
**Description:** spark() writes only valid sextant codes on both rows
**Implementation:** Test with arbitrary numeric arrays
**Verification:** Check each cell code in [0x20] union [0x21-0x3F] union [0x60-0x7F]

### Property 11: banner() Double Height
**Description:** banner() writes DOUBLE_HEIGHT (0x0d) in column 0
**Implementation:** Test with arbitrary titles and colors
**Verification:** Check page.grid[row][0] & 0x7f === 0x0d

### Property 12: banner() Blank Row
**Description:** banner() leaves row+1 entirely blank (all 0x20)
**Implementation:** Test with arbitrary titles
**Verification:** Check all cells in page.grid[row+1] are 0x20

### Property 13: Page Layout Consistency
**Description:** No DOUBLE_HEIGHT row is followed by a non-blank row in any registered page
**Implementation:** Build all registered pages with fixture data, scan each page
**Verification:** For each row with DOUBLE_HEIGHT, check row+1 is all 0x20

### Property 14: Fastext Link Validity
**Description:** All fastext links in pages point to registered pages
**Implementation:** Build all registered pages, check each fastext link
**Verification:** For each link, call lookupPage() and verify result is defined

## Test Organization

**tests/layout.prop.ts:** Property-based tests using fast-check
- Arbitrary strings: unicode, emoji, accents, special chars
- Arbitrary numbers: frac, width, values, row, col
- Grid boundary and code range validation

**tests/layout.test.ts:** Unit tests with specific examples
- Concrete scenarios: banners, sparklines, bitmaps
- Edge cases: empty strings, zero frac, boundary positions
- Fixture-based page integrity checks
