/** Pages 500-503: federal debt and interest (Treasury Fiscal Data) and big contracts (USAspending). */
import { Page } from '../engine/page.js';
import * as C from '../engine/codes.js';
import { FeedResult } from '../feeds/_cache.js';
import { registerPage } from '../registry.js';
import { fetchFiscal, FiscalData } from '../feeds/treasury.js';
import { fetchSpending, SpendingData } from '../feeds/usaspending.js';
import { put, fit, hbar, spark, money } from '../engine/layout.js';
import { frame, SECTION, dateET } from './_common.js';

function series(d: FiscalData) {
  return [...d.debtHistory].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
}

function build500(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<FiscalData>(500, 'DEBT', SECTION.money, 'NATIONAL DEBT', {
    red: [100, 'Index'], green: [501, 'Interest'], yellow: [502, 'Contracts'], cyan: [503, 'Per day'],
  }, data, now);
  if (!d) return page;
  const s = series(d);
  if (!s.length) { put(page, 5, 0, C.RED, 'Treasury returned no records.'); return page; }
  const last = s[s.length - 1], first = s[0];
  put(page, 4, 0, C.WHITE, fit(`Debt to the penny, ${dateET(last.recordDate)}`, 39));
  put(page, 6, 0, [C.GREEN, C.DOUBLE_HEIGHT], `$${(last.totalDebt / 1e12).toFixed(3)} trillion`);
  put(page, 9, 0, C.CYAN, fit('Held by the public', 22));
  put(page, 9, 23, C.WHITE, fit(money(last.debtHeldPublic), 9, 'right'));
  put(page, 9, 33, C.WHITE, fit(`${Math.round((100 * last.debtHeldPublic) / last.totalDebt)}%`, 5, 'right'));
  hbar(page, 10, 0, 37, last.debtHeldPublic / last.totalDebt, C.MOSAIC_GREEN);
  put(page, 11, 0, C.CYAN, fit('Intragovernmental', 22));
  put(page, 11, 23, C.WHITE, fit(money(last.intragovHold), 9, 'right'));
  put(page, 11, 33, C.WHITE, fit(`${Math.round((100 * last.intragovHold) / last.totalDebt)}%`, 5, 'right'));
  hbar(page, 12, 0, 37, last.intragovHold / last.totalDebt, C.MOSAIC_YELLOW);
  const change = last.totalDebt - first.totalDebt;
  put(page, 14, 0, C.WHITE, fit(`Change since ${dateET(first.recordDate)}`, 22));
  put(page, 14, 23, change >= 0 ? C.RED : C.GREEN, fit(`${change >= 0 ? '+' : '-'}${money(Math.abs(change))}`, 14, 'right'));
  put(page, 16, 0, C.YELLOW, fit(`Total debt, last ${s.length} business days`, 39));
  spark(page, 18, 0, 36, s.map((r) => r.totalDebt), C.MOSAIC_GREEN);
  put(page, 20, 0, C.WHITE, fit(`${dateET(first.recordDate)}`, 20));
  put(page, 20, 30, C.WHITE, fit(dateET(last.recordDate), 9, 'right'));
  return page;
}

function build501(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<FiscalData>(501, 'INTEREST', SECTION.money, 'WHAT THE DEBT COSTS', {
    red: [500, 'Debt'], green: [502, 'Contracts'], yellow: [503, 'Per day'], cyan: [100, 'Index'],
  }, data, now);
  if (!d) return page;
  const rates = d.interestRates.filter((r) => r.avgRate > 0).sort((a, b) => b.avgRate - a.avgRate).slice(0, 14);
  if (!rates.length) { put(page, 5, 0, C.RED, 'Treasury returned no rates.'); return page; }
  const max = Math.max(...rates.map((r) => r.avgRate));
  put(page, 3, 0, C.WHITE, fit(`Average interest rate by security, ${dateET(rates[0].recordDate)}`, 39));
  rates.forEach((r, k) => {
    const row = 5 + k;
    put(page, row, 0, r.securityType.startsWith('Market') ? C.CYAN : C.MAGENTA, fit(r.securityDesc, 20));
    put(page, row, 21, C.WHITE, fit(`${r.avgRate.toFixed(2)}%`, 6, 'right'));
    hbar(page, row, 28, 10, r.avgRate / max, C.MOSAIC_GREEN);
  });
  put(page, 20, 0, C.CYAN, 'cyan');
  put(page, 20, 5, C.WHITE, 'marketable');
  put(page, 20, 17, C.MAGENTA, 'magenta');
  put(page, 20, 25, C.WHITE, 'non-marketable');
  return page;
}

function build502(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<SpendingData>(502, 'CONTRACTS', SECTION.money, 'BIGGEST CONTRACT ACTIONS', {
    red: [500, 'Debt'], green: [501, 'Interest'], yellow: [600, 'Register'], cyan: [100, 'Index'],
  }, data, now);
  if (!d) return page;
  const t = d.transactions.slice(0, 9);
  put(page, 3, 0, C.WHITE, fit('Largest federal contract actions, 10 days', 39));
  if (!t.length) { put(page, 5, 0, C.YELLOW, 'No contract actions reported yet.'); return page; }
  t.forEach((x, k) => {
    const row = 5 + k * 2;
    put(page, row, 0, C.GREEN, fit(money(x.amount), 8, 'right'));
    put(page, row, 9, C.WHITE, fit(x.recipient, 30));
    put(page, row + 1, 9, C.CYAN, fit(`${dateET(x.actionDate)} ${x.agency.replace(/^Department of (the )?/, '')}`, 30));
  });
  return page;
}

function build503(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<FiscalData>(503, 'PER DAY', SECTION.money, 'THE DEBT CLOCK', {
    red: [500, 'Debt'], green: [501, 'Interest'], yellow: [502, 'Contracts'], cyan: [100, 'Index'],
  }, data, now);
  if (!d) return page;
  const s = series(d);
  if (s.length < 2) { put(page, 5, 0, C.RED, 'Not enough records for a rate.'); return page; }
  const first = s[0], last = s[s.length - 1];
  const days = (Date.parse(last.recordDate) - Date.parse(first.recordDate)) / 86400e3;
  const perDay = (last.totalDebt - first.totalDebt) / Math.max(1, days);
  put(page, 4, 0, C.WHITE, fit(`From ${dateET(first.recordDate)} to ${dateET(last.recordDate)} (${days.toFixed(0)} days)`, 39));
  put(page, 6, 0, C.WHITE, 'Per day');
  put(page, 6, 14, [perDay >= 0 ? C.RED : C.GREEN, C.DOUBLE_HEIGHT], `${perDay >= 0 ? '+' : '-'}${money(Math.abs(perDay))}`);
  put(page, 9, 0, C.WHITE, 'Per hour');
  put(page, 9, 15, C.YELLOW, `${money(perDay / 24)}`);
  put(page, 11, 0, C.WHITE, 'Per minute');
  put(page, 11, 15, C.YELLOW, `${money(perDay / 1440)}`);
  put(page, 13, 0, C.WHITE, 'Per second');
  put(page, 13, 15, C.YELLOW, `$${Math.round(perDay / 86400).toLocaleString('en-US')}`);
  put(page, 16, 0, C.CYAN, fit('Calendar-day average from Treasury\'s', 39));
  put(page, 17, 0, C.CYAN, fit('debt to the penny. Big days follow', 39));
  put(page, 18, 0, C.CYAN, fit('auction settlements, so the clock jumps.', 39));
  return page;
}

registerPage(500, { title: 'Debt', fetch: fetchFiscal, build: build500 });
registerPage(501, { title: 'Interest', fetch: fetchFiscal, build: build501 });
registerPage(502, { title: 'Contracts', fetch: fetchSpending, build: build502 });
registerPage(503, { title: 'Debt clock', fetch: fetchFiscal, build: build503 });
