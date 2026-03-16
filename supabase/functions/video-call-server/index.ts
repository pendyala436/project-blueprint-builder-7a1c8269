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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth guard: validate JWT via anon-key client (not service role)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the authenticated user's ID — never trust userId from body
    const authenticatedUserId = caller.id;

    const body = await req.json();
    const { action, callId, status, endReason, totalMinutes, totalEarned } = body;

    if (!callId) {
      return new Response(JSON.stringify({ error: "callId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper: verify caller is a participant in the call session
    async function verifyParticipant(): Promise<boolean> {
      const { data: session } = await supabase
        .from('video_call_sessions')
        .select('man_user_id, woman_user_id')
        .eq('call_id', callId)
        .maybeSingle();

      if (!session) return false;
      return session.man_user_id === authenticatedUserId || session.woman_user_id === authenticatedUserId;
    }

    switch (action) {
      case 'create_room': {
        // Only the authenticated caller can create a room as the initiator
        const { error } = await supabase
          .from('video_call_sessions')
          .upsert({
            call_id: callId,
            man_user_id: authenticatedUserId, // Use authenticated ID, not body.userId
            status: 'pending',
            created_at: new Date().toISOString(),
          }, { onConflict: 'call_id' });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join_room': {
        // Verify the session exists before joining
        const { data: session } = await supabase
          .from('video_call_sessions')
          .select('man_user_id, woman_user_id, status')
          .eq('call_id', callId)
          .maybeSingle();

        if (!session) {
          return new Response(JSON.stringify({ error: "Call session not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // The joiner must be different from the creator, or already assigned
        if (session.man_user_id === authenticatedUserId) {
          // Creator re-joining their own room is OK
        } else if (!session.woman_user_id || session.woman_user_id === authenticatedUserId) {
          // Set the joining user as woman_user_id
          await supabase
            .from('video_call_sessions')
            .update({ woman_user_id: authenticatedUserId })
            .eq('call_id', callId);
        } else {
          // Someone else already joined — reject
          return new Response(JSON.stringify({ error: "Call session is full" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
        // Only participants can end a call
        if (!(await verifyParticipant())) {
          return new Response(JSON.stringify({ error: "Not a participant in this call" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
        // Only participants can update call status
        if (!(await verifyParticipant())) {
          return new Response(JSON.stringify({ error: "Not a participant in this call" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const allowedStatuses = ['pending', 'ringing', 'active', 'ended', 'missed', 'declined'];
        if (!allowedStatuses.includes(status)) {
          return new Response(JSON.stringify({ error: "Invalid status value" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
