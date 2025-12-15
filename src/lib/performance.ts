/**
 * Performance utilities and monitoring
 */

// Performance mark helpers
export const perfMark = {
  start: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
  },
  end: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const entries = performance.getEntriesByName(name);
        const duration = entries[entries.length - 1]?.duration;
        if (process.env.NODE_ENV === 'development' && duration) {
          console.debug(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
        }
        return duration;
      } catch {
        return undefined;
      }
    }
    return undefined;
  },
};

// Request batching for reducing API calls
export class RequestBatcher<T, R> {
  private pending: Map<string, { resolve: (r: R) => void; reject: (e: Error) => void }[]> = new Map();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private batchFn: (keys: string[]) => Promise<Map<string, R>>;
  private delay: number;

  constructor(batchFn: (keys: string[]) => Promise<Map<string, R>>, delay = 10) {
    this.batchFn = batchFn;
    this.delay = delay;
  }

  async get(key: string): Promise<R> {
    return new Promise((resolve, reject) => {
      const existing = this.pending.get(key);
      if (existing) {
        existing.push({ resolve, reject });
      } else {
        this.pending.set(key, [{ resolve, reject }]);
      }

      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  private async flush() {
    this.timer = null;
    const batch = new Map(this.pending);
    this.pending.clear();

    try {
      const keys = Array.from(batch.keys());
      const results = await this.batchFn(keys);

      for (const [key, callbacks] of batch) {
        const result = results.get(key);
        if (result !== undefined) {
          callbacks.forEach(({ resolve }) => resolve(result));
        } else {
          callbacks.forEach(({ reject }) => reject(new Error(`No result for key: ${key}`)));
        }
      }
    } catch (error) {
      for (const callbacks of batch.values()) {
        callbacks.forEach(({ reject }) => reject(error as Error));
      }
    }
  }
}

// Memory-efficient LRU cache
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Debounced function factory
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

// Throttled function factory
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= interval) {
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
        timeoutId = null;
      }, interval - timeSinceLastCall);
    }
  };
}

// Chunk array for batch processing
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Parallel async operations with concurrency limit
export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then((result) => {
      results.push(result);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((e) => e === p),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// Image preloader
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Preload images in batch
export async function preloadImages(srcs: string[], concurrency = 3): Promise<void> {
  await parallelLimit(srcs, concurrency, preloadImage);
}

// Memory usage tracker (dev only)
export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
    };
  }
  return null;
}
