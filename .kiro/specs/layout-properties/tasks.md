# Layout Properties Tasks

## Implementation Tasks

- [x] Create tests/layout.prop.ts with fast-check property tests
  - [x] Property 1: put() grid boundary and code range
  - [x] Property 2: fit() grid boundary and character range
  - [x] Property 3: wrap() line length and max limit
  - [x] Property 4: ascii() output range 0x20-0x7E
  - [x] Property 5: ascii() quote and dash mapping
  - [x] Property 6: bitmap() sextant codes only
  - [x] Property 7: hbar() fill precision
  - [x] Property 8: hbar() clamping
  - [x] Property 9: spark() constant values
  - [x] Property 10: spark() sextant codes only

- [x] Create tests/layout.test.ts with unit tests
  - [x] Property 11: banner() double height
  - [x] Property 12: banner() blank row
  - [x] Property 13: page layout consistency (DOUBLE_HEIGHT rows)
  - [x] Property 14: fastext link validity

- [x] Run build
  - [x] Execute `npm run build`
  - [x] Verify no compilation errors

- [x] Run tests
  - [x] Execute `npx vitest --run`
  - [x] Verify all tests pass
  - [x] Note any failures and fix helpers (not tests)

- [x] Document results
  - [x] List each property and whether it found bugs
  - [x] Summary of changes made to helpers
