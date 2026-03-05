/**
 * Session Cleanup Service
 * 
 * Centralized cleanup for all active sessions when a user logs out.
 * Handles: active chats, video calls, and private group calls.
 */

import { supabase } from '@/integrations/supabase/client';

export async function cleanupAllUserSessions(userId: string): Promise<void> {
  const now = new Date().toISOString();

  try {
    await Promise.all([
      // 1. End all active chat sessions
      supabase
        .from('active_chat_sessions')
        .update({
          status: 'ended',
          ended_at: now,
          end_reason: 'user_logout',
        })
        .or(`man_user_id.eq.${userId},woman_user_id.eq.${userId}`)
        .eq('status', 'active'),

      // 2. End all paused chat sessions
      supabase
        .from('active_chat_sessions')
        .update({
          status: 'ended',
          ended_at: now,
          end_reason: 'user_logout',
        })
        .or(`man_user_id.eq.${userId},woman_user_id.eq.${userId}`)
        .in('status', ['paused', 'billing_paused']),

      // 3. End all active video call sessions
      supabase
        .from('video_call_sessions')
        .update({
          status: 'ended',
          ended_at: now,
          end_reason: 'user_logout',
        })
        .or(`man_user_id.eq.${userId},woman_user_id.eq.${userId}`)
        .eq('status', 'active'),

      // 4. Stop any private groups where user is the host
      supabase
        .from('private_groups')
        .update({
          is_live: false,
          stream_id: null,
          current_host_id: null,
          current_host_name: null,
          participant_count: 0,
        } as any)
        .eq('current_host_id', userId)
        .eq('is_live', true),

      // 5. Remove user from any group memberships (as participant)
      supabase
        .from('group_memberships')
        .delete()
        .eq('user_id', userId),

      // 6. Set user offline
      supabase
        .from('user_status')
        .update({
          is_online: false,
          status_text: 'offline',
          last_seen: now,
        })
        .eq('user_id', userId),

      // 7. Set women availability to unavailable
      supabase
        .from('women_availability')
        .update({
          is_available: false,
          is_available_for_calls: false,
        })
        .eq('user_id', userId),
    ]);

    console.log(`[SessionCleanup] All sessions cleaned up for user ${userId}`);
  } catch (error) {
    console.error('[SessionCleanup] Error during cleanup:', error);
    // Don't throw - logout should still proceed even if cleanup partially fails
  }
}
