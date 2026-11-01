#!/usr/bin/env node
/**
 * Record live API responses to fixture files for offline testing.
 * Run: node scripts/record-fixtures.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '..', 'fixtures');

const USER_AGENT = 'CRYPTEXT/1.0 (teletext revival; github.com/Mattbusel/cryptext)';
const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    // Try to parse as JSON even if content-type doesn't say so
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function recordFixture(name, fetcher) {
  try {
    console.log(`Recording ${name}...`);
    const data = await fetcher();
    const filepath = path.join(fixturesDir, `${name}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`  OK: ${name} recorded`);
    return true;
  } catch (error) {
    console.error(`  ERROR: ${name} failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Recording CRYPTEXT API fixtures...\n');

  const results = {};

  // NWS Weather
  results.nws = await recordFixture('nws', async () => {
    return fetchWithTimeout(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert'
    );
  });

  // USGS Earthquakes
  results.usgs = await recordFixture('usgs', async () => {
    return fetchWithTimeout(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
    );
  });

  // SWPC Space Weather
  results.swpc = await recordFixture('swpc', async () => {
    return fetchWithTimeout(
      'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
    );
  });

  // Treasury Fiscal Data
  results.treasury = await recordFixture('treasury', async () => {
    const debt = await fetchWithTimeout(
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=30'
    );
    const rates = await fetchWithTimeout(
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=20'
    );
    return { debt, rates };
  });

  // USAspending
  results.usaspending = await recordFixture('usaspending', async () => {
    const today = new Date().toISOString().split('T')[0];
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    return fetchWithTimeout(
      'https://api.usaspending.gov/api/v2/search/spending_by_transaction/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            award_type_codes: ['A', 'B', 'C', 'D'],
            time_period: [{ start_date: tenDaysAgo, end_date: today }],
          },
          fields: [
            'Award ID',
            'Recipient Name',
            'Transaction Amount',
            'Action Date',
            'Awarding Agency',
            'Transaction Description',
          ],
          sort: 'Transaction Amount',
          order: 'desc',
          limit: 10,
        }),
      }
    );
  });

  // Federal Register
  results.fedregister = await recordFixture('fedregister', async () => {
    return fetchWithTimeout(
      'https://www.federalregister.gov/api/v1/documents.json?' +
        'per_page=20&order=newest&' +
        'fields[]=title&fields[]=type&fields[]=agencies&' +
        'fields[]=publication_date&fields[]=document_number'
    );
  });

  // openFDA
  results.openfda = await recordFixture('openfda', async () => {
    const food = await fetchWithTimeout(
      'https://api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=10'
    );
    const drug = await fetchWithTimeout(
      'https://api.fda.gov/drug/enforcement.json?sort=report_date:desc&limit=10'
    );
    return { food, drug };
  });

  // Hacker News
  results.hackernews = await recordFixture('hackernews', async () => {
    const topIds = await fetchWithTimeout(
      'https://hacker-news.firebaseio.com/v0/topstories.json'
    );
    const stories = [];
    const promises = topIds.slice(0, 20).map(async (id) => {
      try {
        const item = await fetchWithTimeout(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        stories.push(item);
      } catch {
        // Skip failed items
      }
    });
    await Promise.all(promises);
    return { topIds: topIds.slice(0, 20), stories };
  });

  console.log('\nSummary:');
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  console.log(`${passed}/${total} feeds recorded successfully`);

  if (passed < total) {
    process.exit(1);
  }
}

main();
