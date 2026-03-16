/**
 * Network Status Indicator Component
 * 
 * Displays current network status with offline indicator.
 * Shows pending request count when offline.
 */

import React from 'react';
import { Wifi, WifiOff, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRequestQueue } from '@/hooks/useRequestQueue';

interface NetworkStatusIndicatorProps {
  className?: string;
  showPendingCount?: boolean;
  compact?: boolean;
}

export function NetworkStatusIndicator({
  className,
  showPendingCount = true,
  compact = false,
}: NetworkStatusIndicatorProps) {
  const { isOnline, connectionType, isSlowConnection } = useNetworkStatus();
  const { pendingCount, isProcessing } = useRequestQueue();

  // Don't render anything when online and no pending requests
  if (isOnline && pendingCount === 0 && !isProcessing) {
    return null;
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
          isOnline
            ? 'bg-primary/10 text-primary'
            : 'bg-destructive/10 text-destructive',
          className
        )}
      >
        {isOnline ? (
          isProcessing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wifi className="h-3 w-3" />
          )
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {showPendingCount && pendingCount > 0 && (
          <span>{pendingCount}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
        isOnline
          ? 'bg-primary/10 text-primary'
          : 'bg-destructive/10 text-destructive',
        className
      )}
    >
      {isOnline ? (
        isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wifi className="h-4 w-4" />
        )
      ) : (
        <CloudOff className="h-4 w-4" />
      )}
      
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {isOnline ? (
            isProcessing ? 'Syncing...' : 'Online'
          ) : (
            'Offline'
          )}
        </span>
        
        {showPendingCount && pendingCount > 0 && (
          <span className="text-xs opacity-75">
            {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}
          </span>
        )}
        
        {isOnline && connectionType && connectionType !== 'unknown' && (
          <span className="text-xs opacity-75 capitalize">
            {connectionType}
            {isSlowConnection && ' (slow)'}
          </span>
        )}
      </div>
    </div>
  );
}

export default NetworkStatusIndicator;
