/** Pages 200-209: weather from the National Weather Service. */
import { Page } from '../engine/page.js';
import * as C from '../engine/codes.js';
import { FeedResult } from '../feeds/_cache.js';
import { registerPage } from '../registry.js';
import { fetchWeather, WeatherData, Alert } from '../feeds/nws.js';
import { put, fit, hbar } from '../engine/layout.js';
import { frame, SECTION } from './_common.js';

function sevColour(sev: string): number {
  const s = (sev || '').toLowerCase();
  if (s === 'extreme' || s === 'severe') return C.RED;
  if (s === 'moderate') return C.YELLOW;
  return C.GREEN;
}

function tempColour(t: number | null): number {
  if (t === null) return C.WHITE;
  if (t >= 90) return C.RED;
  if (t >= 75) return C.YELLOW;
  if (t >= 50) return C.GREEN;
  if (t >= 33) return C.CYAN;
  return C.WHITE;
}

function build200(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<WeatherData>(200, 'WEATHER', SECTION.weather, 'WEATHER: 8 US CITIES', {
    red: [100, 'Index'], green: [201, 'New York'], yellow: [209, 'Alerts'], cyan: [300, 'Quakes'],
  }, data, now);
  if (!d) return page;
  put(page, 3, 0, C.WHITE, fit('CITY            NOW  NEXT            ALT', 39));
  d.cities.forEach((c, i) => {
    const row = 5 + i * 2;
    put(page, row, 0, C.CYAN, fit(`${c.name} ${c.state}`, 14));
    put(page, row, 15, tempColour(c.temp), fit(c.temp === null ? '--' : `${c.temp}F`, 4, 'right'));
    put(page, row, 20, C.WHITE, fit(c.forecast[0]?.shortForecast ?? 'no forecast', 15));
    const n = c.alerts.length;
    put(page, row, 36, n ? C.RED : C.GREEN, fit(String(n), 3, 'right'));
    put(page, row + 1, 0, C.WHITE, fit(`     ${201 + i}`, 8));
  });
  return page;
}

function buildCity(i: number) {
  return (data: FeedResult<unknown>, now: Date): Page => {
    const n = 201 + i;
    const prev = i === 0 ? 208 : n - 1;
    const next = i === 7 ? 201 : n + 1;
    const ok = data.ok ? (data.data as WeatherData).cities[i] : null;
    const name = ok ? `${ok.name.toUpperCase()} ${ok.state}` : 'CITY FORECAST';
    const { page, d } = frame<WeatherData>(n, 'FORECAST', SECTION.weather, name, {
      red: [200, 'Cities'], green: [prev, `P${prev}`], yellow: [next, `P${next}`], cyan: [209, 'Alerts'],
    }, data, now);
    if (!d) return page;
    const c = d.cities[i];
    if (!c || !c.forecast.length) { put(page, 5, 0, C.RED, 'No forecast published right now.'); return page; }
    const periods = c.forecast.slice(0, 6);
    const temps = periods.map((p) => p.temperature ?? 0);
    const max = Math.max(...temps, 1);
    periods.forEach((p, k) => {
      const row = 4 + k * 3;
      put(page, row, 0, C.YELLOW, fit(p.name, 16));
      put(page, row, 18, tempColour(p.temperature), fit(p.temperature === null ? '--' : `${p.temperature}${p.unit}`, 4, 'right'));
      hbar(page, row, 23, 15, (p.temperature ?? 0) / max, tempColour(p.temperature) + 0x10);
      put(page, row + 1, 0, C.WHITE, fit(p.shortForecast, 39));
    });
    if (c.alerts.length) put(page, 22, 0, [C.RED, C.FLASH], fit(`${c.alerts.length} active alert(s): ${c.alerts[0].event}`, 37));
    return page;
  };
}

function build209(data: FeedResult<unknown>, now: Date): Page {
  const { page, d } = frame<WeatherData>(209, 'ALERTS', SECTION.weather, 'NWS ACTIVE ALERTS', {
    red: [200, 'Cities'], green: [100, 'Index'], yellow: [300, 'Quakes'], cyan: [400, 'Space'],
  }, data, now);
  if (!d) return page;
  const list: Alert[] = d.alerts.slice(0, 9);
  put(page, 3, 0, C.WHITE, fit(`${d.alerts.length} alerts in force nationwide`, 39));
  if (!list.length) put(page, 5, 0, C.GREEN, 'No active alerts. Quiet skies.');
  list.forEach((a, k) => {
    const row = 5 + k * 2;
    put(page, row, 0, sevColour(a.severity), fit(a.severity || 'Unknown', 8));
    put(page, row, 10, C.YELLOW, fit(a.event, 29));
    put(page, row + 1, 1, C.WHITE, fit(a.areaDesc, 38));
  });
  return page;
}

registerPage(200, { title: 'Weather', fetch: fetchWeather, build: build200 });
for (let i = 0; i < 8; i++) registerPage(201 + i, { title: `Forecast ${i + 1}`, fetch: fetchWeather, build: buildCity(i) });
registerPage(209, { title: 'Alerts', fetch: fetchWeather, build: build209 });
