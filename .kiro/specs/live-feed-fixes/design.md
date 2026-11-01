# Design: Live Feed Fixes

## Overview

Fix seven bugs in live data feed integration by updating endpoints, correcting request/response handling, and adding comprehensive test coverage. All changes maintain the existing page builder interfaces and the product principle of real-time data from keyless public APIs.

## Architecture

### 1. Treasury Feed (src/feeds/treasury.ts)

Currently queries a single 404 endpoint. Redesign to:

- Query Debt to Penny endpoint for historical debt data (30 days)
  - Parse: record_date, debt_held_public_amt, intragov_hold_amt, tot_pub_debt_out_amt
  - Use sparkline of tot_pub_debt_out_amt over 30 days
  
- Query Average Interest Rates endpoint for current rates
  - Parse: record_date, security_type_desc, security_desc, avg_interest_rate_amt
  - Keep latest record_date only (may have multiple securities)

- Both requests use same base URL: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/`
- Both use `sort=-record_date` and appropriate `page[size]` parameters
- Cache for 5 minutes per existing cache strategy

### 2. USAspending Feed (src/feeds/usaspending.ts)

Currently queries a single 404 endpoint. Redesign to:

- POST to `https://api.usaspending.gov/api/v2/search/spending_by_transaction/`
- Request body computes date range: today-10d to today
- Fields: Award ID, Recipient Name, Transaction Amount, Action Date, Awarding Agency, Transaction Description
- Sort by Transaction Amount descending, limit 10
- Parse response for top recent transactions
- Cache for 5 minutes per existing cache strategy

### 3. NWS Feed (src/feeds/nws.ts)

Currently calls points endpoint with grid coordinates; this is incorrect. Redesign to:

**Forecast Retrieval:**
- First call: `https://api.weather.gov/points/{lat},{lon}` with each city's actual coordinates
- Follow the `properties.forecast` link from response
- Second call: fetch forecast URL, parse `periods[]` array
- Extract: temperature, short_forecast, icon URL for each period
- Return latest 8 periods (current + next 8 periods typically)

**Alert Retrieval:**
- Call `https://api.weather.gov/alerts/active?status=actual&message_type=alert`
- Parse alert array, map each to: event, areaDesc, severity, ends
- Filter/organize by region if needed for page display

**City Data:**
Use hardcoded city coordinates:
```
New York: 40.7128,-74.0060
Los Angeles: 34.0522,-118.2437
Chicago: 41.8781,-87.6298
Houston: 29.7604,-95.3698
Phoenix: 33.4484,-112.0740
Denver: 39.7392,-104.9903
Seattle: 47.6062,-122.3321
Miami: 25.7617,-80.1918
```

- Cache city forecast for 5 minutes per existing cache strategy

### 4. openFDA Feed (src/feeds/openfda.ts)

Currently uses incorrect sort parameter format causing 500. Fix by:

- Change `sort` parameter from current format to `sort=report_date:desc` (field:direction)
- Update both endpoints:
  - Food: `https://api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=10`
  - Drug: `https://api.fda.gov/drug/enforcement.json?sort=report_date:desc&limit=10`
- Parse: report_date, product_description, reason_for_recall, voluntary_mandated, status
- Cache for 5 minutes per existing cache strategy

### 5. Federal Register Feed (src/feeds/fedregister.ts)

Currently filters by publication_date which fails on weekends. Redesign to:

- Remove publication date filter
- Query: `https://www.federalregister.gov/api/v1/documents.json?per_page=20&order=newest&fields[]=title&fields[]=type&fields[]=agencies&fields[]=publication_date&fields[]=document_number`
- Extract most recent publication_date from results
- Return: title, type, agencies, publication_date, document_number
- Page builder shows the most recent publication_date as "last updated" indicator
- Cache for 5 minutes per existing cache strategy

### 6. Fixture Recording

- Delete invented files: fixtures/treasury.json and fixtures/usaspending.json
- Update scripts/record-fixtures.mjs to call all eight feed endpoints
- Record real API responses for all feeds into fixture files
- Run on a weekday to get valid Federal Register data
- All fixtures contain real data, supporting the "no mock data, ever" rule

### 7. Feed Tests (tests/feeds.test.ts)

New test file validates all feeds:

- Import all feed modules (fetchX functions)
- For each fixture file, create a test suite
- Inject a custom fetch that returns fixture data from file
- Call corresponding feed function with injected fetch
- Assert: result.ok is true, result.data exists, result.fetchedAt is set, result.source is correct
- Assert: response schema matches expected FeedResult<T> interface
- No network calls during tests (all data from fixtures)

## Implementation Order

1. Fix Treasury feed (two endpoints)
2. Fix USAspending feed (POST endpoint with body)
3. Fix NWS feed (points lookup + forecast + alerts)
4. Fix openFDA feed (sort parameter)
5. Fix Federal Register feed (remove date filter)
6. Delete mock fixtures
7. Record real fixtures via scripts/record-fixtures.mjs
8. Write feeds.test.ts test suite
9. Build and run all tests
10. Smoke test all feed functions

## Dependencies and Constraints

- All endpoints are keyless, public, HTTPS
- Must send User-Agent header (existing pattern in _http.ts)
- Must cache for at least 5 minutes (existing pattern in _cache.ts)
- FeedResult interface unchanged: `{ ok, data, fetchedAt, source }` or `{ ok, error, source }`
- Page builders remain unchanged (pure functions receiving feed data)
- No new npm dependencies
- TypeScript strict mode
- Tests use vitest + fast-check (existing test setup)
