/**
 * Chat Service
 * 
 * Handles all chat-related API calls.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  translated_message: string | null;
  is_translated: boolean | null;
  is_read: boolean | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  chat_id: string;
  man_user_id: string;
  woman_user_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  total_minutes: number;
  total_earned: number;
  rate_per_minute: number;
}

export interface ChatPricing {
  ratePerMinute: number;
  womenEarningRate: number;
  videoRatePerMinute: number;
  videoWomenEarningRate: number;
  minWithdrawalBalance: number;
  currency: string;
}

const DEFAULT_PRICING: ChatPricing = {
  ratePerMinute: 4,              // Men pay ₹4/min for chat (matches DB)
  womenEarningRate: 2,           // Indian women earn ₹2/min for chat (admin configurable)
  videoRatePerMinute: 8,         // Men pay ₹8/min for video
  videoWomenEarningRate: 4,      // Women earn ₹4/min for video
  minWithdrawalBalance: 5000,
  currency: 'INR',
};
// Note: Non-Indian women earn ₹0/min - checked via is_earning_eligible flag in ChatEarningsDisplay

/**
 * Get chat pricing configuration
 */
export async function getChatPricing(): Promise<ChatPricing> {
  const { data, error } = await supabase
    .from('chat_pricing')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_PRICING;
  }

  return {
    ratePerMinute: data.rate_per_minute || DEFAULT_PRICING.ratePerMinute,
    womenEarningRate: data.women_earning_rate || DEFAULT_PRICING.womenEarningRate,
    videoRatePerMinute: data.video_rate_per_minute || DEFAULT_PRICING.videoRatePerMinute,
    videoWomenEarningRate: data.video_women_earning_rate || DEFAULT_PRICING.videoWomenEarningRate,
    minWithdrawalBalance: data.min_withdrawal_balance || DEFAULT_PRICING.minWithdrawalBalance,
    currency: data.currency || DEFAULT_PRICING.currency,
  };
}

/**
 * Get chat messages for a session
 */
export async function getChatMessages(
  chatId: string,
  limit = 100
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(limit);

  return data || [];
}

/**
 * Send a chat message
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  receiverId: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Content moderation - block phone numbers, emails, social media
  const { moderateMessage } = await import('@/lib/content-moderation');
  const moderationResult = moderateMessage(message);
  if (moderationResult.isBlocked) {
    return { success: false, error: moderationResult.reason || 'This message contains prohibited content.' };
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      receiver_id: receiverId,
      message,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data.id };
}

/**
 * Get active chat sessions for a user
 */
export async function getActiveChatSessions(userId: string): Promise<ChatSession[]> {
  const { data } = await supabase
    .from('active_chat_sessions')
    .select('*')
    .or(`man_user_id.eq.${userId},woman_user_id.eq.${userId}`)
    .eq('status', 'active');

  return data || [];
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  chatId: string,
  receiverId: string
): Promise<void> {
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .eq('receiver_id', receiverId)
    .eq('is_read', false);
}

/**
 * Process chat billing (uses database function)
 */
export async function processChatBilling(
  sessionId: string,
  minutes: number
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('process_chat_billing', {
    p_session_id: sessionId,
    p_minutes: minutes,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as unknown as { success: boolean; error?: string };
  return result;
}

/**
 * End chat session (synced with Flutter)
 */
export async function endChatSession(
  sessionId: string,
  reason?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('active_chat_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      end_reason: reason || null,
    })
    .eq('id', sessionId);

  return !error;
}

/**
 * Subscribe to new messages (real-time)
 */
export function subscribeToMessages(
  chatId: string,
  onMessage: (message: ChatMessage) => void
) {
  return supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();
}
