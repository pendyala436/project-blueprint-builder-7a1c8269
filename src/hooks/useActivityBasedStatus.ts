import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseActivityBasedStatusOptions {
  inactivityTimeout?: number; // in milliseconds, default 10 minutes
  userId: string;
  onStatusChange?: (isOnline: boolean) => void;
}

export const useActivityBasedStatus = ({
  inactivityTimeout = 10 * 60 * 1000, // 10 minutes default
  userId,
  onStatusChange
}: UseActivityBasedStatusOptions) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isManuallyOffline, setIsManuallyOffline] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Update online status in database
  const updateOnlineStatus = useCallback(async (online: boolean) => {
    if (!userId) return;
    
    try {
      await supabase
        .from('user_status')
        .update({
          is_online: online,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }, [userId]);

  // Handle going online
  const goOnline = useCallback(() => {
    if (isManuallyOffline) return; // Don't auto-online if manually offline
    
    if (!isOnline) {
      setIsOnline(true);
      updateOnlineStatus(true);
      onStatusChange?.(true);
    }
    lastActivityRef.current = Date.now();
  }, [isOnline, isManuallyOffline, updateOnlineStatus, onStatusChange]);

  // Handle going offline (auto)
  const goOffline = useCallback(() => {
    if (isOnline && !isManuallyOffline) {
      setIsOnline(false);
      updateOnlineStatus(false);
      onStatusChange?.(false);
    }
  }, [isOnline, isManuallyOffline, updateOnlineStatus, onStatusChange]);

  // Manual toggle
  const toggleOnlineStatus = useCallback((online: boolean) => {
    setIsManuallyOffline(!online);
    setIsOnline(online);
    updateOnlineStatus(online);
    onStatusChange?.(online);
    
    if (online) {
      // Reset activity timer when manually going online
      lastActivityRef.current = Date.now();
    }
  }, [updateOnlineStatus, onStatusChange]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // If manually offline, don't set auto-offline timer
    if (isManuallyOffline) return;
    
    // Go online on activity
    goOnline();
    
    // Set new timeout
    inactivityTimerRef.current = setTimeout(() => {
      goOffline();
    }, inactivityTimeout);
  }, [inactivityTimeout, goOnline, goOffline, isManuallyOffline]);

  // Activity event handler
  const handleActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Setup activity listeners
  useEffect(() => {
    if (!userId) return;

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel'
    ];

    // Throttle activity events to avoid excessive updates
    let lastEventTime = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastEventTime > 1000) { // Throttle to once per second
        lastEventTime = now;
        handleActivity();
      }
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    // Also listen for visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial online status
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledHandler);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [userId, handleActivity, resetInactivityTimer]);

  // Cleanup on unmount - set offline
  useEffect(() => {
    return () => {
      if (userId) {
        updateOnlineStatus(false);
      }
    };
  }, [userId, updateOnlineStatus]);

  return {
    isOnline,
    isManuallyOffline,
    toggleOnlineStatus,
    goOnline,
    goOffline
  };
};
