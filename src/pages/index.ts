/** Page 100 (index), 101 (about) and 666 (the haunted page). */
import { makePage, Page } from '../engine/page.js';
import { writeHeader } from '../engine/helpers.js';
import * as C from '../engine/codes.js';
import { FeedResult } from '../feeds/_cache.js';
import { registerPage } from '../registry.js';
import { fetchQuakes, QuakeData } from '../feeds/usgs.js';
import { fetchSpaceWeather, SpaceWeatherData } from '../feeds/swpc.js';
import { put, fit, bitmap, fastextRow, footer, banner } from '../engine/layout.js';
import { SECTION } from './_common.js';

// 5x6 glyphs for the logo
const GLYPHS: Record<string, string[]> = {
  C: [' ####', '#    ', '#    ', '#    ', '#    ', ' ####'],
  R: ['#### ', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  P: ['#### ', '#   #', '#### ', '#    ', '#    ', '#    '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  E: ['#####', '#    ', '#### ', '#    ', '#    ', '#####'],
  X: ['#   #', ' # # ', '  #  ', '  #  ', ' # # ', '#   #'],
};

export function wordBitmap(word: string): string[] {
  const rows = ['', '', '', '', '', ''];
  [...word].forEach((ch, i) => {
    const g = GLYPHS[ch];
    for (let r = 0; r < 6; r++) rows[r] += (i ? ' ' : '') + (g ? g[r] : '     ');
  });
  return rows;
}

// Blood-red drips under the logo, 3 pixel rows, deterministic.
function drips(width: number): string[] {
  const at = [1, 7, 9, 15, 20, 26, 31, 33, 39, 44];
  const long = new Set([7, 20, 33]);
  const rows = ['', '', ''];
  for (let x = 0; x < width; x++) {
    rows[0] += at.includes(x) ? '#' : ' ';
    rows[1] += at.includes(x) && (long.has(x) || x % 2 === 1) ? '#' : ' ';
    rows[2] += long.has(x) ? '#' : ' ';
  }
  return rows;
}

type NowData = { q: FeedResult<QuakeData>; s: FeedResult<SpaceWeatherData> };

async function fetchNow(): Promise<FeedResult<NowData>> {
  const [q, s] = await Promise.all([fetchQuakes(), fetchSpaceWeather()]);
  return { ok: true, data: { q, s }, fetchedAt: new Date().toISOString(), source: 'earthquake.usgs.gov + swpc.noaa.gov' };
}

function buildIndex(data: FeedResult<unknown>, now: Date): Page {
  const page = makePage(100, 'INDEX');
  writeHeader(page, now);
  const logo = wordBitmap('CRYPTEXT');
  const pad = Math.floor((38 - Math.ceil(logo[0].length / 2)) / 2);
  bitmap(page, 2, pad, logo, C.MOSAIC_WHITE);
  bitmap(page, 4, pad, drips(logo[0].length), C.MOSAIC_RED);
  put(page, 5, 0, C.CYAN, fit('   teletext, back from the grave', 39));

  const items: [string, string, number][] = [
    ['100', 'Index', C.WHITE], ['101', 'About, how to', C.WHITE],
    ['200', 'Weather', C.CYAN], ['209', 'Weather alerts', C.CYAN],
    ['300', 'Earthquakes', C.RED], ['400', 'Space weather', C.MAGENTA],
    ['500', 'National debt', C.GREEN], ['502', 'Big contracts', C.GREEN],
    ['600', 'Fed Register', C.YELLOW], ['700', 'Food recalls', C.RED],
    ['701', 'Drug recalls', C.RED], ['800', 'Tech news', C.BLUE],
  ];
  items.forEach(([n, label, colour], i) => {
    const col = (i % 2) * 20;
    put(page, 7 + Math.floor(i / 2), col, [C.YELLOW], n);
    put(page, 7 + Math.floor(i / 2), col + 4, colour, fit(label, 15));
  });

  // live "now" lines
  put(page, 14, 0, [C.BLUE, C.NEW_BACKGROUND, C.WHITE], fit(' RIGHT NOW', 37));
  const d = data.ok ? (data.data as NowData) : null;
  if (d?.q.ok && d.q.data.quakes.length) {
    const big = [...d.q.data.quakes].sort((a, b) => b.mag - a.mag)[0];
    const latest = d.q.data.quakes[0];
    put(page, 16, 0, C.WHITE, 'Latest quake');
    put(page, 16, 13, latest.mag >= 5 ? C.RED : C.YELLOW, `M${latest.mag.toFixed(1)}`);
    put(page, 16, 19, C.WHITE, fit(latest.place, 20));
    put(page, 17, 0, C.WHITE, 'Biggest 24h');
    put(page, 17, 13, big.mag >= 5 ? C.RED : C.YELLOW, `M${big.mag.toFixed(1)}`);
    put(page, 17, 19, C.WHITE, fit(big.place, 20));
  } else put(page, 16, 0, C.RED, 'Earthquake feed not answering');
  if (d?.s.ok) {
    put(page, 18, 0, C.WHITE, 'Planetary Kp');
    put(page, 18, 13, d.s.data.kpCurrent >= 5 ? C.RED : C.GREEN, `${d.s.data.kpCurrent.toFixed(0)}`);
    put(page, 18, 19, C.WHITE, fit(d.s.data.stormLevel === 'None' || !d.s.data.stormLevel ? 'no geomagnetic storm' : `storm level ${d.s.data.stormLevel}`, 20));
  } else put(page, 18, 0, C.RED, 'Space weather feed not answering');

  put(page, 20, 0, C.WHITE, fit('Type a page number, or press a', 39));
  put(page, 21, 0, C.WHITE, fit('coloured key. Agents: see page 101.', 39));
  fastextRow(page, ['Weather', 'Quakes', 'Money', 'Page 666']);
  page.fastext = { red: 200, green: 300, yellow: 500, cyan: 666 };
  footer(page, 'CRYPTEXT live public data', data.ok ? data.fetchedAt : undefined);
  return page;
}

async function fetchNothing(): Promise<FeedResult<null>> {
  return { ok: true, data: null, fetchedAt: new Date().toISOString(), source: 'github.com/Mattbusel/cryptext' };
}

function buildAbout(_d: FeedResult<unknown>, now: Date): Page {
  const page = makePage(101, 'ABOUT');
  writeHeader(page, now);
  banner(page, 1, SECTION.index.bg, SECTION.index.fg, 'ABOUT CRYPTEXT');
  const lines: [number, string][] = [
    [C.WHITE, 'Teletext ran on TV from 1974 to 2012.'],
    [C.WHITE, 'CRYPTEXT brings it back, fed by live'],
    [C.WHITE, 'US public data. No ads, no tracking.'],
    [C.YELLOW, 'HOW TO USE'],
    [C.WHITE, 'Type 3 digits to jump to a page.'],
    [C.WHITE, 'Coloured keys (R G Y C) follow links.'],
    [C.WHITE, 'Up/down arrows: next/previous page.'],
    [C.YELLOW, 'TERMINAL'],
    [C.CYAN, 'curl cryptext.vercel.app/api/page'],
    [C.CYAN, '  ?n=300&format=ansi'],
    [C.YELLOW, 'AI AGENTS (MCP)'],
    [C.WHITE, 'node dist/mcp/server.js: list_pages,'],
    [C.WHITE, 'read_page(n, format) over stdio.'],
    [C.YELLOW, 'REAL TELEVISIONS'],
    [C.WHITE, 'format=tti gives VBIT2 page files for a'],
    [C.WHITE, 'Raspberry Pi teletext inserter.'],
    [C.GREEN, 'All times are US Eastern.'],
  ];
  lines.forEach(([c, t], i) => put(page, 4 + i, 0, c, fit(t, 39)));
  fastextRow(page, ['Index', 'Weather', 'Quakes', 'Page 666']);
  page.fastext = { red: 100, green: 200, yellow: 300, cyan: 666 };
  footer(page, 'github.com/Mattbusel/cryptext');
  return page;
}

const GHOST = [
  '      ########      ',
  '    ############    ',
  '   ##############   ',
  '  ####  ####  ####  ',
  '  ###    ##    ###  ',
  '  ####  ####  ####  ',
  '  ################  ',
  '  ######    ######  ',
  '  #####  ##  #####  ',
  '  ################  ',
  '  ################  ',
  '  ################  ',
  '  ## #### #### ###  ',
  '  #   ##   ##   ##  ',
  '                    ',
];

function build666(_d: FeedResult<unknown>, now: Date): Page {
  const page = makePage(666, 'KIROWEEN');
  writeHeader(page, now);
  put(page, 1, 0, [C.DOUBLE_HEIGHT, C.RED, C.FLASH], fit('    THE SIGNAL NEVER DIED', 37));
  bitmap(page, 4, 1, GHOST, C.MOSAIC_WHITE);
  const text: [number, string][] = [
    [C.WHITE, 'Ceefax 1974-2012.'],
    [C.WHITE, 'Oracle 1978-1992.'],
    [C.WHITE, 'Switched off.'],
    [C.RED, 'Not dead.'],
    [C.YELLOW, 'Raised in 2026'],
    [C.YELLOW, 'with Kiro:'],
    [C.CYAN, 'specs, hooks,'],
    [C.CYAN, 'steering, MCP,'],
    [C.CYAN, 'custom agents.'],
  ];
  text.forEach(([c, t], i) => put(page, 4 + i, 13, c, fit(t, 26)));
  put(page, 14, 13, [C.MAGENTA], fit('Happy Kiroween.', 26));
  put(page, 16, 0, C.WHITE, fit('Data: NWS, USGS, NOAA SWPC, Treasury,', 39));
  put(page, 17, 0, C.WHITE, fit('USAspending, Federal Register, openFDA,', 39));
  put(page, 18, 0, C.WHITE, fit('Hacker News. All live, all public.', 39));
  put(page, 20, 0, [C.CONCEAL, C.GREEN], fit('You found the hidden line. Boo.', 37));
  put(page, 21, 0, C.WHITE, fit('Press Reveal to see the hidden line.', 39));
  fastextRow(page, ['Index', 'About', 'Quakes', 'Space']);
  page.fastext = { red: 100, green: 101, yellow: 300, cyan: 400 };
  footer(page, 'CRYPTEXT for Kiroween 2026');
  return page;
}

registerPage(100, { title: 'Index', fetch: fetchNow, build: buildIndex });
registerPage(101, { title: 'About', fetch: fetchNothing, build: buildAbout });
registerPage(666, { title: 'Kiroween', fetch: fetchNothing, build: build666 });
