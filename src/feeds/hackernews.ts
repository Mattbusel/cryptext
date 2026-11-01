/**
 * Hacker News feed: top stories.
 */

import { fetchJson } from './_http.js';
import { withCache, FeedResult } from './_cache.js';

export interface HNStory {
  id: number;
  title: string;
  score: number;
  descendants: number;
  by: string;
}

export interface HNData {
  stories: HNStory[];
}

async function fetchHNData(): Promise<FeedResult<HNData>> {
  try {
    // Fetch top story IDs
    const topIds = await fetchJson<number[]>(
      'https://hacker-news.firebaseio.com/v0/topstories.json'
    );

    if (!Array.isArray(topIds) || topIds.length === 0) {
      throw new Error('No top stories returned');
    }

    // Fetch details for top 20 stories in parallel, skip failures
    const stories: HNStory[] = [];
    const promises = topIds.slice(0, 20).map(async (id) => {
      try {
        const item = await fetchJson<{
          id: number;
          title: string;
          score: number;
          descendants: number;
          by: string;
        }>(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        stories.push({
          id: item.id,
          title: item.title ?? 'Untitled',
          score: item.score ?? 0,
          descendants: item.descendants ?? 0,
          by: item.by ?? 'Unknown',
        });
      } catch {
        // Skip failed story fetches
      }
    });

    await Promise.all(promises);

    // Sort by score descending
    stories.sort((a, b) => b.score - a.score);

    return {
      ok: true,
      data: { stories },
      fetchedAt: new Date().toISOString(),
      source: 'hacker-news.firebaseio.com',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: msg,
      source: 'hacker-news.firebaseio.com',
    };
  }
}

export const fetchHN = withCache('hackernews', fetchHNData);
