/**
 * useApiRequest Hook
 * 
 * React hook for making async API requests with built-in state management.
 * Provides loading, success, and error states for consistent UX.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, type RequestConfig, type ApiResponse, type ApiError, type RequestState } from '@/lib/api';

interface UseApiRequestOptions<TResponse> {
  onSuccess?: (data: TResponse) => void;
  onError?: (error: ApiError) => void;
  immediate?: boolean;
}

interface UseApiRequestReturn<TResponse, TBody> extends RequestState<TResponse> {
  execute: (url: string, config?: RequestConfig<TBody>) => Promise<ApiResponse<TResponse>>;
  reset: () => void;
}

/**
 * Hook for making single API requests with state management
 */
export function useApiRequest<TResponse = unknown, TBody = unknown>(
  options: UseApiRequestOptions<TResponse> = {}
): UseApiRequestReturn<TResponse, TBody> {
  const { onSuccess, onError } = options;
  
  const [state, setState] = useState<RequestState<TResponse>>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    data: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async (
    url: string,
    config: RequestConfig<TBody> = {}
  ): Promise<ApiResponse<TResponse>> => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    if (mountedRef.current) {
      setState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        data: null,
        error: null,
      });
    }

    const response = await apiClient.request<TResponse, TBody>(url, {
      ...config,
      signal: abortControllerRef.current.signal,
    });

    if (!mountedRef.current) {
      return response;
    }

    if (response.success && response.data !== undefined) {
      setState({
        isLoading: false,
        isSuccess: true,
        isError: false,
        data: response.data,
        error: null,
      });
      onSuccess?.(response.data);
    } else {
      setState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        data: null,
        error: response.error || null,
      });
      if (response.error) {
        onError?.(response.error);
      }
    }

    return response;
  }, [onSuccess, onError]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    if (mountedRef.current) {
      setState({
        isLoading: false,
        isSuccess: false,
        isError: false,
        data: null,
        error: null,
      });
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for GET requests with auto-fetch capability
 */
export function useApiGet<TResponse = unknown>(
  url: string | null,
  config?: Omit<RequestConfig, 'method' | 'body'>,
  options: UseApiRequestOptions<TResponse> & { enabled?: boolean } = {}
): RequestState<TResponse> & { refetch: () => Promise<void> } {
  const { enabled = true, ...restOptions } = options;
  const { execute, ...state } = useApiRequest<TResponse>(restOptions);

  const refetch = useCallback(async () => {
    if (url) {
      await execute(url, { ...config, method: 'GET' });
    }
  }, [url, config, execute]);

  useEffect(() => {
    if (enabled && url) {
      execute(url, { ...config, method: 'GET' });
    }
  }, [enabled, url, JSON.stringify(config)]);

  return {
    ...state,
    refetch,
  };
}

/**
 * Hook for mutation requests (POST, PUT, PATCH, DELETE)
 */
export function useApiMutation<TResponse = unknown, TBody = unknown>(
  options: UseApiRequestOptions<TResponse> = {}
): {
  mutate: (url: string, body?: TBody, config?: Omit<RequestConfig<TBody>, 'body'>) => Promise<ApiResponse<TResponse>>;
  mutateAsync: (url: string, body?: TBody, config?: Omit<RequestConfig<TBody>, 'body'>) => Promise<TResponse>;
} & RequestState<TResponse> {
  const { execute, ...state } = useApiRequest<TResponse, TBody>(options);

  const mutate = useCallback(async (
    url: string,
    body?: TBody,
    config: Omit<RequestConfig<TBody>, 'body'> = {}
  ): Promise<ApiResponse<TResponse>> => {
    return execute(url, { ...config, method: config.method || 'POST', body });
  }, [execute]);

  const mutateAsync = useCallback(async (
    url: string,
    body?: TBody,
    config: Omit<RequestConfig<TBody>, 'body'> = {}
  ): Promise<TResponse> => {
    const response = await execute(url, { ...config, method: config.method || 'POST', body });
    if (!response.success || response.data === undefined) {
      throw response.error || new Error('Request failed');
    }
    return response.data;
  }, [execute]);

  return {
    ...state,
    mutate,
    mutateAsync,
  };
}

export default useApiRequest;
