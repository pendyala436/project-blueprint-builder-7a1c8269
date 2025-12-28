import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WomenAvailabilitySettings {
  maxConcurrentChats: number;
  maxConcurrentCalls: number;
  currentChatCount: number;
  currentCallCount: number;
  isAvailable: boolean;
}

interface UseWomenAvailabilitySettingsResult {
  settings: WomenAvailabilitySettings;
  setMaxChats: (count: number) => Promise<void>;
  setMaxCalls: (count: number) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: WomenAvailabilitySettings = {
  maxConcurrentChats: 3,
  maxConcurrentCalls: 3,
  currentChatCount: 0,
  currentCallCount: 0,
  isAvailable: true
};

export const useWomenAvailabilitySettings = (userId?: string): UseWomenAvailabilitySettingsResult => {
  const [settings, setSettings] = useState<WomenAvailabilitySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("women_availability")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (data) {
          setSettings({
            maxConcurrentChats: data.max_concurrent_chats || 3,
            maxConcurrentCalls: data.max_concurrent_calls || 3,
            currentChatCount: data.current_chat_count || 0,
            currentCallCount: data.current_call_count || 0,
            isAvailable: data.is_available ?? true
          });
        } else {
          // Create default record for this woman
          await supabase
            .from("women_availability")
            .upsert({
              user_id: userId,
              max_concurrent_chats: 3,
              max_concurrent_calls: 3,
              current_chat_count: 0,
              current_call_count: 0,
              is_available: true
            }, { onConflict: 'user_id' });
        }
      } catch (error) {
        console.error("Error loading women availability settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Subscribe to changes
    if (userId) {
      const channel = supabase
        .channel(`women-availability-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'women_availability',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const data = payload.new as any;
            if (data) {
              setSettings({
                maxConcurrentChats: data.max_concurrent_chats || 3,
                maxConcurrentCalls: data.max_concurrent_calls || 3,
                currentChatCount: data.current_chat_count || 0,
                currentCallCount: data.current_call_count || 0,
                isAvailable: data.is_available ?? true
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const setMaxChats = useCallback(async (count: number) => {
    if (!userId || count < 1 || count > 3) return;

    setSettings(prev => ({ ...prev, maxConcurrentChats: count }));

    try {
      await supabase
        .from("women_availability")
        .upsert({
          user_id: userId,
          max_concurrent_chats: count,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error("Error saving max chats setting:", error);
    }
  }, [userId]);

  const setMaxCalls = useCallback(async (count: number) => {
    if (!userId || count < 1 || count > 3) return;

    setSettings(prev => ({ ...prev, maxConcurrentCalls: count }));

    try {
      await supabase
        .from("women_availability")
        .upsert({
          user_id: userId,
          max_concurrent_calls: count,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error("Error saving max calls setting:", error);
    }
  }, [userId]);

  return {
    settings,
    setMaxChats,
    setMaxCalls,
    isLoading
  };
};