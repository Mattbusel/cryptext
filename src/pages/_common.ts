/** Shared page scaffolding: header, banner, fastext, footer, and the honest failure path. */
import { makePage, Page } from '../engine/page.js';
import { writeHeader } from '../engine/helpers.js';
import { FeedResult } from '../feeds/_cache.js';
import { banner, fastextRow, footer, interrupted } from '../engine/layout.js';
import * as C from '../engine/codes.js';

export interface Section {
  bg: number;
  fg: number;
}

export const SECTION = {
  index: { bg: C.BLUE, fg: C.YELLOW },
  weather: { bg: C.CYAN, fg: C.BLUE },
  earth: { bg: C.RED, fg: C.YELLOW },
  space: { bg: C.MAGENTA, fg: C.WHITE },
  money: { bg: C.GREEN, fg: C.BLUE },
  govt: { bg: C.YELLOW, fg: C.BLUE },
  safety: { bg: C.RED, fg: C.WHITE },
  tech: { bg: C.BLUE, fg: C.CYAN },
} satisfies Record<string, Section>;

export interface Links {
  red?: [number, string];
  green?: [number, string];
  yellow?: [number, string];
  cyan?: [number, string];
}

/**
 * Build a page frame. Returns the page and the feed data (or null when the feed failed, in which
 * case the SERVICE INTERRUPTED panel is already drawn).
 */
export function frame<T>(
  n: number,
  title: string,
  section: Section,
  bannerText: string,
  links: Links,
  data: FeedResult<unknown>,
  now: Date,
  bannerRight = '',
): { page: Page; d: T | null } {
  const page = makePage(n, title);
  writeHeader(page, now);
  banner(page, 1, section.bg, section.fg, bannerText, bannerRight);
  const order = ['red', 'green', 'yellow', 'cyan'] as const;
  const labels = order.map((k) => (links[k] ? links[k]![1] : '')) as [string, string, string, string];
  for (const k of order) if (links[k]) page.fastext[k] = links[k]![0];
  fastextRow(page, labels);
  page.source = data.source;
  if (!data.ok) {
    interrupted(page, data.source, data.error);
    footer(page, data.source);
    return { page, d: null };
  }
  page.fetchedAt = data.fetchedAt;
  footer(page, data.source, data.fetchedAt);
  return { page, d: data.data as T };
}

/** Eastern date like "Oct 30". */
export function dateET(iso: string | number | Date): string {
  const d = new Date(typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00Z' : iso);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: '2-digit' }).format(d);
}
