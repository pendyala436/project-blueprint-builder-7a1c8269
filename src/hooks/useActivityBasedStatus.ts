import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserActivity } from '@/contexts/UserActivityContext';
import { isSignedOut } from '@/hooks/useAuthReady';

interface UseActivityBasedStatusOptions {
  inactivityTimeout?: number;
  userId: string;
  onStatusChange?: (isOnline: boolean) => void;
}

export const useActivityBasedStatus = ({
  inactivityTimeout = 10 * 60 * 1000,
  userId,
  onStatusChange
}: UseActivityBasedStatusOptions) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isManuallyOffline, setIsManuallyOffline] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastDbUpdateRef = useRef<number>(0);

  const { subscribe } = useUserActivity();

  // LIGHTWEIGHT status update - only sets is_online + last_seen.
  const updateOnlineStatus = useCallback(async (online: boolean) => {
    if (!userId) return;
    
    const now = Date.now();
    if (online && now - lastDbUpdateRef.current < 10000) return;
    lastDbUpdateRef.current = now;
    
    try {
      await supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          is_online: online,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }, [userId]);

  const goOnline = useCallback(() => {
    if (isManuallyOffline) return;
    if (!isOnline) {
      setIsOnline(true);
      lastDbUpdateRef.current = 0;
      updateOnlineStatus(true);
      onStatusChange?.(true);
    }
    lastActivityRef.current = Date.now();
  }, [isOnline, isManuallyOffline, updateOnlineStatus, onStatusChange]);

  const goOffline = useCallback(() => {
    if (isOnline && !isManuallyOffline) {
      setIsOnline(false);
      lastDbUpdateRef.current = 0;
      updateOnlineStatus(false);
      onStatusChange?.(false);
    }
  }, [isOnline, isManuallyOffline, updateOnlineStatus, onStatusChange]);

  const toggleOnlineStatus = useCallback((online: boolean) => {
    setIsManuallyOffline(!online);
    setIsOnline(online);
    lastDbUpdateRef.current = 0;
    updateOnlineStatus(online);
    onStatusChange?.(online);
    if (online) lastActivityRef.current = Date.now();
  }, [updateOnlineStatus, onStatusChange]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (isManuallyOffline) return;
    goOnline();
    inactivityTimerRef.current = setTimeout(goOffline, inactivityTimeout);
  }, [inactivityTimeout, goOnline, goOffline, isManuallyOffline]);

  // Subscribe to shared activity context instead of binding own DOM listeners
  useEffect(() => {
    if (!userId) return;

    resetInactivityTimer();

    const unsubscribe = subscribe(() => {
      resetInactivityTimer();
    });

    return () => {
      unsubscribe();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [userId, resetInactivityTimer, subscribe]);

  // Set offline on unmount — only if user hasn't signed out
  useEffect(() => {
    return () => {
      if (userId && !globalThis.__supabaseSignedOut) {
        supabase.from('user_status').upsert({
          user_id: userId,
          is_online: false,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(() => {}, () => {});
      }
    };
  }, [userId]);

  return { isOnline, isManuallyOffline, toggleOnlineStatus, goOnline, goOffline };
};
