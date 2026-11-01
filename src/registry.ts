/**
 * Registry: maps page numbers to feed and builder functions.
 */

import { Page } from './engine/page.js';
import { FeedResult } from './feeds/_cache.js';

export interface RegistryEntry {
  title: string;
  fetch: () => Promise<FeedResult<unknown>>;
  build: (data: FeedResult<unknown>, now: Date) => Page;
}

const registry = new Map<number, RegistryEntry>();

export function registerPage(
  number: number,
  entry: RegistryEntry
): void {
  registry.set(number, entry);
}

export function lookupPage(n: number): RegistryEntry | undefined {
  return registry.get(n);
}

export function allPages(): Array<{ n: number; title: string }> {
  return Array.from(registry.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([n, entry]) => ({ n, title: entry.title }));
}

// Initialize all pages (do this on module load via async import in main)
// Lazy-import pages to avoid circular dependency issues
let pagesInitialized = false;

export async function initializePages(): Promise<void> {
  if (pagesInitialized) return;
  pagesInitialized = true;

  // Each module registers its pages on import.
  await import('./pages/index.js'); // 100, 101, 666
  await import('./pages/weather.js'); // 200-209
  await import('./pages/quake.js'); // 300-302, 400-401
  await import('./pages/money.js'); // 500-503
  await import('./pages/govt.js'); // 600-601, 700-701, 800-801
}
