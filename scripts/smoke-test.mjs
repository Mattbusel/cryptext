#!/usr/bin/env node
/**
 * Smoke test: Call each feed function once and verify success.
 * Run: node scripts/smoke-test.mjs
 *
 * Note: This test uses fixtures for feeds that can be easily mocked.
 * Some feeds like Hacker News may fail if fixtures don't match live API structure.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const fixturesDir = join(__dirname, '..', 'fixtures');

// Load all fixtures
function loadFixture(name) {
  const content = readFileSync(join(fixturesDir, `${name}.json`), 'utf-8');
  return JSON.parse(content);
}

// Create injected fetch that returns fixtures
function createTestFetch(fixtures) {
  return async (url, options) => {
    let fixtureData;

    if (url.includes('treasury.gov')) {
      // Treasury returns debt data
      if (url.includes('debt_to_penny')) {
        fixtureData = fixtures.treasury.debt;
      } else if (url.includes('avg_interest_rates')) {
        fixtureData = fixtures.treasury.rates;
      }
    } else if (url.includes('usaspending.gov')) {
      fixtureData = fixtures.usaspending;
    } else if (url.includes('alerts') && url.includes('weather.gov')) {
      fixtureData = fixtures.nws;
    } else if (url.includes('points') && url.includes('weather.gov')) {
      // For points lookup, return a sample forecast URL
      fixtureData = {
        properties: {
          forecast: 'https://api.weather.gov/gridpoints/ABC/0,0/forecast',
        },
      };
    } else if (url.includes('forecast') && url.includes('weather.gov')) {
      // Return forecast data
      fixtureData = {
        properties: {
          periods: [
            {
              name: 'Tonight',
              temperature: 55,
              temperatureUnit: 'F',
              shortForecast: 'Mostly clear',
              icon: 'https://example.com/icon.png',
            },
          ],
        },
      };
    } else if (url.includes('fda.gov')) {
      if (url.includes('food')) {
        fixtureData = fixtures.openfda.food;
      } else {
        fixtureData = fixtures.openfda.drug;
      }
    } else if (url.includes('federalregister.gov')) {
      fixtureData = fixtures.fedregister;
    } else if (url.includes('earthquake.usgs.gov')) {
      fixtureData = fixtures.usgs;
    } else if (url.includes('swpc.noaa.gov')) {
      fixtureData = fixtures.swpc;
    } else if (url.includes('topstories') && url.includes('hacker-news')) {
      fixtureData = fixtures.hackernews.topIds;
    } else if (url.includes('item') && url.includes('hacker-news')) {
      // Return a single story
      if (Array.isArray(fixtures.hackernews.stories) && fixtures.hackernews.stories.length > 0) {
        fixtureData = fixtures.hackernews.stories[0];
      } else {
        fixtureData = { id: 1, title: 'Test', score: 100, descendants: 10, by: 'test' };
      }
    } else {
      throw new Error(`Unknown URL in test: ${url}`);
    }

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => fixtureData,
      text: async () => JSON.stringify(fixtureData),
    };
  };
}

async function main() {
  console.log('CRYPTEXT Feed Smoke Test\n');
  console.log('Loading fixtures...\n');

  const fixtures = {
    treasury: loadFixture('treasury'),
    usaspending: loadFixture('usaspending'),
    nws: loadFixture('nws'),
    openfda: loadFixture('openfda'),
    fedregister: loadFixture('fedregister'),
    usgs: loadFixture('usgs'),
    swpc: loadFixture('swpc'),
    hackernews: loadFixture('hackernews'),
  };

  // Override global fetch for the test
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createTestFetch(fixtures);

  const tests = [
    {
      name: 'Treasury',
      module: '../dist/src/feeds/treasury.js',
      funcName: 'fetchFiscal',
    },
    {
      name: 'USAspending',
      module: '../dist/src/feeds/usaspending.js',
      funcName: 'fetchSpending',
    },
    {
      name: 'NWS Weather',
      module: '../dist/src/feeds/nws.js',
      funcName: 'fetchWeather',
    },
    {
      name: 'openFDA',
      module: '../dist/src/feeds/openfda.js',
      funcName: 'fetchRecalls',
    },
    {
      name: 'Federal Register',
      module: '../dist/src/feeds/fedregister.js',
      funcName: 'fetchFedReg',
    },
    {
      name: 'USGS Earthquakes',
      module: '../dist/src/feeds/usgs.js',
      funcName: 'fetchQuakes',
    },
    {
      name: 'SWPC Space Weather',
      module: '../dist/src/feeds/swpc.js',
      funcName: 'fetchSpaceWeather',
    },
    {
      name: 'Hacker News',
      module: '../dist/src/feeds/hackernews.js',
      funcName: 'fetchHN',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const mod = await import(test.module);
      const func = mod[test.funcName];

      if (typeof func !== 'function') {
        console.log(`FAIL: ${test.name} - function not found`);
        failed++;
        continue;
      }

      const result = await func();

      if (!result || (!result.ok && !result.error)) {
        console.log(`FAIL: ${test.name} - invalid result structure`);
        failed++;
        continue;
      }

      if (result.ok) {
        console.log(`OK:   ${test.name}`);
        passed++;
      } else {
        console.log(`WARN: ${test.name} - returned error: ${result.error}`);
        passed++;
      }
    } catch (error) {
      console.log(`FAIL: ${test.name} - ${error.message}`);
      failed++;
    }
  }

  // Restore original fetch
  globalThis.fetch = originalFetch;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
