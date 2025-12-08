import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Data Cleanup Edge Function
 * 
 * PURPOSE: Implements data retention policy for the platform
 * 
 * DELETION SCHEDULE:
 * - Chat content & media: Deleted every 15 minutes (messages older than 15 min)
 * - Chat history: Deleted after 7 days
 * - Transactions: Preserved for 7 years (deleted after 7 years)
 * - User profiles: Maintained while active (no auto-deletion)
 * 
 * This function should be called by a cron job or scheduler every 15 minutes
 */

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const results = {
      chatContentDeleted: 0,
      chatHistoryDeleted: 0,
      transactionsDeleted: 0,
      chatSessionsClosed: 0,
      errors: [] as string[],
    };

    console.log(`[Data Cleanup] Starting cleanup at ${now.toISOString()}`);

    // ============= 1. DELETE CHAT CONTENT OLDER THAN 15 MINUTES =============
    // This removes message content but preserves metadata for billing purposes
    try {
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      
      // First, get count of messages to be affected
      const { count: messageCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', fifteenMinutesAgo.toISOString())
        .not('message', 'eq', '[Content deleted per retention policy]');

      if (messageCount && messageCount > 0) {
        // Update messages to remove content but keep metadata
        const { error: messageError } = await supabase
          .from('chat_messages')
          .update({
            message: '[Content deleted per retention policy]',
            translated_message: null,
          })
          .lt('created_at', fifteenMinutesAgo.toISOString())
          .not('message', 'eq', '[Content deleted per retention policy]');

        if (messageError) {
          console.error('[Data Cleanup] Error clearing chat content:', messageError);
          results.errors.push(`Chat content: ${messageError.message}`);
        } else {
          results.chatContentDeleted = messageCount;
          console.log(`[Data Cleanup] Cleared content from ${messageCount} messages`);
        }
      } else {
        console.log('[Data Cleanup] No chat content to clear');
      }
    } catch (error: any) {
      console.error('[Data Cleanup] Error in chat content cleanup:', error);
      results.errors.push(`Chat content exception: ${error.message}`);
    }

    // ============= 2. DELETE CHAT HISTORY OLDER THAN 7 DAYS =============
    try {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get count first
      const { count: oldMessagesCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', sevenDaysAgo.toISOString());

      if (oldMessagesCount && oldMessagesCount > 0) {
        // Delete old messages completely
        const { error: deleteMessagesError } = await supabase
          .from('chat_messages')
          .delete()
          .lt('created_at', sevenDaysAgo.toISOString());

        if (deleteMessagesError) {
          console.error('[Data Cleanup] Error deleting old chat history:', deleteMessagesError);
          results.errors.push(`Chat history: ${deleteMessagesError.message}`);
        } else {
          results.chatHistoryDeleted = oldMessagesCount;
          console.log(`[Data Cleanup] Deleted ${oldMessagesCount} messages older than 7 days`);
        }
      } else {
        console.log('[Data Cleanup] No old chat history to delete');
      }

      // Also close any stale chat sessions older than 7 days
      const { data: staleSessions, error: staleSessionsError } = await supabase
        .from('active_chat_sessions')
        .update({
          status: 'ended',
          end_reason: 'auto_cleanup',
          ended_at: now.toISOString(),
        })
        .lt('created_at', sevenDaysAgo.toISOString())
        .eq('status', 'active')
        .select('id');

      if (staleSessionsError) {
        console.error('[Data Cleanup] Error closing stale sessions:', staleSessionsError);
        results.errors.push(`Stale sessions: ${staleSessionsError.message}`);
      } else if (staleSessions) {
        results.chatSessionsClosed = staleSessions.length;
        console.log(`[Data Cleanup] Closed ${staleSessions.length} stale chat sessions`);
      }
    } catch (error: any) {
      console.error('[Data Cleanup] Error in chat history cleanup:', error);
      results.errors.push(`Chat history exception: ${error.message}`);
    }

    // ============= 3. DELETE TRANSACTIONS OLDER THAN 7 YEARS =============
    try {
      const sevenYearsAgo = new Date(now.getTime() - 7 * 365 * 24 * 60 * 60 * 1000);
      
      // Get count first
      const { count: oldTransactionsCount } = await supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', sevenYearsAgo.toISOString());

      if (oldTransactionsCount && oldTransactionsCount > 0) {
        // Delete old transactions
        const { error: deleteTransactionsError } = await supabase
          .from('wallet_transactions')
          .delete()
          .lt('created_at', sevenYearsAgo.toISOString());

        if (deleteTransactionsError) {
          console.error('[Data Cleanup] Error deleting old transactions:', deleteTransactionsError);
          results.errors.push(`Transactions: ${deleteTransactionsError.message}`);
        } else {
          results.transactionsDeleted = oldTransactionsCount;
          console.log(`[Data Cleanup] Deleted ${oldTransactionsCount} transactions older than 7 years`);
        }
      } else {
        console.log('[Data Cleanup] No old transactions to delete');
      }

      // Also clean up old shift earnings
      const { error: deleteEarningsError } = await supabase
        .from('shift_earnings')
        .delete()
        .lt('created_at', sevenYearsAgo.toISOString());

      if (deleteEarningsError) {
        console.error('[Data Cleanup] Error deleting old shift earnings:', deleteEarningsError);
        results.errors.push(`Shift earnings: ${deleteEarningsError.message}`);
      }

      // Clean up old women earnings
      const { error: deleteWomenEarningsError } = await supabase
        .from('women_earnings')
        .delete()
        .lt('created_at', sevenYearsAgo.toISOString());

      if (deleteWomenEarningsError) {
        console.error('[Data Cleanup] Error deleting old women earnings:', deleteWomenEarningsError);
        results.errors.push(`Women earnings: ${deleteWomenEarningsError.message}`);
      }
    } catch (error: any) {
      console.error('[Data Cleanup] Error in transaction cleanup:', error);
      results.errors.push(`Transactions exception: ${error.message}`);
    }

    // ============= 4. CLEANUP OTHER DATA =============
    try {
      // Delete old processing logs (older than 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      await supabase
        .from('processing_logs')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
        .eq('processing_status', 'completed');

      // Delete old password reset tokens (older than 24 hours)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      await supabase
        .from('password_reset_tokens')
        .delete()
        .lt('expires_at', oneDayAgo.toISOString());

      // Delete old chat wait queue entries (older than 1 hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      await supabase
        .from('chat_wait_queue')
        .delete()
        .lt('created_at', oneHourAgo.toISOString())
        .in('status', ['matched', 'expired', 'cancelled']);

      // Delete old system metrics (older than 30 days)
      await supabase
        .from('system_metrics')
        .delete()
        .lt('recorded_at', thirtyDaysAgo.toISOString());

      console.log('[Data Cleanup] Additional cleanup completed');
    } catch (error: any) {
      console.error('[Data Cleanup] Error in additional cleanup:', error);
      results.errors.push(`Additional cleanup: ${error.message}`);
    }

    // Log cleanup summary
    console.log('[Data Cleanup] Summary:', JSON.stringify(results));

    // Create audit log entry
    try {
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: '00000000-0000-0000-0000-000000000000', // System action
          action: 'data_cleanup',
          action_type: 'delete',
          resource_type: 'system',
          details: `Automated data cleanup: ${results.chatContentDeleted} messages cleared, ${results.chatHistoryDeleted} old messages deleted, ${results.transactionsDeleted} old transactions deleted, ${results.chatSessionsClosed} stale sessions closed`,
          status: results.errors.length === 0 ? 'success' : 'partial',
        });
    } catch (auditError) {
      console.error('[Data Cleanup] Failed to create audit log:', auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Data cleanup completed',
      results,
      timestamp: now.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Data Cleanup] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
