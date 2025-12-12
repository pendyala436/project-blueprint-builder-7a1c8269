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
}

export const useRealtimeSubscription = ({
  table,
  event = "*",
  filter,
  onUpdate,
  enabled = true
}: UseRealtimeSubscriptionOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const setupSubscription = useCallback(() => {
    if (!enabled) return;

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `realtime-${table}-${Date.now()}`;
    
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
        onUpdate();
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, onUpdate, enabled]);

  useEffect(() => {
    const cleanup = setupSubscription();
    return cleanup;
  }, [setupSubscription]);

  return {
    refresh: onUpdate
  };
};

// Hook for multiple table subscriptions
export const useMultipleRealtimeSubscriptions = (
  tables: TableName[],
  onUpdate: () => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const channels: RealtimeChannel[] = [];

    tables.forEach((table, index) => {
      const channel = supabase
        .channel(`multi-realtime-${table}-${index}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            onUpdate();
          }
        )
        .subscribe();
      
      channels.push(channel);
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables.join(','), onUpdate, enabled]);
};