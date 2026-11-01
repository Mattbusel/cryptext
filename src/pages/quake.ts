/** Pages 300-302: earthquakes (USGS, past day, M2.5+) and 400-401: space weather (NOAA SWPC). */
import { Page } from '../engine/page.js';
import * as C from '../engine/codes.js';
import { FeedResult } from '../feeds/_cache.js';
import { registerPage } from '../registry.js';
import { fetchQuakes, QuakeData } from '../feeds/usgs.js';
import { fetchSpaceWeather, SpaceWeatherData } from '../feeds/swpc.js';
import { put, fit, hbar, spark, hhmmET } from '../engine/layout.js';
import { frame, SECTION } from './_common.js';

function magColour(m: number): number {
  if (m >= 5) return C.RED;
  if (m >= 4) return C.YELLOW;
  return C.GREEN;
}

function build300(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<QuakeData>(300, 'QUAKES', SECTION.earth, 'EARTHQUAKES TODAY', {
    red: [100, 'Index'], green: [301, 'Biggest'], yellow: [302, 'By size'], cyan: [400, 'Space'],
  }, data, now);
  if (!d) return page;
  put(page, 3, 0, C.WHITE, fit(`${d.quakes.length} quakes M2.5+ in 24h, newest first`, 39));
  put(page, 4, 0, C.CYAN, fit('ET      MAG  WHERE', 39));
  d.quakes.slice(0, 17).forEach((q, k) => {
    const row = 5 + k;
    put(page, row, 0, C.WHITE, hhmmET(new Date(q.time)));
    // two attribute cells on every row keep the columns aligned whether or not the row flashes
    put(page, row, 6, [magColour(q.mag), q.mag >= 6 ? C.FLASH : C.STEADY], q.mag.toFixed(1));
    put(page, row, 11, [C.STEADY, C.WHITE], fit(q.place, 27));
  });
  return page;
}

function build301(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<QuakeData>(301, 'BIGGEST', SECTION.earth, 'BIGGEST QUAKE TODAY', {
    red: [300, 'List'], green: [302, 'By size'], yellow: [100, 'Index'], cyan: [400, 'Space'],
  }, data, now);
  if (!d) return page;
  if (!d.quakes.length) { put(page, 5, 0, C.GREEN, 'No M2.5+ quakes in the last 24 hours.'); return page; }
  const big = [...d.quakes].sort((a, b) => b.mag - a.mag)[0];
  put(page, 4, 0, [magColour(big.mag), C.DOUBLE_HEIGHT], `M${big.mag.toFixed(1)}`);
  put(page, 4, 10, C.WHITE, fit(big.place, 29));
  put(page, 6, 0, C.CYAN, fit(`${hhmmET(new Date(big.time))} ET, depth ${big.depth.toFixed(0)} km`, 39));
  // quakes per 2-hour bucket over the last 24h, oldest at the top
  put(page, 8, 0, C.YELLOW, fit('QUAKES PER 2 HOURS (ET)', 39));
  const end = now.getTime();
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const q of d.quakes) {
    const age = end - q.time;
    if (age >= 0 && age < 24 * 3600e3) buckets[11 - Math.floor(age / (2 * 3600e3))]++;
  }
  const max = Math.max(...buckets, 1);
  buckets.forEach((n, k) => {
    const start = new Date(end - (12 - k) * 2 * 3600e3);
    put(page, 10 + k, 0, C.WHITE, hhmmET(start));
    const col = hbar(page, 10 + k, 6, 28, n / max, C.MOSAIC_RED);
    put(page, 10 + k, Math.min(col, 36), C.WHITE, fit(String(n), 3, 'right'));
  });
  return page;
}

function build302(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<QuakeData>(302, 'BY SIZE', SECTION.earth, 'QUAKES BY MAGNITUDE', {
    red: [300, 'List'], green: [301, 'Biggest'], yellow: [100, 'Index'], cyan: [400, 'Space'],
  }, data, now);
  if (!d) return page;
  const bands: [string, number, number, number][] = [
    ['2.5-2.9', 2.5, 3, C.MOSAIC_GREEN], ['3.0-3.9', 3, 4, C.MOSAIC_GREEN], ['4.0-4.9', 4, 5, C.MOSAIC_YELLOW],
    ['5.0-5.9', 5, 6, C.MOSAIC_RED], ['6.0-6.9', 6, 7, C.MOSAIC_RED], ['7.0+', 7, 99, C.MOSAIC_RED],
  ];
  const counts = bands.map(([, lo, hi]) => d.quakes.filter((q) => q.mag >= lo && q.mag < hi).length);
  const max = Math.max(...counts, 1);
  put(page, 4, 0, C.WHITE, fit(`${d.quakes.length} quakes of M2.5+ in the past 24 hours`, 39));
  bands.forEach(([label, , , colour], k) => {
    const row = 7 + k * 2;
    put(page, row, 0, C.CYAN, fit(label, 8));
    const col = hbar(page, row, 9, 25, counts[k] / max, colour);
    put(page, row, Math.min(col, 35), C.WHITE, fit(String(counts[k]), 4, 'right'));
  });
  put(page, 20, 0, C.WHITE, fit('Each step up in magnitude releases', 39));
  put(page, 21, 0, C.WHITE, fit('about 32 times more energy.', 39));
  return page;
}

function gLevel(kp: number): string {
  if (kp >= 9) return 'G5 EXTREME';
  if (kp >= 8) return 'G4 SEVERE';
  if (kp >= 7) return 'G3 STRONG';
  if (kp >= 6) return 'G2 MODERATE';
  if (kp >= 5) return 'G1 MINOR';
  return 'G0 QUIET';
}

function aurora(kp: number): string {
  if (kp >= 8) return 'Aurora possible as far south as the Gulf';
  if (kp >= 7) return 'Aurora possible over the central US';
  if (kp >= 6) return 'Aurora possible over the northern US';
  if (kp >= 5) return 'Aurora likely along the Canadian border';
  if (kp >= 4) return 'Aurora over Alaska and northern Canada';
  return 'Aurora mostly confined to the Arctic';
}

function build400(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<SpaceWeatherData>(400, 'SPACE', SECTION.space, 'SPACE WEATHER', {
    red: [100, 'Index'], green: [401, 'Kp scale'], yellow: [300, 'Quakes'], cyan: [666, 'Page 666'],
  }, data, now);
  if (!d) return page;
  const kp = d.kpCurrent;
  const colour = kp >= 5 ? C.RED : kp >= 4 ? C.YELLOW : C.GREEN;
  put(page, 4, 0, C.WHITE, 'PLANETARY Kp');
  put(page, 4, 14, [colour, C.DOUBLE_HEIGHT], kp.toFixed(0));
  put(page, 4, 20, kp >= 5 ? [colour, C.FLASH] : colour, gLevel(kp));
  put(page, 7, 0, C.YELLOW, fit(aurora(kp), 39));
  const hist = d.kpHistory.map((h) => h.kp);
  put(page, 9, 0, C.CYAN, fit(`Kp, last ${hist.length} readings (1 per minute)`, 39));
  spark(page, 11, 0, 36, hist, kp >= 5 ? C.MOSAIC_RED : C.MOSAIC_MAGENTA);
  put(page, 13, 0, C.WHITE, fit(`min ${Math.min(...hist).toFixed(0)}   max ${Math.max(...hist).toFixed(0)}   now ${kp.toFixed(0)}`, 39));
  put(page, 15, 0, C.WHITE, fit('Kp measures how hard the solar wind is', 39));
  put(page, 16, 0, C.WHITE, fit('shaking Earth\'s magnetic field, from 0', 39));
  put(page, 17, 0, C.WHITE, fit('(quiet) to 9 (extreme storm). Storms', 39));
  put(page, 18, 0, C.WHITE, fit('push the aurora south and can upset GPS,', 39));
  put(page, 19, 0, C.WHITE, fit('radio and power grids.', 39));
  return page;
}

function build401(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<SpaceWeatherData>(401, 'KP SCALE', SECTION.space, 'THE STORM SCALE', {
    red: [400, 'Now'], green: [100, 'Index'], yellow: [300, 'Quakes'], cyan: [666, 'Page 666'],
  }, data, now);
  if (!d) return page;
  const rows: [string, string, string][] = [
    ['0-4', 'G0', 'Quiet to unsettled'], ['5', 'G1', 'Minor: weak grid swings'], ['6', 'G2', 'Moderate: HF radio fades'],
    ['7', 'G3', 'Strong: GPS errors'], ['8', 'G4', 'Severe: grid alarms'], ['9', 'G5', 'Extreme: blackouts possible'],
  ];
  const lvl = Math.max(0, Math.floor(d.kpCurrent) - 4);
  put(page, 4, 0, C.CYAN, fit('Kp   G    WHAT IT MEANS', 39));
  rows.forEach(([kp, g, text], k) => {
    const row = 6 + k * 2;
    const here = k === lvl;
    put(page, row, 0, here ? [C.YELLOW, C.NEW_BACKGROUND, C.BLUE] : C.WHITE, fit(`${kp.padEnd(4)} ${g}   ${text}`, here ? 36 : 38));
  });
  put(page, 19, 0, C.YELLOW, fit(`Now: Kp ${d.kpCurrent.toFixed(0)}, highlighted above.`, 39));
  return page;
}

registerPage(300, { title: 'Quakes', fetch: fetchQuakes, build: build300 });
registerPage(301, { title: 'Biggest quake', fetch: fetchQuakes, build: build301 });
registerPage(302, { title: 'Quakes by size', fetch: fetchQuakes, build: build302 });
registerPage(400, { title: 'Space weather', fetch: fetchSpaceWeather, build: build400 });
registerPage(401, { title: 'Storm scale', fetch: fetchSpaceWeather, build: build401 });
