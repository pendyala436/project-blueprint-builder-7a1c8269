import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsePartnerMonitorOptions {
  partnerId: string;
  partnerName: string;
  sessionId: string;
  isPartnerOnline: boolean;
  onClose: () => void;
}

/**
 * Monitors the chat partner's online status and session lifecycle.
 * Closes the chat window when the partner goes offline or the session is ended externally.
 */
export const usePartnerMonitor = ({
  partnerId,
  partnerName,
  sessionId,
  isPartnerOnline,
  onClose,
}: UsePartnerMonitorOptions) => {
  const { toast } = useToast();

  useEffect(() => {
    let partnerOnlineStatus = isPartnerOnline;
    let offlineDebounceTimer: NodeJS.Timeout | null = null;

    const statusChannel = supabase
      .channel(`partner-user-status-${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_status",
          filter: `user_id=eq.${partnerId}`,
        },
        async (payload: any) => {
          const newStatus = payload.new;
          const wasOnline = partnerOnlineStatus;

          if (newStatus && newStatus.is_online === false && wasOnline) {
            // Debounce offline detection by 15 seconds to handle brief network glitches
            if (offlineDebounceTimer) clearTimeout(offlineDebounceTimer);
            offlineDebounceTimer = setTimeout(async () => {
              // Re-check partner status before closing
              const { data: currentStatus } = await supabase
                .from("user_status")
                .select("is_online")
                .eq("user_id", partnerId)
                .maybeSingle();

              if (currentStatus && currentStatus.is_online === false) {
                toast({
                  title: "Partner Disconnected",
                  description: `${partnerName} went offline. You are now free to chat with others.`,
                });

                try {
                  await supabase
                    .from("active_chat_sessions")
                    .update({
                      status: "ended",
                      ended_at: new Date().toISOString(),
                      end_reason: "partner_offline",
                    })
                    .eq("id", sessionId);
                } catch (error) {
                  console.error("Error ending chat on partner offline:", error);
                }

                onClose();
              }
            }, 15000);
          } else if (newStatus && newStatus.is_online === true) {
            // Partner came back online, cancel any pending offline timer
            if (offlineDebounceTimer) {
              clearTimeout(offlineDebounceTimer);
              offlineDebounceTimer = null;
            }
          }

          partnerOnlineStatus = newStatus?.is_online ?? false;
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "active_chat_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          const session = payload.new;

          if (session.status === "ended" && session.end_reason) {
            let message = "Chat session ended";
            if (session.end_reason === "partner_offline") {
              message = `${partnerName} went offline`;
            } else if (session.end_reason === "user_closed" || session.end_reason === "user_ended") {
              message = `${partnerName} ended the chat`;
            } else if (session.end_reason === "inactivity_timeout") {
              message = "Chat ended due to inactivity";
            } else if (session.end_reason === "auto_timeout") {
              message = "Chat request expired - no response";
            }

            toast({
              title: "Chat Disconnected",
              description: message + ". You are now available for new chats.",
            });

            onClose();
          }
        }
      )
      .subscribe();

    return () => {
      if (offlineDebounceTimer) clearTimeout(offlineDebounceTimer);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [partnerId, partnerName, sessionId, isPartnerOnline, onClose, toast]);
};
