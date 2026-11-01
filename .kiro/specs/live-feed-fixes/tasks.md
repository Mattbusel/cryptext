# Tasks: Live Feed Fixes

## T1: Fix Treasury feed - dual endpoints

- [x] Update src/feeds/treasury.ts to query debt_to_penny endpoint
- [x] Add interest_rates endpoint query
- [x] Parse and return combined data
- [x] Verify FeedResult interface compliance
- [x] Test with live API (curl)

## T2: Fix USAspending feed - POST endpoint

- [x] Update src/feeds/usaspending.ts to POST to spending_by_transaction
- [x] Compute date range (today-10d to today)
- [x] Build request body with correct filter structure
- [x] Parse response for top 10 transactions
- [x] Verify FeedResult interface compliance
- [x] Test with live API (curl)

## T3: Fix NWS feed - points lookup and forecast retrieval

- [x] Update src/feeds/nws.ts with city coordinates
- [x] Implement points/{lat},{lon} lookup flow
- [x] Follow properties.forecast link
- [x] Fetch forecast data from resolved URL
- [x] Parse periods[] array
- [x] Implement alerts lookup with status=actual&message_type=alert filters
- [x] Map alerts to event, areaDesc, severity, ends
- [x] Verify FeedResult interface compliance
- [x] Test with live API (curl)

## T4: Fix openFDA feed - sort parameter format

- [x] Update src/feeds/openfda.ts sort parameter to field:direction format
- [x] Apply to both food and drug enforcement endpoints
- [x] Verify 200 response (not 500)
- [x] Verify FeedResult interface compliance
- [x] Test with live API (curl)

## T5: Fix Federal Register feed - remove date filter

- [x] Update src/feeds/fedregister.ts to remove publication_date filter
- [x] Query using newest order parameter
- [x] Extract most recent publication_date from results
- [x] Return title, type, agencies, publication_date, document_number
- [x] Verify FeedResult interface compliance
- [x] Test with live API (curl)

## T6: Delete mock fixtures and re-record real data

- [x] Delete fixtures/treasury.json
- [x] Delete fixtures/usaspending.json
- [x] Update scripts/record-fixtures.mjs to record all eight feeds
- [x] Run scripts/record-fixtures.mjs to create real fixtures
- [x] Verify all fixture files exist and contain valid JSON
- [x] Verify no invented/placeholder data in any fixture

## T7: Write feed tests

- [x] Create tests/feeds.test.ts
- [x] Write test suite for each feed (8 total)
- [x] Implement injected fetch for fixture loading
- [x] Test: result.ok = true for valid fixtures
- [x] Test: result.data matches expected schema
- [x] Test: result.fetchedAt is set
- [x] Test: result.source is correct
- [x] Verify no network calls during tests
- [x] All tests pass

## T8: Build and verify

- [x] Run npm run build
- [x] Run npx vitest --run (all tests including new feeds.test.ts)
- [x] All tests pass
- [x] No TypeScript errors
- [x] No lint errors (if applicable)

## T9: Smoke test all feeds

- [x] Create and run smoke test that calls each feed function once
- [x] Verify each feed returns ok: true (or error details)
- [x] Print results for manual verification
- [x] All 8 feeds report successful retrieval

## T10: Final verification

- [x] No em dash characters (U+2014) in code/comments
- [x] No changes to page modules
- [x] No changes to public/ viewer
- [x] No git commit performed
- [x] Generate summary of all fixes and results

