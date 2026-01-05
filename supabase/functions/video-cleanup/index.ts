import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting video call cleanup...');

    // Delete video call sessions older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // First, end any active sessions that are older than 5 minutes
    const { data: activeSessions, error: activeError } = await supabase
      .from('video_call_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: 'auto_cleanup_timeout',
      })
      .lt('created_at', fiveMinutesAgo)
      .in('status', ['ringing', 'connecting', 'active', 'streaming'])
      .select('call_id');

    if (activeError) {
      console.error('Error ending old active sessions:', activeError);
    } else {
      console.log(`Ended ${activeSessions?.length || 0} stale active sessions`);
    }

    // Delete all video call sessions older than 5 minutes (regardless of status)
    const { data: deletedSessions, error: deleteError } = await supabase
      .from('video_call_sessions')
      .delete()
      .lt('created_at', fiveMinutesAgo)
      .select('id, call_id');

    if (deleteError) {
      console.error('Error deleting old sessions:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deletedCount = deletedSessions?.length || 0;
    console.log(`Deleted ${deletedCount} video call session records older than 5 minutes`);

    // Also cleanup any orphaned signaling data by notifying SRS to close old streams
    // (SRS handles this automatically, but we log for monitoring)
    if (deletedSessions && deletedSessions.length > 0) {
      console.log('Cleaned up call IDs:', deletedSessions.map(s => s.call_id).join(', '));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete`,
        deletedCount,
        endedActiveSessions: activeSessions?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Video cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
