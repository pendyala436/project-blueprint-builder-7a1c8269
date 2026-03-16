/**
 * Cache Manager
 * 
 * In-memory and persistent caching for API responses.
 * Supports TTL, cache invalidation, and stale-while-revalidate patterns.
 */

import type { CacheEntry, ApiEventHandler, ApiEvent } from './types';

const CACHE_PREFIX = 'meow-api-cache';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private listeners: Set<ApiEventHandler> = new Set();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private emit(event: ApiEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Cache listener error:', error);
      }
    });
  }

  private generateKey(url: string, params?: Record<string, unknown>): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${url}?${sortedParams}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (!this.isExpired(memoryEntry)) {
        this.emit({ type: 'cache:hit', timestamp: Date.now(), data: { key } });
        return memoryEntry.data as T;
      }
      // Remove expired entry
      this.memoryCache.delete(key);
    }

    // Check localStorage as fallback
    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}:${key}`);
      if (stored) {
        const entry: CacheEntry = JSON.parse(stored);
        if (!this.isExpired(entry)) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          this.emit({ type: 'cache:hit', timestamp: Date.now(), data: { key } });
          return entry.data as T;
        }
        // Remove expired entry
        localStorage.removeItem(`${CACHE_PREFIX}:${key}`);
      }
    } catch (error) {
      // localStorage not available or corrupted data
    }

    this.emit({ type: 'cache:miss', timestamp: Date.now(), data: { key } });
    return null;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL, persist = false): void {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Always store in memory
    this.memoryCache.set(key, entry);

    // Optionally persist to localStorage
    if (persist) {
      try {
        localStorage.setItem(`${CACHE_PREFIX}:${key}`, JSON.stringify(entry));
      } catch (error) {
        // localStorage full or not available
        console.warn('Failed to persist cache:', error);
      }
    }

    this.emit({ type: 'cache:update', timestamp: Date.now(), data: { key } });
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific cache entry
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`${CACHE_PREFIX}:${key}`);
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          const cacheKey = key.replace(`${CACHE_PREFIX}:`, '');
          if (regex.test(cacheKey)) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const entry: CacheEntry = JSON.parse(stored);
              if (now > entry.timestamp + entry.ttl) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key);
            }
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { memorySize: number; entries: number } {
    return {
      memorySize: this.memoryCache.size,
      entries: this.memoryCache.size,
    };
  }

  /**
   * Generate a cache key from URL and parameters
   */
  createKey(url: string, params?: Record<string, unknown>): string {
    return this.generateKey(url, params);
  }

  /**
   * Subscribe to cache events
   */
  subscribe(handler: ApiEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.listeners.clear();
  }
}

// Export singleton
export const cacheManager = CacheManager.getInstance();
export default cacheManager;
