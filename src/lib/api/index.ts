/**
 * API Layer Index
 * 
 * Unified async API communication layer for Web, PWA, and Mobile.
 * Provides non-blocking requests, offline support, caching, and retry logic.
 */

// Core exports
export { apiClient } from './api-client';
export { networkMonitor } from './network-monitor';
export { requestQueue } from './request-queue';
export { cacheManager } from './cache-manager';

// Type exports
export type {
  HttpMethod,
  RequestConfig,
  ApiResponse,
  ApiError,
  ResponseMeta,
  RequestState,
  PendingRequest,
  NetworkStatus,
  CacheEntry,
  ApiEventType,
  ApiEvent,
  ApiEventHandler,
} from './types';

// Re-export for convenience
export { default as ApiClient } from './api-client';
export { default as NetworkMonitor } from './network-monitor';
export { default as RequestQueue } from './request-queue';
export { default as CacheManager } from './cache-manager';
