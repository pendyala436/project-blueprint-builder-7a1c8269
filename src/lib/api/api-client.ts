/**
 * API Client
 * 
 * Core async HTTP client with retry logic, timeout handling,
 * and platform-agnostic implementation using fetch API.
 */

import type { 
  RequestConfig, 
  ApiResponse, 
  ApiError, 
  HttpMethod,
  ApiEventHandler,
  ApiEvent 
} from './types';
import { networkMonitor } from './network-monitor';
import { requestQueue } from './request-queue';
import { cacheManager } from './cache-manager';

// Default configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const RETRY_MULTIPLIER = 2; // Exponential backoff

class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string = '';
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  private listeners: Set<ApiEventHandler> = new Set();
  private authTokenProvider: (() => Promise<string | null>) | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Configure the API client
   */
  configure(options: {
    baseUrl?: string;
    headers?: Record<string, string>;
    authTokenProvider?: () => Promise<string | null>;
  }): void {
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
    if (options.headers) {
      this.defaultHeaders = { ...this.defaultHeaders, ...options.headers };
    }
    if (options.authTokenProvider) {
      this.authTokenProvider = options.authTokenProvider;
    }
  }

  private emit(event: ApiEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('API client listener error:', error);
      }
    });
  }

  private createError(code: string, message: string, retryable = false, details?: unknown): ApiError {
    return { code, message, retryable, details };
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.authTokenProvider) return {};
    
    try {
      const token = await this.authTokenProvider();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    return {};
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryableError(status: number): boolean {
    // Retry on server errors and rate limiting
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Make an async HTTP request
   */
  async request<TResponse = unknown, TBody = unknown>(
    url: string,
    config: RequestConfig<TBody> = {}
  ): Promise<ApiResponse<TResponse>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
      idempotencyKey,
      skipAuth = false,
      cacheKey,
      cacheTTL,
      priority = 'normal',
      signal,
    } = config;

    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Check cache for GET requests
    if (method === 'GET' && cacheKey) {
      const cached = cacheManager.get<TResponse>(cacheKey);
      if (cached !== null) {
        return {
          success: true,
          data: cached,
          meta: {
            cached: true,
            timestamp: Date.now(),
            requestId,
          },
        };
      }
    }

    // Check if offline and queue if needed
    if (!networkMonitor.isOnline()) {
      if (method !== 'GET') {
        // Queue non-GET requests for later
        try {
          await requestQueue.enqueue({
            url: fullUrl,
            method,
            body,
            headers: { ...this.defaultHeaders, ...headers },
            maxRetries: retries,
            idempotencyKey,
            priority,
          });

          return {
            success: false,
            error: this.createError(
              'OFFLINE_QUEUED',
              'Request queued for when connection is restored',
              true
            ),
            meta: { cached: false, timestamp: Date.now(), requestId },
          };
        } catch (queueError) {
          return {
            success: false,
            error: this.createError(
              'OFFLINE',
              'No internet connection',
              true
            ),
            meta: { cached: false, timestamp: Date.now(), requestId },
          };
        }
      }

      return {
        success: false,
        error: this.createError('OFFLINE', 'No internet connection', true),
        meta: { cached: false, timestamp: Date.now(), requestId },
      };
    }

    // Check for duplicate idempotent requests
    if (idempotencyKey && method !== 'GET') {
      const isDuplicate = await requestQueue.hasDuplicateRequest(idempotencyKey);
      if (isDuplicate) {
        return {
          success: false,
          error: this.createError(
            'DUPLICATE_REQUEST',
            'A similar request is already pending',
            false
          ),
          meta: { cached: false, timestamp: Date.now(), requestId },
        };
      }
    }

    // Build headers
    const authHeaders = skipAuth ? {} : await this.getAuthHeaders();
    const finalHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...authHeaders,
      ...headers,
    };

    if (idempotencyKey) {
      finalHeaders['X-Idempotency-Key'] = idempotencyKey;
    }

    // Emit request start event
    this.emit({
      type: 'request:start',
      timestamp: Date.now(),
      data: { url: fullUrl, method, requestId },
    });

    let lastError: ApiError | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Merge signals if provided
        const abortSignal = signal
          ? this.mergeAbortSignals([signal, controller.signal])
          : controller.signal;

        const response = await fetch(fullUrl, {
          method,
          headers: finalHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: abortSignal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        // Parse response
        let responseData: TResponse | undefined;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          try {
            responseData = await response.json();
          } catch {
            // Empty or invalid JSON response
          }
        } else if (response.ok) {
          try {
            const text = await response.text();
            if (text) {
              responseData = JSON.parse(text);
            }
          } catch {
            // Non-JSON response
          }
        }

        if (response.ok) {
          // Cache successful GET responses
          if (method === 'GET' && cacheKey && responseData !== undefined) {
            cacheManager.set(cacheKey, responseData, cacheTTL);
          }

          this.emit({
            type: 'request:success',
            timestamp: Date.now(),
            data: { url: fullUrl, method, requestId, status: response.status, duration },
          });

          return {
            success: true,
            data: responseData,
            meta: {
              cached: false,
              timestamp: Date.now(),
              requestId,
              duration,
            },
          };
        }

        // Handle error response
        const errorMessage = this.extractErrorMessage(responseData);
        lastError = this.createError(
          `HTTP_${response.status}`,
          errorMessage || `Request failed with status ${response.status}`,
          this.isRetryableError(response.status),
          responseData
        );

        // Don't retry non-retryable errors
        if (!this.isRetryableError(response.status)) {
          break;
        }

      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = this.createError('TIMEOUT', 'Request timed out', true);
          } else {
            lastError = this.createError(
              'NETWORK_ERROR',
              error.message || 'Network request failed',
              true
            );
          }
        } else {
          lastError = this.createError('UNKNOWN_ERROR', 'An unknown error occurred', true);
        }
      }

      // Retry logic
      if (attempt < retries && lastError?.retryable) {
        const delay = retryDelay * Math.pow(RETRY_MULTIPLIER, attempt);
        
        this.emit({
          type: 'request:retry',
          timestamp: Date.now(),
          data: { url: fullUrl, method, requestId, attempt: attempt + 1, delay },
        });

        await this.delay(delay);
      }

      attempt++;
    }

    // All retries exhausted
    this.emit({
      type: 'request:error',
      timestamp: Date.now(),
      data: { url: fullUrl, method, requestId, error: lastError },
    });

    return {
      success: false,
      error: lastError || this.createError('UNKNOWN_ERROR', 'Request failed', false),
      meta: {
        cached: false,
        timestamp: Date.now(),
        requestId,
        duration: Date.now() - startTime,
      },
    };
  }

  private extractErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    
    const errorObj = data as Record<string, unknown>;
    return (
      (errorObj.message as string) ||
      (errorObj.error as string) ||
      (errorObj.error_description as string) ||
      null
    );
  }

  private mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return controller.signal;
  }

  // Convenience methods
  async get<T>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T, B = unknown>(url: string, body?: B, config?: Omit<RequestConfig<B>, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T, B>(url, { ...config, method: 'POST', body });
  }

  async put<T, B = unknown>(url: string, body?: B, config?: Omit<RequestConfig<B>, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T, B>(url, { ...config, method: 'PUT', body });
  }

  async patch<T, B = unknown>(url: string, body?: B, config?: Omit<RequestConfig<B>, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T, B>(url, { ...config, method: 'PATCH', body });
  }

  async delete<T>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * Subscribe to API events
   */
  subscribe(handler: ApiEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }
}

// Export singleton
export const apiClient = ApiClient.getInstance();
export default apiClient;
