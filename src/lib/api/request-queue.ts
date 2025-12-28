/**
 * Request Queue
 * 
 * Manages offline request queuing and automatic retry.
 * Uses IndexedDB for persistence across sessions.
 */

import type { PendingRequest, ApiEventHandler, ApiEvent } from './types';
import { networkMonitor } from './network-monitor';

const DB_NAME = 'meow-api-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

class RequestQueue {
  private static instance: RequestQueue;
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private listeners: Set<ApiEventHandler> = new Set();
  private processInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.initPromise = this.initialize();
  }

  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  private async initialize(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      this.isInitialized = true;
      return;
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      
      // Subscribe to network changes
      networkMonitor.subscribe((event) => {
        if (event.type === 'network:online') {
          this.processQueue();
        }
      });

      // Process queue periodically when online
      this.processInterval = setInterval(() => {
        if (networkMonitor.isOnline()) {
          this.processQueue();
        }
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('Failed to initialize request queue:', error);
      this.isInitialized = true; // Mark as initialized even on error to prevent hanging
    }
  }
  
  // Wait for initialization to complete
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('idempotencyKey', 'idempotencyKey', { unique: false });
        }
      };
    });
  }

  private emit(event: ApiEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Queue listener error:', error);
      }
    });
  }

  /**
   * Add a request to the queue
   */
  async enqueue(request: Omit<PendingRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Queue database not initialized');
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingRequest: PendingRequest = {
      ...request,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const addRequest = store.add(pendingRequest);

      addRequest.onsuccess = () => {
        this.emit({
          type: 'queue:add',
          timestamp: Date.now(),
          data: { id, url: request.url },
        });
        resolve(id);
      };

      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  /**
   * Remove a request from the queue
   */
  async dequeue(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  /**
   * Get all pending requests
   */
  async getPendingRequests(): Promise<PendingRequest[]> {
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('priority');
      const requests: PendingRequest[] = [];

      // Cursor through by priority (high first)
      const cursorRequest = index.openCursor(null, 'prev');

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          requests.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by priority then timestamp
          requests.sort((a, b) => {
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
          });
          resolve(requests);
        }
      };

      cursorRequest.onerror = () => resolve([]);
    });
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
    });
  }

  /**
   * Check for duplicate request by idempotency key
   */
  async hasDuplicateRequest(idempotencyKey: string): Promise<boolean> {
    if (!this.db || !idempotencyKey) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('idempotencyKey');
      const getRequest = index.get(idempotencyKey);

      getRequest.onsuccess = () => resolve(!!getRequest.result);
      getRequest.onerror = () => resolve(false);
    });
  }

  /**
   * Process the queue (called when online)
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !networkMonitor.isOnline()) return;

    this.isProcessing = true;
    this.emit({ type: 'queue:process', timestamp: Date.now() });

    try {
      const requests = await this.getPendingRequests();

      for (const request of requests) {
        if (!networkMonitor.isOnline()) break;

        try {
          // Attempt to send the request
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
              ...request.headers,
            },
            body: request.body ? JSON.stringify(request.body) : undefined,
          });

          if (response.ok) {
            await this.dequeue(request.id);
            this.emit({
              type: 'queue:complete',
              timestamp: Date.now(),
              data: { id: request.id, success: true },
            });
          } else if (request.retryCount < request.maxRetries) {
            // Update retry count
            await this.updateRetryCount(request.id, request.retryCount + 1);
          } else {
            // Max retries reached, remove from queue
            await this.dequeue(request.id);
            this.emit({
              type: 'queue:complete',
              timestamp: Date.now(),
              data: { id: request.id, success: false, error: 'Max retries reached' },
            });
          }
        } catch (error) {
          if (request.retryCount < request.maxRetries) {
            await this.updateRetryCount(request.id, request.retryCount + 1);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async updateRetryCount(id: string, retryCount: number): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const request = getRequest.result;
        if (request) {
          request.retryCount = retryCount;
          const putRequest = store.put(request);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Clear all pending requests
   */
  async clearQueue(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  /**
   * Subscribe to queue events
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
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    this.db?.close();
    this.listeners.clear();
  }
}

// Export singleton
export const requestQueue = RequestQueue.getInstance();
export default requestQueue;
