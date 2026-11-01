# Layout Properties Testing

## Overview
Write comprehensive property-based and unit tests for the layout helper module (`src/engine/layout.ts`) to ensure all helpers correctly respect grid boundaries, character encoding constraints, and semantic requirements.

## EARS Requirements

### 1. Grid Boundary Safety
**GIVEN** any text string and any row/col position
**WHEN** calling put(), fit(), wrap(), or bitmap()
**THEN** no bytes are written outside the 40x25 grid

**GIVEN** any control codes or characters
**WHEN** writing to the grid via any layout helper
**THEN** only codes in the range 0x00-0x7F (7-bit) are written

### 2. ASCII Conversion
**GIVEN** any input string including emoji, accents, curly quotes, or dashes
**WHEN** calling ascii()
**THEN** output contains only characters in the range 0x20-0x7E (printable 7-bit ASCII)

**GIVEN** curly single quotes (U+2018, U+2019), double quotes (U+201C, U+201D), or dashes (U+2013, U+2014)
**WHEN** calling ascii()
**THEN** they are mapped to straight quotes (') and dash (-)

### 3. Mosaic Bitmap Integrity
**GIVEN** arbitrary pixel art as strings with '#' and other characters
**WHEN** calling bitmap()
**THEN** only sextant codes (0x20, 0x21-0x3F, 0x60-0x7F; never 0x40-0x5F) are written to grid cells

**GIVEN** any bitmap input
**WHEN** calling bitmap()
**THEN** a mosaic colour code is written at col, and sextant codes start at col+1

### 4. Horizontal Bar Fill
**GIVEN** frac in [0, 1] and width in [1, 40]
**WHEN** calling hbar()
**THEN** exactly round(frac*width*2) half-cells are filled

**GIVEN** frac outside [0, 1]
**WHEN** calling hbar()
**THEN** frac is clamped to [0, 1]

### 5. Sparkline Output
**GIVEN** any array of numeric values
**WHEN** calling spark() with constant values
**THEN** all cells on both rows contain identical sextant codes

**GIVEN** any array of numeric values resampled to width*2
**WHEN** calling spark()
**THEN** only sextant codes (0x20, 0x21-0x3F, 0x60-0x7F) are written

### 6. Banner Structure
**GIVEN** any banner on row r
**WHEN** built with banner()
**THEN** column 0 row r contains DOUBLE_HEIGHT (0x0d)

**GIVEN** any banner on row r
**WHEN** built with banner()
**THEN** row r+1 is entirely blank (all 0x20)

### 7. Page Layout Integrity
**GIVEN** every registered page built from recorded fixtures
**WHEN** rendering with current layout helpers
**THEN** no row with DOUBLE_HEIGHT is followed by a non-blank row

**GIVEN** every registered page
**WHEN** checking fastext links
**THEN** all fastext links point to registered pages

## Success Criteria
- All property tests pass with 100+ generated examples each
- All unit tests execute and pass
- No bugs found: 0 fixes needed to layout helpers
- Build and test suite complete with zero errors
