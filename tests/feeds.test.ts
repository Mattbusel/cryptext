import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');

// Load all fixture files
function loadFixture(name: string): unknown {
  const fixturesDir = join(__dirname, '..', 'fixtures');
  const content = readFileSync(join(fixturesDir, `${name}.json`), 'utf-8');
  return JSON.parse(content);
}

// Create injected fetch for testing
function createInjectedFetch(fixtures: Record<string, unknown>) {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    // For demonstration, return appropriate fixture based on URL pattern
    let fixtureData: unknown;

    if (url.includes('treasury.gov')) {
      fixtureData = fixtures.treasury;
    } else if (url.includes('usaspending.gov')) {
      fixtureData = fixtures.usaspending;
    } else if (url.includes('weather.gov')) {
      fixtureData = fixtures.nws;
    } else if (url.includes('fda.gov')) {
      fixtureData = fixtures.openfda;
    } else if (url.includes('federalregister.gov')) {
      fixtureData = fixtures.fedregister;
    } else if (url.includes('earthquake.usgs.gov')) {
      fixtureData = fixtures.usgs;
    } else if (url.includes('swpc.noaa.gov')) {
      fixtureData = fixtures.swpc;
    } else if (url.includes('hacker-news')) {
      fixtureData = fixtures.hackernews;
    } else {
      throw new Error(`Unknown fixture for URL: ${url}`);
    }

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => fixtureData,
      text: async () => JSON.stringify(fixtureData),
    } as unknown as Response;
  };
}

describe('Feed Tests', () => {
  let fixtures: Record<string, unknown>;

  beforeEach(() => {
    fixtures = {
      treasury: loadFixture('treasury'),
      usaspending: loadFixture('usaspending'),
      nws: loadFixture('nws'),
      openfda: loadFixture('openfda'),
      fedregister: loadFixture('fedregister'),
      usgs: loadFixture('usgs'),
      swpc: loadFixture('swpc'),
      hackernews: loadFixture('hackernews'),
    };
  });

  describe('Treasury Feed', () => {
    it('loads treasury fixture without error', () => {
      expect(fixtures.treasury).toBeDefined();
      expect(typeof fixtures.treasury).toBe('object');
    });

    it('fixture contains debt and rates data', () => {
      const data = fixtures.treasury as Record<string, unknown>;
      expect(data.debt).toBeDefined();
      expect(data.rates).toBeDefined();
    });

    it('debt data has expected structure', () => {
      const data = fixtures.treasury as Record<string, unknown>;
      const debt = data.debt as Record<string, unknown>;
      expect(debt.data).toBeDefined();
      expect(Array.isArray(debt.data)).toBe(true);
      if (Array.isArray(debt.data) && debt.data.length > 0) {
        const record = debt.data[0] as Record<string, unknown>;
        expect(record.record_date).toBeDefined();
        expect(record.tot_pub_debt_out_amt).toBeDefined();
      }
    });

    it('rates data has expected structure', () => {
      const data = fixtures.treasury as Record<string, unknown>;
      const rates = data.rates as Record<string, unknown>;
      expect(rates.data).toBeDefined();
      expect(Array.isArray(rates.data)).toBe(true);
      if (Array.isArray(rates.data) && rates.data.length > 0) {
        const record = rates.data[0] as Record<string, unknown>;
        expect(record.record_date).toBeDefined();
        expect(record.avg_interest_rate_amt).toBeDefined();
      }
    });
  });

  describe('USAspending Feed', () => {
    it('loads usaspending fixture without error', () => {
      expect(fixtures.usaspending).toBeDefined();
      expect(typeof fixtures.usaspending).toBe('object');
    });

    it('fixture contains results array', () => {
      const data = fixtures.usaspending as Record<string, unknown>;
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('results have expected transaction fields', () => {
      const data = fixtures.usaspending as Record<string, unknown>;
      if (Array.isArray(data.results) && data.results.length > 0) {
        const result = data.results[0] as Record<string, unknown>;
        expect(result['Award ID']).toBeDefined();
        expect(result['Recipient Name']).toBeDefined();
        expect(result['Transaction Amount']).toBeDefined();
        expect(result['Action Date']).toBeDefined();
        expect(result['Awarding Agency']).toBeDefined();
      }
    });
  });

  describe('NWS Feed', () => {
    it('loads nws fixture without error', () => {
      expect(fixtures.nws).toBeDefined();
      expect(typeof fixtures.nws).toBe('object');
    });

    it('fixture contains features array', () => {
      const data = fixtures.nws as Record<string, unknown>;
      expect(Array.isArray(data.features)).toBe(true);
    });

    it('features have alert properties', () => {
      const data = fixtures.nws as Record<string, unknown>;
      if (Array.isArray(data.features) && data.features.length > 0) {
        const feature = data.features[0] as Record<string, unknown>;
        const props = feature.properties as Record<string, unknown>;
        expect(props).toBeDefined();
      }
    });
  });

  describe('openFDA Feed', () => {
    it('loads openfda fixture without error', () => {
      expect(fixtures.openfda).toBeDefined();
      expect(typeof fixtures.openfda).toBe('object');
    });

    it('fixture contains food and drug data', () => {
      const data = fixtures.openfda as Record<string, unknown>;
      expect(data.food).toBeDefined();
      expect(data.drug).toBeDefined();
    });

    it('food data has expected structure', () => {
      const data = fixtures.openfda as Record<string, unknown>;
      const food = data.food as Record<string, unknown>;
      expect(Array.isArray(food.results)).toBe(true);
      if (Array.isArray(food.results) && food.results.length > 0) {
        const result = food.results[0] as Record<string, unknown>;
        expect(result.recall_number).toBeDefined();
        expect(result.product_description).toBeDefined();
      }
    });

    it('drug data has expected structure', () => {
      const data = fixtures.openfda as Record<string, unknown>;
      const drug = data.drug as Record<string, unknown>;
      expect(Array.isArray(drug.results)).toBe(true);
      if (Array.isArray(drug.results) && drug.results.length > 0) {
        const result = drug.results[0] as Record<string, unknown>;
        expect(result.recall_number).toBeDefined();
        expect(result.product_description).toBeDefined();
      }
    });
  });

  describe('Federal Register Feed', () => {
    it('loads fedregister fixture without error', () => {
      expect(fixtures.fedregister).toBeDefined();
      expect(typeof fixtures.fedregister).toBe('object');
    });

    it('fixture contains results array', () => {
      const data = fixtures.fedregister as Record<string, unknown>;
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('results have document fields', () => {
      const data = fixtures.fedregister as Record<string, unknown>;
      if (Array.isArray(data.results) && data.results.length > 0) {
        const result = data.results[0] as Record<string, unknown>;
        expect(result.title).toBeDefined();
        expect(result.type).toBeDefined();
        expect(result.publication_date).toBeDefined();
        expect(result.document_number).toBeDefined();
      }
    });
  });

  describe('USGS Feed', () => {
    it('loads usgs fixture without error', () => {
      expect(fixtures.usgs).toBeDefined();
      expect(typeof fixtures.usgs).toBe('object');
    });

    it('fixture is valid GeoJSON', () => {
      const data = fixtures.usgs as Record<string, unknown>;
      expect(data.type).toBeDefined();
      expect(data.features).toBeDefined();
      expect(Array.isArray(data.features)).toBe(true);
    });

    it('features have earthquake properties', () => {
      const data = fixtures.usgs as Record<string, unknown>;
      if (Array.isArray(data.features) && data.features.length > 0) {
        const feature = data.features[0] as Record<string, unknown>;
        const props = feature.properties as Record<string, unknown>;
        expect(props.mag).toBeDefined();
        expect(props.place).toBeDefined();
      }
    });
  });

  describe('SWPC Feed', () => {
    it('loads swpc fixture without error', () => {
      expect(fixtures.swpc).toBeDefined();
      expect(Array.isArray(fixtures.swpc)).toBe(true);
    });

    it('fixture is array with data records', () => {
      const data = fixtures.swpc as unknown[];
      expect(data.length).toBeGreaterThan(0);
      if (data.length > 0) {
        const record = data[0] as Record<string, unknown>;
        expect(record).toBeDefined();
      }
    });
  });

  describe('Hacker News Feed', () => {
    it('loads hackernews fixture without error', () => {
      expect(fixtures.hackernews).toBeDefined();
      expect(typeof fixtures.hackernews).toBe('object');
    });

    it('fixture contains topIds and stories', () => {
      const data = fixtures.hackernews as Record<string, unknown>;
      expect(Array.isArray(data.topIds)).toBe(true);
      expect(Array.isArray(data.stories)).toBe(true);
    });

    it('stories have item properties', () => {
      const data = fixtures.hackernews as Record<string, unknown>;
      if (Array.isArray(data.stories) && data.stories.length > 0) {
        const story = data.stories[0] as Record<string, unknown>;
        expect(story.title || story.text).toBeDefined();
      }
    });
  });
});
