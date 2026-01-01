/**
 * useCachedQuery - Ultra-aggressive caching hook
 * Combines React Query with multi-layer caching
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { aggressiveCache, CACHE_DURATIONS } from '@/lib/aggressiveCache';

interface CachedQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  cacheKey: string;
  staleTime?: number;
  gcTime?: number;
  persist?: boolean;
  forceRefresh?: boolean;
}

export function useCachedQuery<T>({
  queryKey,
  queryFn,
  cacheKey,
  staleTime = CACHE_DURATIONS.LONG,
  gcTime = CACHE_DURATIONS.VERY_LONG,
  persist = true,
  forceRefresh = false,
}: CachedQueryOptions<T>) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      return aggressiveCache.getOrFetch(
        cacheKey,
        queryFn,
        {
          memoryTTL: staleTime,
          sessionTTL: staleTime * 2,
          persistTTL: gcTime,
          persist,
          forceRefresh,
        }
      );
    },
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Return cached data immediately while fetching
    placeholderData: () => aggressiveCache.get<T>(cacheKey) ?? undefined,
  } as UseQueryOptions<T, Error, T, string[]>);
}

// Prefetch data into cache
export async function prefetchToCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    memoryTTL?: number;
    sessionTTL?: number;
    persistTTL?: number;
    persist?: boolean;
  }
): Promise<T> {
  return aggressiveCache.getOrFetch(cacheKey, fetcher, options);
}

// Invalidate cache
export function invalidateCache(cacheKey: string): void {
  aggressiveCache.invalidate(cacheKey);
}

// Invalidate by prefix
export function invalidateCacheByPrefix(prefix: string): void {
  aggressiveCache.invalidateByPrefix(prefix);
}

// Clear all cache
export function clearAllCache(): void {
  aggressiveCache.clearAll();
}
