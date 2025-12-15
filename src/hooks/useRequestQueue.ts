/**
 * useRequestQueue Hook
 * 
 * React hook for monitoring and managing the offline request queue.
 * Provides visibility into pending requests and manual queue control.
 */

import { useState, useEffect, useCallback } from 'react';
import { requestQueue, type PendingRequest } from '@/lib/api';

interface UseRequestQueueReturn {
  pendingCount: number;
  pendingRequests: PendingRequest[];
  isProcessing: boolean;
  processQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  refreshQueue: () => Promise<void>;
}

/**
 * Hook to monitor and control the offline request queue
 */
export function useRequestQueue(): UseRequestQueueReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshQueue = useCallback(async () => {
    const requests = await requestQueue.getPendingRequests();
    setPendingRequests(requests);
    setPendingCount(requests.length);
  }, []);

  useEffect(() => {
    // Initial load
    refreshQueue();

    // Subscribe to queue events
    const unsubscribe = requestQueue.subscribe((event) => {
      switch (event.type) {
        case 'queue:add':
        case 'queue:complete':
          refreshQueue();
          break;
        case 'queue:process':
          setIsProcessing(true);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshQueue]);

  const processQueue = useCallback(async () => {
    setIsProcessing(true);
    try {
      await requestQueue.processQueue();
    } finally {
      setIsProcessing(false);
      await refreshQueue();
    }
  }, [refreshQueue]);

  const clearQueue = useCallback(async () => {
    await requestQueue.clearQueue();
    await refreshQueue();
  }, [refreshQueue]);

  return {
    pendingCount,
    pendingRequests,
    isProcessing,
    processQueue,
    clearQueue,
    refreshQueue,
  };
}

export default useRequestQueue;
