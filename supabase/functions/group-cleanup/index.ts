import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting group cleanup...');

    // Cleanup old group messages (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { error: msgError } = await supabase
      .from('group_messages')
      .delete()
      .lt('created_at', fiveMinutesAgo);

    if (msgError) {
      console.error('Error cleaning up messages:', msgError);
    } else {
      console.log('Cleaned up old group messages');
    }

    // Reset stale live streams (older than 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { error: videoError } = await supabase
      .from('private_groups')
      .update({ is_live: false, stream_id: null })
      .eq('is_live', true)
      .lt('updated_at', fifteenMinutesAgo);

    if (videoError) {
      console.error('Error cleaning up video sessions:', videoError);
    } else {
      console.log('Reset stale live streams');
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Group cleanup error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
