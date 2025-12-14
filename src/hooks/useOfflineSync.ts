/**
 * useOfflineSync.ts
 * 
 * PURPOSE: Handle offline data storage and sync using IndexedDB
 */

import { useState, useEffect, useCallback } from 'react';

interface SyncItem {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  synced: boolean;
}

const DB_NAME = 'meow-meow-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-sync';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
    };

    request.onsuccess = () => {
      setDb(request.result);
      countPendingItems(request.result);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    return () => {
      db?.close();
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingItems();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  // Count pending items
  const countPendingItems = useCallback(async (database: IDBDatabase) => {
    return new Promise<number>((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.count(IDBKeyRange.only(false));

      request.onsuccess = () => {
        setPendingCount(request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(0);
      };
    });
  }, []);

  // Add item for offline sync
  const addPendingItem = useCallback(async (type: string, data: unknown): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const item: SyncItem = {
        id,
        type,
        data,
        timestamp: Date.now(),
        synced: false,
      };

      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(item);

      request.onsuccess = () => {
        setPendingCount(prev => prev + 1);
        resolve(id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }, [db]);

  // Get all pending items
  const getPendingItems = useCallback(async (type?: string): Promise<SyncItem[]> => {
    if (!db) return [];

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const items: SyncItem[] = [];

      let request: IDBRequest;
      if (type) {
        const index = store.index('type');
        request = index.openCursor(IDBKeyRange.only(type));
      } else {
        request = store.openCursor();
      }

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (!cursor.value.synced) {
            items.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(items);
        }
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  }, [db]);

  // Mark item as synced
  const markAsSynced = useCallback(async (id: string): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => {
            setPendingCount(prev => Math.max(0, prev - 1));
            resolve();
          };
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }, [db]);

  // Delete synced items
  const clearSyncedItems = useCallback(async (): Promise<void> => {
    if (!db) return;

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.openCursor(IDBKeyRange.only(true));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => resolve();
    });
  }, [db]);

  // Sync all pending items
  const syncPendingItems = useCallback(async () => {
    if (!isOnline || isSyncing || !db) return;

    setIsSyncing(true);
    
    try {
      const items = await getPendingItems();
      
      for (const item of items) {
        try {
          // Trigger background sync if available
          if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
            const registration = await navigator.serviceWorker.ready;
            await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-messages');
          }
          
          await markAsSynced(item.id);
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
        }
      }

      // Clean up old synced items
      await clearSyncedItems();
    } finally {
      setIsSyncing(false);
      if (db) {
        await countPendingItems(db);
      }
    }
  }, [isOnline, isSyncing, db, getPendingItems, markAsSynced, clearSyncedItems, countPendingItems]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    addPendingItem,
    getPendingItems,
    markAsSynced,
    syncPendingItems,
    clearSyncedItems,
  };
}
