/**
 * Page linter: validates all registered pages against recorded fixtures.
 */

import { lookupPage, allPages, initializePages } from './registry.js';

export async function lintAllPages(): Promise<string[]> {
  // Initialize pages first
  await initializePages();

  const errors: string[] = [];
  const pages = allPages();

  for (const { n, title } of pages) {
    const entry = lookupPage(n);
    if (!entry) {
      errors.push(`Page ${n} registered but not found in registry`);
      continue;
    }

    try {
      // Fetch data from the feed
      const feedResult = await entry.fetch();

      // Build the page
      const page = entry.build(feedResult, new Date());

      // Validate grid dimensions
      if (!page.grid || page.grid.length !== 25) {
        errors.push(`Page ${n}: grid height is ${page.grid?.length ?? 0}, expected 25`);
      }

      for (let i = 0; i < page.grid.length; i++) {
        if (page.grid[i].length !== 40) {
          errors.push(`Page ${n}: row ${i} width is ${page.grid[i].length}, expected 40`);
        }

        // Check for 7-bit clean cells
        for (let j = 0; j < page.grid[i].length; j++) {
          const cell = page.grid[i][j];
          if ((cell & 0x80) !== 0) {
            errors.push(`Page ${n}: cell [${i},${j}] is not 7-bit clean: 0x${cell.toString(16)}`);
          }
        }
      }

      // Check for source footer on row 24
      const row24 = page.grid[24];
      if (!row24 || row24.length === 0) {
        errors.push(`Page ${n}: missing footer on row 24`);
      }

      // Validate fastext links point to registered pages
      const validPages = new Set(pages.map((p) => p.n));
      if (page.fastext.red && !validPages.has(page.fastext.red)) {
        errors.push(`Page ${n}: red fastext link to unregistered page ${page.fastext.red}`);
      }
      if (page.fastext.green && !validPages.has(page.fastext.green)) {
        errors.push(`Page ${n}: green fastext link to unregistered page ${page.fastext.green}`);
      }
      if (page.fastext.yellow && !validPages.has(page.fastext.yellow)) {
        errors.push(`Page ${n}: yellow fastext link to unregistered page ${page.fastext.yellow}`);
      }
      if (page.fastext.cyan && !validPages.has(page.fastext.cyan)) {
        errors.push(`Page ${n}: cyan fastext link to unregistered page ${page.fastext.cyan}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Page ${n}: exception during linting: ${msg}`);
    }
  }

  return errors;
}
