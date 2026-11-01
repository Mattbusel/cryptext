/**
 * NOAA SWPC space weather feed: K-index and aurora forecast.
 */

import { fetchJson } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface KpRecord {
  time: string;
  kp: number;
}

export interface SpaceWeatherData {
  kpCurrent: number;
  kpHistory: KpRecord[];
  auroraLatitude: number;
  stormLevel: string;
}

async function fetchSpaceWeatherData(): Promise<FeedResult<SpaceWeatherData>> {
  try {
    const res = await fetchJson<
      Array<{
        time_tag: string;
        kp_index: string;
      }>
    >(
      'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
    );

    if (!Array.isArray(res) || res.length === 0) {
      throw new Error('Invalid SWPC response format');
    }

    // Parse the response
    const records: KpRecord[] = res.map((r) => ({
      time: r.time_tag,
      kp: parseInt(r.kp_index, 10),
    }));

    const kpCurrent = records[records.length - 1]?.kp ?? 0;

    // Aurora latitude formula: 66.5 - 2.5 * Kp
    const auroraLatitude = 66.5 - 2.5 * kpCurrent;

    // Determine storm level based on Kp
    let stormLevel = 'None';
    if (kpCurrent >= 9) stormLevel = 'G5';
    else if (kpCurrent >= 8) stormLevel = 'G4';
    else if (kpCurrent >= 7) stormLevel = 'G3';
    else if (kpCurrent >= 6) stormLevel = 'G2';
    else if (kpCurrent >= 5) stormLevel = 'G1';

    // Keep last 24 hours of history (1 per hour, or all available)
    const kpHistory = records.slice(-24);

    return {
      ok: true,
      data: {
        kpCurrent,
        kpHistory,
        auroraLatitude,
        stormLevel,
      },
      fetchedAt: new Date().toISOString(),
      source: 'services.swpc.noaa.gov',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'services.swpc.noaa.gov',
    };
  }
}

export const fetchSpaceWeather = withCache('swpc', fetchSpaceWeatherData);
