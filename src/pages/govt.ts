/** Pages 600-601 (Federal Register), 700-701 (openFDA recalls), 800-801 (Hacker News). */
import { Page } from '../engine/page.js';
import * as C from '../engine/codes.js';
import { FeedResult } from '../feeds/_cache.js';
import { registerPage } from '../registry.js';
import { fetchFedReg, FedRegData } from '../feeds/fedregister.js';
import { fetchRecalls, RecallData, RecallItem } from '../feeds/openfda.js';
import { fetchHN, HNData } from '../feeds/hackernews.js';
import { put, fit, wrap, hbar } from '../engine/layout.js';
import { frame, SECTION, dateET } from './_common.js';

const TYPE: Record<string, [string, number]> = {
  'Rule': ['RULE', C.RED],
  'Proposed Rule': ['PROP', C.YELLOW],
  'Notice': ['NOTE', C.CYAN],
  'Presidential Document': ['PRES', C.MAGENTA],
};

function typeTag(t: string): [string, number] {
  return TYPE[t] ?? [t.slice(0, 4).toUpperCase(), C.WHITE];
}

function build600(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<FedRegData>(600, 'REGISTER', SECTION.govt, 'FEDERAL REGISTER', {
    red: [100, 'Index'], green: [601, 'Counts'], yellow: [502, 'Contracts'], cyan: [700, 'Recalls'],
  }, data, now);
  if (!d) return page;
  const date = d.mostRecentDate || d.documents[0]?.publicationDate || '';
  const docs = d.documents.filter((x) => !date || x.publicationDate === date).slice(0, 9);
  put(page, 3, 0, C.WHITE, fit(`Newest documents, issue of ${date ? dateET(date) : 'today'}`, 39));
  docs.forEach((doc, k) => {
    const row = 5 + k * 2;
    const [tag, colour] = typeTag(doc.type);
    put(page, row, 0, colour, fit(tag, 4));
    const lines = wrap(doc.title, 34, 2);
    put(page, row, 5, C.WHITE, fit(lines[0] ?? '', 34));
    put(page, row + 1, 5, C.WHITE, fit(lines[1] ?? '', 34));
  });
  return page;
}

function build601(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<FedRegData>(601, 'COUNTS', SECTION.govt, 'WHO IS WRITING RULES', {
    red: [600, 'Latest'], green: [100, 'Index'], yellow: [502, 'Contracts'], cyan: [700, 'Recalls'],
  }, data, now);
  if (!d) return page;
  const byType = new Map<string, number>();
  const byAgency = new Map<string, number>();
  for (const doc of d.documents) {
    byType.set(doc.type, (byType.get(doc.type) ?? 0) + 1);
    for (const a of doc.agencies.slice(0, 1)) byAgency.set(a, (byAgency.get(a) ?? 0) + 1);
  }
  put(page, 3, 0, C.WHITE, fit(`Across the ${d.documents.length} newest documents`, 39));
  put(page, 5, 0, C.YELLOW, 'BY TYPE');
  const types = [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const tmax = Math.max(...types.map((t) => t[1]), 1);
  types.forEach(([t, n], k) => {
    const [tag, colour] = typeTag(t);
    put(page, 6 + k, 0, colour, fit(tag, 5));
    const col = hbar(page, 6 + k, 6, 26, n / tmax, colour + 0x10);
    put(page, 6 + k, Math.min(col, 35), C.WHITE, fit(String(n), 4, 'right'));
  });
  put(page, 11, 0, C.YELLOW, 'TOP AGENCIES');
  [...byAgency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).forEach(([a, n], k) => {
    put(page, 12 + k, 0, C.WHITE, fit(String(n), 3, 'right'));
    put(page, 12 + k, 4, C.CYAN, fit(a, 35));
  });
  return page;
}

function recallPage(n: number, kind: 'food' | 'drug', title: string, banner: string) {
  return (data: FeedResult<unknown>, now: Date): Page => {
    const { page, d } = frame<RecallData>(n, title, SECTION.safety, banner, {
      red: [100, 'Index'], green: [kind === 'food' ? 701 : 700, kind === 'food' ? 'Drugs' : 'Food'],
      yellow: [600, 'Register'], cyan: [800, 'Tech'],
    }, data, now);
    if (!d) return page;
    const items: RecallItem[] = d[kind].slice(0, 6);
    put(page, 3, 0, C.WHITE, fit('Newest FDA enforcement reports', 39));
    items.forEach((r, k) => {
      const row = 4 + k * 3;
      const cls = (r.classification || '').replace('Class ', '');
      const colour = cls === 'I' ? C.RED : cls === 'II' ? C.YELLOW : C.GREEN;
      put(page, row, 0, colour, fit(`CLASS ${cls}`, 9));
      put(page, row, 10, C.CYAN, fit(r.firm, 21));
      put(page, row, 32, C.WHITE, fit(dateET(r.reportDate.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')), 7, 'right'));
      const lines = wrap(r.product, 38, 2);
      put(page, row + 1, 0, C.WHITE, fit(lines[0] ?? '', 38));
      put(page, row + 2, 0, C.WHITE, fit(lines[1] ?? '', 38));
    });
    put(page, 22, 0, C.RED, fit('Class I = could cause serious harm', 38));
    return page;
  };
}

function hnPage(n: number, offset: number) {
  return (data: FeedResult<unknown>, now: Date): Page => {
    const { page, d } = frame<HNData>(n, 'TECH', SECTION.tech, `TECH NEWS ${offset + 1}-${offset + 9}`, {
      red: [100, 'Index'], green: [n === 800 ? 801 : 800, n === 800 ? 'More' : 'Top'], yellow: [400, 'Space'], cyan: [666, 'Page 666'],
    }, data, now);
    if (!d) return page;
    d.stories.slice(offset, offset + 9).forEach((s, k) => {
      const row = 4 + k * 2;
      put(page, row, 0, C.GREEN, fit(String(s.score), 4, 'right'));
      const lines = wrap(s.title, 34, 2);
      put(page, row, 5, C.WHITE, fit(lines[0] ?? '', 34));
      put(page, row + 1, 5, lines[1] ? C.WHITE : C.CYAN, fit(lines[1] ?? `${s.descendants} comments, by ${s.by}`, 34));
    });
    return page;
  };
}

registerPage(600, { title: 'Register', fetch: fetchFedReg, build: build600 });
registerPage(601, { title: 'Register counts', fetch: fetchFedReg, build: build601 });
registerPage(700, { title: 'Food recalls', fetch: fetchRecalls, build: recallPage(700, 'food', 'FOOD', 'FOOD RECALLS') });
registerPage(701, { title: 'Drug recalls', fetch: fetchRecalls, build: recallPage(701, 'drug', 'DRUGS', 'DRUG RECALLS') });
registerPage(800, { title: 'Tech news', fetch: fetchHN, build: hnPage(800, 0) });
registerPage(801, { title: 'Tech news 2', fetch: fetchHN, build: hnPage(801, 9) });
