import { describe, it, expect, beforeEach } from 'vitest';
import { initializePages, lookupPage } from '../src/registry.js';
import { FeedResult } from '../src/feeds/_cache.js';

describe('Page Rendering Tests', () => {
  beforeEach(async () => {
    await initializePages();
  });

  // Helper to create mock feed results
  function createFeedResult<T>(ok: boolean, data?: T, error?: string): FeedResult<T> {
    if (ok) {
      return {
        ok: true,
        data: data as T,
        fetchedAt: new Date().toISOString(),
        source: 'test-fixture',
      };
    } else {
      return {
        ok: false,
        error: error || 'Test error',
        source: 'test-fixture',
      };
    }
  }

  describe('Page registration and basic rendering', () => {
    it('all expected pages are registered', () => {
      const expectedPages = [
        100, 101, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209,
        300, 301, 302, 400, 401, 500, 501, 502, 503, 600, 601,
        700, 701, 800, 801, 666,
      ];

      for (const num of expectedPages) {
        const entry = lookupPage(num);
        expect(entry, `Page ${num} should be registered`).toBeDefined();
        expect(entry?.title).toBeDefined();
        expect(entry?.fetch).toBeDefined();
        expect(entry?.build).toBeDefined();
      }
    });

    it('pages have valid grid dimensions (25x40)', () => {
      const now = new Date('2026-11-01T14:32:00Z');
      const pageNums = [100, 101, 666];

      for (const num of pageNums) {
        const entry = lookupPage(num);
        const page = entry?.build(createFeedResult(true, null), now);

        expect(page?.grid.length, `Page ${num} should have 25 rows`).toBe(25);
        for (let i = 0; i < 25; i++) {
          expect(page?.grid[i].length, `Page ${num} row ${i} should have 40 cols`).toBe(40);
        }
      }
    });

    it('pages have correct metadata', () => {
      const now = new Date('2026-11-01T14:32:00Z');
      const result = createFeedResult(true, null);

      const pageNums = [100, 101, 666];
      for (const num of pageNums) {
        const entry = lookupPage(num);
        const page = entry?.build(result, now);

        expect(page?.number).toBe(num);
        expect(page?.fastext).toBeDefined();
      }
    });

    it('pages with data-dependent fastext links render without crash', () => {
      const now = new Date('2026-11-01T14:32:00Z');
      const errorResult = createFeedResult(false, undefined, 'Test error');

      const pageNums = [200, 300, 400, 500, 600, 700, 800];

      for (const num of pageNums) {
        const entry = lookupPage(num);
        const page = entry?.build(errorResult, now);

        // Page should still be valid even when feed fails
        expect(page?.grid.length).toBe(25);
        expect(page?.number).toBe(num);
      }
    });

    it('fastext links are registered pages', () => {
      const now = new Date('2026-11-01T14:32:00Z');
      const result = createFeedResult(true, null);

      const linkChecks: Array<[number, 'red' | 'green' | 'yellow' | 'cyan']> = [
        [100, 'red'], [100, 'green'], [100, 'yellow'], [100, 'cyan'],
        [101, 'red'],
        [666, 'red'],
      ];

      for (const [pageNum, linkKey] of linkChecks) {
        const entry = lookupPage(pageNum);
        const page = entry?.build(result, now);

        const linkedPageNum = page?.fastext[linkKey];
        if (linkedPageNum !== undefined) {
          const linked = lookupPage(linkedPageNum);
          expect(linked, `Page ${pageNum} ${String(linkKey)} link (${linkedPageNum}) should exist`).toBeDefined();
        }
      }
    });
  });
});

