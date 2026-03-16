import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Video Call Signaling Server
 * 
 * Manages P2P WebRTC signaling via Supabase Realtime.
 * No video/audio content is stored or recorded.
 * All streams are ephemeral (real-time only).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, callId, userId, status, endReason, totalMinutes, totalEarned } = body;

    switch (action) {
      case 'create_room': {
        const { error } = await supabase
          .from('video_call_sessions')
          .upsert({
            call_id: callId,
            man_user_id: userId,
            status: 'pending',
            created_at: new Date().toISOString(),
          }, { onConflict: 'call_id' });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join_room': {
        const { error } = await supabase
          .from('video_call_sessions')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('call_id', callId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'end_call': {
        const { error } = await supabase
          .from('video_call_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            end_reason: endReason || 'user_ended',
            total_minutes: totalMinutes || 0,
            total_earned: totalEarned || 0,
          })
          .eq('call_id', callId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_status': {
        const { error } = await supabase
          .from('video_call_sessions')
          .update({ status })
          .eq('call_id', callId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('video-call-server error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
