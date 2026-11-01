/**
 * In-memory cache with 5-minute TTL for feed results.
 */

export type FeedResult<T> =
  | { ok: true; data: T; fetchedAt: string; source: string }
  | { ok: false; error: string; source: string };

interface CacheEntry<T> {
  result: FeedResult<T>;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function withCache<T>(
  key: string,
  fetcher: () => Promise<FeedResult<T>>
): () => Promise<FeedResult<T>> {
  return async (): Promise<FeedResult<T>> => {
    const now = Date.now();
    const cached = cache.get(key) as CacheEntry<T> | undefined;

    if (cached && now - cached.cachedAt < TTL_MS) {
      return cached.result;
    }

    try {
      const result = await fetcher();
      if (result.ok) {
        cache.set(key, { result, cachedAt: now });
      }
      return result;
    } catch (error) {
      // On error, return stale cache if available
      if (cached) {
        return cached.result;
      }
      // No cache, no fallback
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw error;
    }
  };
}
