# Live Feed Fixes

## Bug 1: Treasury and USAspending fixtures contain invented mock data

**Current Behavior:** `fixtures/treasury.json` and `fixtures/usaspending.json` contain static placeholder numbers, not recorded API responses.

**Expected Behavior:** All fixtures contain real API responses recorded from live endpoints. The product rule states "no mock data, ever."

**Unchanged Behavior:** Page builders and feed modules remain unchanged; only the fixture data is replaced with real recordings.

**Impact:** Violates product principle of using only real data. Tests run against invented data instead of real API schemas.

---

## Bug 2: Treasury feed returns HTTP 404

**Current Behavior:** The current Treasury endpoint returns 404 errors.

**Expected Behavior:** Treasury feed queries two working endpoints:
- Debt tracker: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=30` (fields: record_date, debt_held_public_amt, intragov_hold_amt, tot_pub_debt_out_amt; use 30 days for sparkline)
- Interest rates: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=20` (fields: record_date, security_type_desc, security_desc, avg_interest_rate_amt; keep latest record_date only)

**Unchanged Behavior:** Treasury page builder logic remains the same; only the feed data source changes.

**Impact:** Treasury data currently unavailable to pages.

---

## Bug 3: USAspending feed returns HTTP 404

**Current Behavior:** USAspending endpoint returns 404 errors.

**Expected Behavior:** USAspending feed uses POST endpoint `https://api.usaspending.gov/api/v2/search/spending_by_transaction/` with JSON body:
```json
{
  "filters": {
    "award_type_codes": ["A","B","C","D"],
    "time_period": [{"start_date": "<today-10d>", "end_date": "<today>"}]
  },
  "fields": ["Award ID", "Recipient Name", "Transaction Amount", "Action Date", "Awarding Agency", "Transaction Description"],
  "sort": "Transaction Amount",
  "order": "desc",
  "limit": 10
}
```

**Unchanged Behavior:** USAspending page builder logic remains the same; only feed implementation changes.

**Impact:** USAspending data currently unavailable to pages.

---

## Bug 4: NWS forecasts have null temps and empty forecast arrays

**Current Behavior:** National Weather Service feed passes gridY,gridX directly to points lookup; results show null temperatures and empty forecast arrays.

**Expected Behavior:** NWS feed must:
1. Call `https://api.weather.gov/points/{lat},{lon}` first to resolve forecast URL
2. Follow `properties.forecast` link
3. Read `periods[]` array from forecast response
4. Query these 8 cities with correct lat,lon:
   - New York: 40.7128,-74.0060
   - Los Angeles: 34.0522,-118.2437
   - Chicago: 41.8781,-87.6298
   - Houston: 29.7604,-95.3698
   - Phoenix: 33.4484,-112.0740
   - Denver: 39.7392,-104.9903
   - Seattle: 47.6062,-122.3321
   - Miami: 25.7617,-80.1918

For alerts: keep `/alerts/active` endpoint but add query params `?status=actual&message_type=alert` and map each alert to: event, areaDesc, severity, ends.

**Unchanged Behavior:** Weather page layout remains unchanged; data retrieval path is corrected.

**Impact:** Weather forecasts and alerts currently unavailable due to incorrect data retrieval.

---

## Bug 5: openFDA returns HTTP 500

**Current Behavior:** openFDA sort parameter format causes 500 errors.

**Expected Behavior:** Use sort parameter format `sort=field:direction`, e.g.:
- `https://api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=10`
- `https://api.fda.gov/drug/enforcement.json?sort=report_date:desc&limit=10`

**Unchanged Behavior:** Safety page logic remains unchanged; only feed query parameters change.

**Impact:** Food and drug safety recall data currently unavailable.

---

## Bug 6: Federal Register returns 0 documents on weekends

**Current Behavior:** Federal Register endpoint returns empty results on weekends (publication_date filtering).

**Expected Behavior:** Query the most recent publication date instead using endpoint:
`https://www.federalregister.gov/api/v1/documents.json?per_page=20&order=newest&fields[]=title&fields[]=type&fields[]=agencies&fields[]=publication_date&fields[]=document_number`

Display the most recent publication_date on the page.

**Unchanged Behavior:** Government page layout remains unchanged; only data retrieval logic changes.

**Impact:** Federal Register data unavailable on weekends.

---

## Bug 7: Feed tests missing

**Current Behavior:** Test suite has 53 engine/encoder tests but no feed tests. Feeds are untested.

**Expected Behavior:** Create `tests/feeds.test.ts` that:
1. Parses every recorded fixture through each corresponding feed
2. Uses an injected fetch implementation (no network calls)
3. Validates feed output matches FeedResult interface
4. Tests round-trip correctness of fixture data

**Unchanged Behavior:** Existing engine/encoder tests remain; only new feed tests are added.

**Impact:** Feed implementations have no test coverage.
