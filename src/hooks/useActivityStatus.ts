/**
 * useActivityStatus Hook
 * 
 * Tracks user activity and manages online/offline status in the database.
 * Updates status to offline after a period of inactivity.
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const INACTIVITY_TIMEOUT = 180000; // 3 minutes in ms
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export const useActivityStatus = (userId: string | null) => {
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Set user online status in database
  const setOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!userId) return;

    try {
      const { data: existing } = await supabase
        .from("user_status")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_status")
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_status")
          .insert({
            user_id: userId,
            is_online: isOnline,
            last_seen: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  }, [userId]);

  // Start activity tracking
  useEffect(() => {
    if (!userId) return;

    // Activity event handlers
    const handleActivity = () => {
      const wasInactive = Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT;
      updateActivity();
      
      // If user was inactive and is now active, set them online
      if (wasInactive) {
        setOnlineStatus(true);
      }
    };

    // Add activity listeners
    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Set initial online status
    setOnlineStatus(true);

    // Heartbeat - periodically update online status
    heartbeatIntervalRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceActivity < INACTIVITY_TIMEOUT) {
        // User is active, keep them online
        setOnlineStatus(true);
      }
    }, HEARTBEAT_INTERVAL);

    // Inactivity check - set offline if no activity
    inactivityCheckRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        // User is inactive, set them offline
        setOnlineStatus(false);
      }
    }, 10000); // Check every 10 seconds

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, mark as offline after short delay
        setTimeout(() => {
          if (document.hidden) {
            setOnlineStatus(false);
          }
        }, 30000); // 30 seconds grace period
      } else {
        // Page is visible again
        updateActivity();
        setOnlineStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload - set offline
    const handleBeforeUnload = async () => {
      // Set offline status when page closes
      try {
        await supabase
          .from("user_status")
          .update({
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq("user_id", userId);
      } catch (error) {
        // Best effort - may not complete before page unloads
        console.error("Error setting offline on unload:", error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (inactivityCheckRef.current) {
        clearInterval(inactivityCheckRef.current);
      }

      // Set offline when hook unmounts
      setOnlineStatus(false);
    };
  }, [userId, updateActivity, setOnlineStatus]);

  return {
    updateActivity,
    setOnlineStatus
  };
};
