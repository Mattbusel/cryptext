/**
 * USGS earthquake feed: recent M2.5+ events.
 */

import { fetchJson } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface Quake {
  mag: number;
  place: string;
  time: number;
  depth: number;
  url: string;
}

export interface QuakeData {
  quakes: Quake[];
  count: number;
}

async function fetchQuakeData(): Promise<FeedResult<QuakeData>> {
  try {
    const res = await fetchJson<{
      features: Array<{
        properties: {
          mag: number;
          place: string;
          time: number;
          url: string;
        };
        geometry: {
          coordinates: [number, number, number]; // lon, lat, depth
        };
      }>;
      metadata: {
        count: number;
      };
    }>(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
    );

    const quakes: Quake[] = res.features.map((f) => ({
      mag: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      depth: f.geometry.coordinates[2],
      url: f.properties.url,
    }));

    return {
      ok: true,
      data: {
        quakes,
        count: res.metadata.count,
      },
      fetchedAt: new Date().toISOString(),
      source: 'earthquake.usgs.gov',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'earthquake.usgs.gov',
    };
  }
}

export const fetchQuakes = withCache('usgs', fetchQuakeData);
