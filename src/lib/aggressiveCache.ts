/**
 * Aggressive Caching System
 * Minimizes network calls with multi-layer caching
 */

import { LRUCache } from './performance';

// Cache configuration - aggressive durations
const CACHE_DURATIONS = {
  INSTANT: 0, // No cache
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 2 * 60 * 60 * 1000, // 2 hours
  PERMANENT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory cache with TTL support
class TTLCache<T> {
  private cache: LRUCache<string, CacheEntry<T>>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize = 500) {
    this.cache = new LRUCache(maxSize);
    this.startCleanup();
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: T, ttl: number = CACHE_DURATIONS.MEDIUM): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private startCleanup(): void {
    // Clean expired entries every minute
    this.cleanupTimer = setInterval(() => {
      // LRU cache handles cleanup via size limit
    }, 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Session storage cache for persistence across page refreshes
class SessionCache {
  private prefix = 'app_cache_';

  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const entry: CacheEntry<T> = JSON.parse(item);
      if (Date.now() - entry.timestamp > entry.ttl) {
        sessionStorage.removeItem(this.prefix + key);
        return null;
      }
      
      return entry.data;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T, ttl: number = CACHE_DURATIONS.LONG): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      sessionStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch {
      // Session storage full or unavailable
    }
  }

  delete(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => sessionStorage.removeItem(k));
  }
}

// Local storage cache for long-term persistence
class PersistentCache {
  private prefix = 'app_persist_';

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const entry: CacheEntry<T> = JSON.parse(item);
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      
      return entry.data;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T, ttl: number = CACHE_DURATIONS.PERMANENT): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch {
      // Local storage full or unavailable
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}

// Multi-layer cache manager
class AggressiveCacheManager {
  private memoryCache = new TTLCache<unknown>(1000);
  private sessionCache = new SessionCache();
  private persistentCache = new PersistentCache();
  private inflightRequests = new Map<string, Promise<unknown>>();

  // Get from fastest available cache layer
  get<T>(key: string): T | null {
    // Layer 1: Memory (fastest, ~1ms)
    const memResult = this.memoryCache.get(key) as T | null;
    if (memResult !== null) return memResult;

    // Layer 2: Session storage (~5ms)
    const sessionResult = this.sessionCache.get<T>(key);
    if (sessionResult !== null) {
      // Promote to memory cache
      this.memoryCache.set(key, sessionResult, CACHE_DURATIONS.MEDIUM);
      return sessionResult;
    }

    // Layer 3: Local storage (~10ms)
    const persistResult = this.persistentCache.get<T>(key);
    if (persistResult !== null) {
      // Promote to faster caches
      this.memoryCache.set(key, persistResult, CACHE_DURATIONS.MEDIUM);
      this.sessionCache.set(key, persistResult, CACHE_DURATIONS.LONG);
      return persistResult;
    }

    return null;
  }

  // Set in all cache layers
  set<T>(key: string, data: T, options?: {
    memoryTTL?: number;
    sessionTTL?: number;
    persistTTL?: number;
    persist?: boolean;
  }): void {
    const {
      memoryTTL = CACHE_DURATIONS.MEDIUM,
      sessionTTL = CACHE_DURATIONS.LONG,
      persistTTL = CACHE_DURATIONS.PERMANENT,
      persist = true,
    } = options || {};

    this.memoryCache.set(key, data, memoryTTL);
    this.sessionCache.set(key, data, sessionTTL);
    
    if (persist) {
      this.persistentCache.set(key, data, persistTTL);
    }
  }

  // Deduplicate concurrent requests
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      memoryTTL?: number;
      sessionTTL?: number;
      persistTTL?: number;
      persist?: boolean;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    // Check cache first (unless force refresh)
    if (!options?.forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null) return cached;
    }

    // Deduplicate concurrent requests
    const inflight = this.inflightRequests.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }

    // Make the request
    const request = fetcher().then((data) => {
      this.set(key, data, options);
      this.inflightRequests.delete(key);
      return data;
    }).catch((error) => {
      this.inflightRequests.delete(key);
      throw error;
    });

    this.inflightRequests.set(key, request);
    return request;
  }

  // Invalidate specific key
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    this.sessionCache.delete(key);
    this.persistentCache.delete(key);
  }

  // Invalidate keys by prefix
  invalidateByPrefix(prefix: string): void {
    // Memory cache doesn't support prefix deletion
    // Session and persistent caches handle this
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('app_cache_' + prefix))
      .forEach(k => sessionStorage.removeItem(k));
    
    Object.keys(localStorage)
      .filter(k => k.startsWith('app_persist_' + prefix))
      .forEach(k => localStorage.removeItem(k));
  }

  // Clear all caches
  clearAll(): void {
    this.memoryCache.clear();
    this.sessionCache.clear();
    this.persistentCache.clear();
    this.inflightRequests.clear();
  }

  destroy(): void {
    this.memoryCache.destroy();
    this.clearAll();
  }
}

// Singleton instance
export const aggressiveCache = new AggressiveCacheManager();

// Cache key generators
export const cacheKeys = {
  profile: (userId: string) => `profile:${userId}`,
  wallet: (userId: string) => `wallet:${userId}`,
  transactions: (userId: string, page?: number) => `transactions:${userId}:${page || 0}`,
  gifts: () => 'gifts:all',
  pricing: () => 'pricing:current',
  onlineUsers: (filter?: string) => `online:${filter || 'all'}`,
  chatMessages: (chatId: string) => `chat:${chatId}`,
  settings: () => 'settings:app',
  languages: () => 'languages:all',
  countries: () => 'countries:all',
};

// Export durations for external use
export { CACHE_DURATIONS };
