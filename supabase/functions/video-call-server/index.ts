import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoCallRequest {
  action: 'create_room' | 'join_room' | 'leave_room' | 'get_room_token' | 'end_call';
  callId?: string;
  userId?: string;
  roomName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, callId, userId, roomName } = await req.json() as VideoCallRequest;

    console.log(`Video call action: ${action}, callId: ${callId}, userId: ${userId}`);

    switch (action) {
      case 'create_room': {
        // Generate a unique room ID for the call
        const roomId = `room_${callId}_${Date.now()}`;
        
        // Store room info in database
        const { error: updateError } = await supabase
          .from('video_call_sessions')
          .update({ 
            status: 'connecting',
          })
          .eq('call_id', callId);

        if (updateError) {
          console.error('Error updating call session:', updateError);
        }

        // Generate access token for the room
        const token = generateRoomToken(roomId, userId!, 'publisher');

        return new Response(
          JSON.stringify({
            success: true,
            roomId,
            token,
            serverUrl: `${supabaseUrl}/functions/v1/video-call-server`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'join_room': {
        // Get call session to find room info
        const { data: callSession, error: sessionError } = await supabase
          .from('video_call_sessions')
          .select('*')
          .eq('call_id', callId)
          .single();

        if (sessionError || !callSession) {
          return new Response(
            JSON.stringify({ success: false, error: 'Call session not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const roomId = `room_${callId}_${new Date(callSession.created_at).getTime()}`;
        const token = generateRoomToken(roomId, userId!, 'publisher');

        // Update call to active
        await supabase
          .from('video_call_sessions')
          .update({ 
            status: 'active',
            started_at: new Date().toISOString()
          })
          .eq('call_id', callId);

        return new Response(
          JSON.stringify({
            success: true,
            roomId,
            token,
            serverUrl: `${supabaseUrl}/functions/v1/video-call-server`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_room_token': {
        const roomId = roomName || `room_${callId}`;
        const token = generateRoomToken(roomId, userId!, 'publisher');

        return new Response(
          JSON.stringify({
            success: true,
            token,
            roomId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'leave_room':
      case 'end_call': {
        // Update call session
        const { error: updateError } = await supabase
          .from('video_call_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            end_reason: action === 'leave_room' ? 'user_left' : 'call_ended',
          })
          .eq('call_id', callId);

        if (updateError) {
          console.error('Error ending call:', updateError);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Video call server error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate a simple room token (in production, use proper JWT with signing)
function generateRoomToken(roomId: string, participantId: string, role: string): string {
  const payload = {
    roomId,
    participantId,
    role,
    exp: Date.now() + (60 * 60 * 1000), // 1 hour expiry
    iat: Date.now(),
  };
  
  // Base64 encode the token (in production use proper JWT signing)
  return btoa(JSON.stringify(payload));
}
