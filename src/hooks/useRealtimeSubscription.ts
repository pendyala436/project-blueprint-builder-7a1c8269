import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

type TableName = 
  | "profiles"
  | "female_profiles"
  | "male_profiles"
  | "active_chat_sessions"
  | "video_call_sessions"
  | "chat_messages"
  | "wallets"
  | "wallet_transactions"
  | "women_earnings"
  | "shift_earnings"
  | "user_status"
  | "women_availability"
  | "language_limits"
  | "language_groups"
  | "chat_pricing"
  | "notifications"
  | "gifts"
  | "gift_transactions"
  | "shifts"
  | "scheduled_shifts"
  | "absence_records"
  | "women_shift_assignments"
  | "user_settings"
  | "women_earnings"
  | "matches"
  | "user_languages"
  | "withdrawal_requests"
  | "moderation_reports"
  | "policy_violation_alerts"
  | "audit_logs"
  | "backup_logs"
  | "system_metrics"
  | "system_alerts"
  | "admin_settings"
  | "legal_documents"
  | "user_roles"
  | "attendance"
  | "user_friends"
  | "user_blocks"
  | "user_warnings"
  | "user_photos"
  | "processing_logs"
  | "app_settings"
  | "shift_earnings"
  | "chat_wait_queue"
  | "platform_metrics";

interface UseRealtimeSubscriptionOptions {
  table: TableName;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onUpdate: () => void;
  enabled?: boolean;
  debounceMs?: number; // Debounce for high-frequency updates
}

export const useRealtimeSubscription = ({
  table,
  event = "*",
  filter,
  onUpdate,
  enabled = true,
  debounceMs = 100 // Default 100ms debounce for high concurrency
}: UseRealtimeSubscriptionOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Debounced update handler for scale
  const debouncedUpdate = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onUpdateRef.current(), debounceMs);
  }, [debounceMs]);

  const setupSubscription = useCallback(() => {
    if (!enabled) return;

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Unique channel name with timestamp for clean reconnects
    const channelName = `rt-${table}-${Date.now()}`;
    
    const subscriptionConfig: any = {
      event,
      schema: 'public',
      table
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, () => {
        debouncedUpdate();
      })
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, enabled, debouncedUpdate]);

  useEffect(() => {
    const cleanup = setupSubscription();
    return cleanup;
  }, [setupSubscription]);

  return {
    refresh: onUpdate
  };
};

// Hook for multiple table subscriptions - OPTIMIZED for scale
export const useMultipleRealtimeSubscriptions = (
  tables: TableName[],
  onUpdate: () => void,
  enabled = true,
  debounceMs = 150 // Slightly longer debounce for multiple tables
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const debouncedUpdate = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onUpdateRef.current(), debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channels: RealtimeChannel[] = [];
    
    // Use single channel with multiple subscriptions for efficiency
    const channelName = `multi-rt-${Date.now()}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => debouncedUpdate()
      );
    });

    channel.subscribe();
    channels.push(channel);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [tables.join(','), debouncedUpdate, enabled]);
};