/**
 * Network Monitor
 * 
 * Cross-platform network status detection for Web, PWA, and Mobile.
 * Uses Navigator.connection API with fallbacks for unsupported browsers.
 */

import type { NetworkStatus, ApiEventHandler, ApiEvent } from './types';

class NetworkMonitor {
  private static instance: NetworkMonitor;
  private status: NetworkStatus;
  private listeners: Set<ApiEventHandler> = new Set();
  private connection: NetworkInformation | null = null;

  private constructor() {
    this.status = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'unknown',
    };

    if (typeof navigator !== 'undefined') {
      this.initializeConnectionInfo();
      this.setupEventListeners();
    }
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private initializeConnectionInfo(): void {
    // Navigator.connection API (Chrome, Edge, Opera, Samsung Internet)
    const nav = navigator as NavigatorWithConnection;
    if (nav.connection) {
      this.connection = nav.connection;
      this.updateConnectionStatus();
    }
  }

  private updateConnectionStatus(): void {
    if (this.connection) {
      this.status = {
        isOnline: navigator.onLine,
        connectionType: this.mapConnectionType(this.connection.type),
        effectiveType: this.connection.effectiveType as NetworkStatus['effectiveType'],
        downlink: this.connection.downlink,
        rtt: this.connection.rtt,
      };
    } else {
      this.status = {
        isOnline: navigator.onLine,
        connectionType: 'unknown',
      };
    }
  }

  private mapConnectionType(type?: string): NetworkStatus['connectionType'] {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }

  private setupEventListeners(): void {
    // Online/offline events (universal)
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Connection change event (where supported)
    if (this.connection) {
      this.connection.addEventListener('change', this.handleConnectionChange);
    }
  }

  private handleOnline = (): void => {
    this.status.isOnline = true;
    this.updateConnectionStatus();
    this.emit({
      type: 'network:online',
      timestamp: Date.now(),
      data: this.status,
    });
  };

  private handleOffline = (): void => {
    this.status.isOnline = false;
    this.emit({
      type: 'network:offline',
      timestamp: Date.now(),
      data: this.status,
    });
  };

  private handleConnectionChange = (): void => {
    this.updateConnectionStatus();
  };

  private emit(event: ApiEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Network monitor listener error:', error);
      }
    });
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    // Refresh before returning
    if (typeof navigator !== 'undefined') {
      this.status.isOnline = navigator.onLine;
    }
    return { ...this.status };
  }

  /**
   * Check if network is online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Check if connection is slow (2G or slow-2g)
   */
  isSlowConnection(): boolean {
    const effectiveType = this.status.effectiveType;
    return effectiveType === 'slow-2g' || effectiveType === '2g';
  }

  /**
   * Subscribe to network events
   */
  subscribe(handler: ApiEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.connection) {
      this.connection.removeEventListener('change', this.handleConnectionChange);
    }
    this.listeners.clear();
  }
}

// Network Information API types
interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

// Export singleton
export const networkMonitor = NetworkMonitor.getInstance();
export default networkMonitor;
