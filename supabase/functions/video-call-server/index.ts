import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Video Call Server using SRS (Simple Realtime Server)
 * 
 * PRIVACY & STORAGE POLICY:
 * - NO video/audio content is stored or recorded
 * - All streams are ephemeral (real-time transmission only)
 * - Session metadata is automatically deleted after 5 minutes
 * - SRS is configured without DVR/recording capabilities
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SRS Server Configuration
// SRS_API_URL should point to port 1985 (HTTP API)
// SRS_RTC_URL should point to port 1985/rtc/v1 (WebRTC signaling - same port)
// Example: SRS_API_URL=http://34.47.250.115:1985, SRS_RTC_URL=http://34.47.250.115:1985/rtc/v1
const SRS_CONFIG = {
  apiUrl: Deno.env.get('SRS_API_URL') || 'http://localhost:1985',
  rtcUrl: Deno.env.get('SRS_RTC_URL') || 'http://localhost:1985/rtc/v1',
  noRecording: true, // Ensure SRS is configured without recording
};

// Headers to bypass ngrok browser warning
const ngrokHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

interface VideoCallRequest {
  action: string;
  callId?: string;
  userId?: string;
  roomName?: string;
  streamName?: string;
  sdp?: string;
  mode?: 'call' | 'stream';
}

// SRS API helper functions
function getSrsPublicHost(): string {
  // Use rtcUrl for WebRTC public host; fallback to apiUrl
  try {
    const url = new URL(SRS_CONFIG.rtcUrl);
    return url.host;
  } catch {
    try {
      const url = new URL(SRS_CONFIG.apiUrl);
      return url.host;
    } catch {
      return 'localhost';
    }
  }
}

async function parseSrsErrorText(res: Response): Promise<string> {
  const text = await res.text();
  // Detect ngrok's upstream connection failure page
  if (text.includes('ERR_NGROK_8012')) {
    return 'Ngrok cannot reach your local SRS service (ERR_NGROK_8012). Make sure SRS is running and tunnel the correct port (usually http://localhost:1985).';
  }
  return text.slice(0, 5000);
}

async function srsPublish(streamName: string, sdp: string): Promise<{ success: boolean; sdp?: string; error?: string }> {
  try {
    const publicHost = getSrsPublicHost();
    console.log(`SRS Publish: ${streamName} to ${SRS_CONFIG.rtcUrl}/publish/ (host: ${publicHost})`);

    const response = await fetch(`${SRS_CONFIG.rtcUrl}/publish/`, {
      method: 'POST',
      headers: ngrokHeaders,
      body: JSON.stringify({
        api: `${SRS_CONFIG.rtcUrl}/publish/`,
        streamurl: `webrtc://${publicHost}/live/${streamName}`,
        sdp,
      }),
    });

    console.log(`SRS Publish response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await parseSrsErrorText(response);
      console.error('SRS publish error:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log('SRS publish response:', data);

    if (data.code !== 0) {
      return { success: false, error: data.msg || 'SRS publish failed' };
    }

    return { success: true, sdp: data.sdp };
  } catch (error) {
    console.error('SRS publish exception:', error);
    return { success: false, error: 'Failed to connect to SRS server. Ensure your ngrok tunnel points to the SRS HTTP API port (usually 1985) and SRS is running.' };
  }
}

async function srsPlay(streamName: string, sdp: string): Promise<{ success: boolean; sdp?: string; error?: string }> {
  try {
    const publicHost = getSrsPublicHost();
    console.log(`SRS Play: ${streamName} from ${SRS_CONFIG.rtcUrl}/play/ (host: ${publicHost})`);

    const response = await fetch(`${SRS_CONFIG.rtcUrl}/play/`, {
      method: 'POST',
      headers: ngrokHeaders,
      body: JSON.stringify({
        api: `${SRS_CONFIG.rtcUrl}/play/`,
        streamurl: `webrtc://${publicHost}/live/${streamName}`,
        sdp,
      }),
    });

    console.log(`SRS Play response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await parseSrsErrorText(response);
      console.error('SRS play error:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log('SRS play response:', data);

    if (data.code !== 0) {
      return { success: false, error: data.msg || 'SRS play failed' };
    }

    return { success: true, sdp: data.sdp };
  } catch (error) {
    console.error('SRS play exception:', error);
    return { success: false, error: 'Failed to connect to SRS server. Ensure your ngrok tunnel points to the SRS HTTP API port (usually 1985) and SRS is running.' };
  }
}

async function srsUnpublish(streamName: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`SRS Unpublish: ${streamName}`);
    
    // SRS doesn't have a direct unpublish API - the stream ends when WebRTC connection closes
    // We can use the clients API to kick the publisher if needed
    const response = await fetch(`${SRS_CONFIG.apiUrl}/api/v1/clients/`, {
      headers: ngrokHeaders,
    });
    
    if (response.ok) {
      const data = await response.json();
      // Find and kick the client publishing this stream
      for (const client of data.clients || []) {
        if (client.publish && client.url?.includes(streamName)) {
          await fetch(`${SRS_CONFIG.apiUrl}/api/v1/clients/${client.id}`, {
            method: 'DELETE',
            headers: ngrokHeaders,
          });
          console.log(`Kicked client ${client.id} for stream ${streamName}`);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('SRS unpublish exception:', error);
    return { success: true }; // Return success even if SRS is not available
  }
}

async function srsGetViewers(streamName: string): Promise<{ viewerCount: number }> {
  try {
    const response = await fetch(`${SRS_CONFIG.apiUrl}/api/v1/clients/`, {
      headers: ngrokHeaders,
    });
    
    if (response.ok) {
      const data = await response.json();
      let count = 0;
      for (const client of data.clients || []) {
        if (!client.publish && client.url?.includes(streamName)) {
          count++;
        }
      }
      return { viewerCount: count };
    }

    return { viewerCount: 0 };
  } catch (error) {
    console.error('SRS get viewers error:', error);
    return { viewerCount: 0 };
  }
}

async function srsGetStreams(): Promise<{ streams: string[] }> {
  try {
    const response = await fetch(`${SRS_CONFIG.apiUrl}/api/v1/streams/`, {
      headers: ngrokHeaders,
    });
    
    if (response.ok) {
      const data = await response.json();
      const streams = (data.streams || []).map((s: { name?: string }) => s.name).filter(Boolean);
      return { streams };
    }

    return { streams: [] };
  } catch (error) {
    console.error('SRS get streams error:', error);
    return { streams: [] };
  }
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

    // Get authenticated user from auth header
    const authHeader = req.headers.get('authorization');
    let authenticatedUserId: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      authenticatedUserId = user?.id || null;
    }

    const body = await req.json() as VideoCallRequest;
    const { action, callId, userId, streamName, sdp, mode } = body;

    console.log(`Video call action: ${action}, callId: ${callId}, userId: ${userId}, streamName: ${streamName}`);

    // SECURITY: For create_room action, verify the caller is male (only men can initiate video calls)
    if (action === 'create_room' && authenticatedUserId) {
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('user_id', authenticatedUserId)
        .maybeSingle();
      
      if (callerProfile?.gender?.toLowerCase() === 'female') {
        console.log(`[SECURITY] Female user ${authenticatedUserId} attempted to create video call room - BLOCKED`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Women cannot initiate video calls. Please wait for men to call you.',
            error_code: 'WOMEN_CANNOT_INITIATE'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    switch (action) {
      // SRS WebRTC Publish
      case 'srs_publish': {
        if (!streamName || !sdp) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing streamName or sdp' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await srsPublish(streamName, sdp);
        
        if (result.success && callId) {
          // Update call session
          await supabase
            .from('video_call_sessions')
            .update({ 
              status: mode === 'stream' ? 'streaming' : 'connecting',
            })
            .eq('call_id', callId);
        }

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SRS WebRTC Play
      case 'srs_play': {
        if (!streamName || !sdp) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing streamName or sdp' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await srsPlay(streamName, sdp);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SRS Unpublish
      case 'srs_unpublish': {
        if (!streamName) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing streamName' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await srsUnpublish(streamName);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get viewer count for a stream
      case 'srs_get_viewers': {
        if (!streamName) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing streamName' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await srsGetViewers(streamName);
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all active streams
      case 'srs_get_streams': {
        const result = await srsGetStreams();
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Legacy actions for room management
      case 'create_room': {
        const roomId = `room_${callId}_${Date.now()}`;
        
        const { error: updateError } = await supabase
          .from('video_call_sessions')
          .update({ 
            status: 'connecting',
          })
          .eq('call_id', callId);

        if (updateError) {
          console.error('Error updating call session:', updateError);
        }

        const token = generateRoomToken(roomId, userId!, 'publisher');

        return new Response(
          JSON.stringify({
            success: true,
            roomId,
            token,
            streamName: streamName || `${callId}_${userId}`,
            srsConfig: SRS_CONFIG,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'join_room': {
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
            srsConfig: SRS_CONFIG,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_room_token': {
        const roomId = body.roomName || `room_${callId}`;
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
        // Stop stream if exists
        if (streamName) {
          await srsUnpublish(streamName);
        }

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

// Generate a simple room token
function generateRoomToken(roomId: string, participantId: string, role: string): string {
  const payload = {
    roomId,
    participantId,
    role,
    exp: Date.now() + (60 * 60 * 1000),
    iat: Date.now(),
  };
  
  return btoa(JSON.stringify(payload));
}
