import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  // LIGHTWEIGHT status update - only sets is_online + last_seen.
  // Busy/online status_text is handled by the DB trigger
  // 'sync_user_availability_on_session_change' which monitors
  // active_chat_sessions and video_call_sessions automatically.
  const updateOnlineStatus = useCallback(async (online: boolean) => {
    if (!userId) return;
    
    // Throttle DB updates to max once per 10s when staying online
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

  const handleActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  useEffect(() => {
    if (!userId) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    let lastEventTime = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastEventTime > 5000) { // 5s throttle (was 1s)
        lastEventTime = now;
        handleActivity();
      }
    };

    events.forEach(e => window.addEventListener(e, throttledHandler, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleActivity();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetInactivityTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, throttledHandler));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [userId, handleActivity, resetInactivityTimer]);

  // Set offline on unmount
  useEffect(() => {
    return () => {
      if (userId) {
        supabase.from('user_status').upsert({
          user_id: userId,
          is_online: false,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(() => {});
      }
    };
  }, [userId]);

  return { isOnline, isManuallyOffline, toggleOnlineStatus, goOnline, goOffline };
};
