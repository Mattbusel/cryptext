/**
 * NWS weather feed: active alerts and forecasts for 8 US cities.
 */

import { fetchJson } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface ForecastPeriod {
  name: string;
  temperature: number | null;
  unit: string;
  shortForecast: string;
  icon?: string;
}

export interface Alert {
  event: string;
  areaDesc: string;
  severity: string;
  ends: string;
}

export interface WeatherCity {
  name: string;
  state: string;
  temp: number | null;
  unit: string;
  forecast: ForecastPeriod[];
  alerts: Alert[];
}

export interface WeatherData {
  cities: WeatherCity[];
  alerts: Alert[];
}

const CITIES = [
  { name: 'New York', state: 'NY', lat: 40.7128, lon: -74.006 },
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
  { name: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
  { name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
  { name: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.074 },
  { name: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 },
  { name: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
];

async function fetchWeatherData(): Promise<FeedResult<WeatherData>> {
  try {
    // Fetch active alerts
    const alertsRes = await fetchJson<{
      features?: Array<{
        properties: {
          event?: string;
          areaDesc?: string;
          severity?: string;
          ends?: string;
        };
      }>;
    }>(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert'
    );

    const alerts: Alert[] = (alertsRes.features ?? [])
      .map((f) => ({
        event: f.properties.event ?? 'Unknown',
        areaDesc: f.properties.areaDesc ?? 'Unknown',
        severity: f.properties.severity ?? 'Unknown',
        ends: f.properties.ends ?? '',
      }))
      .slice(0, 20);

    // Fetch forecast for each city
    const cities: WeatherCity[] = [];
    for (const city of CITIES) {
      try {
        // Get grid point and forecast URL for this location
        const pointRes = await fetchJson<{
          properties?: {
            forecast?: string;
          };
        }>(`https://api.weather.gov/points/${city.lat},${city.lon}`);

        const forecastUrl = pointRes.properties?.forecast;
        if (!forecastUrl) {
          throw new Error('No forecast URL in points response');
        }

        // Get forecast data
        const forecastRes = await fetchJson<{
          properties?: {
            periods?: Array<{
              name?: string;
              temperature?: number | null;
              temperatureUnit?: string;
              shortForecast?: string;
              icon?: string;
            }>;
          };
        }>(forecastUrl);

        const periods = forecastRes.properties?.periods ?? [];
        if (periods.length === 0) {
          throw new Error('No forecast periods returned');
        }

        const forecast: ForecastPeriod[] = periods.slice(0, 8).map((p) => ({
          name: p.name ?? 'Unknown',
          temperature: p.temperature ?? null,
          unit: p.temperatureUnit ?? 'F',
          shortForecast: p.shortForecast ?? 'Unknown',
          icon: p.icon,
        }));

        const temp = forecast[0]?.temperature ?? null;
        const unit = forecast[0]?.unit ?? 'F';

        // Get alerts for this state
        const cityAlerts = alerts.filter((a) =>
          a.areaDesc.includes(city.state)
        );

        cities.push({
          name: city.name,
          state: city.state,
          temp,
          unit,
          forecast,
          alerts: cityAlerts.slice(0, 3),
        });
      } catch (error) {
        // Individual city failure: mark as N/A but continue
        cities.push({
          name: city.name,
          state: city.state,
          temp: null,
          unit: 'F',
          forecast: [],
          alerts: [],
        });
      }
    }

    return {
      ok: true,
      data: { cities, alerts },
      fetchedAt: new Date().toISOString(),
      source: 'api.weather.gov',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'api.weather.gov',
    };
  }
}

export const fetchWeather = withCache('nws', fetchWeatherData);
