import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { action, data } = await req.json();
    console.log(`AI Women Manager - Action: ${action}`, data);

    switch (action) {
      case 'auto_approve_women':
        return await autoApproveWomen(supabase);
      
      case 'suspend_inactive_women':
        return await suspendInactiveWomen(supabase);
      
      case 'distribute_for_chat':
        return await distributeWomanForChat(supabase, data);
      
      case 'distribute_for_call':
        return await distributeWomanForCall(supabase, data);
      
      case 'get_available_woman':
        return await getAvailableWoman(supabase, data);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('AI Women Manager Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Auto-approve women with complete profile + verified photo
async function autoApproveWomen(supabase: any) {
  console.log('Running auto-approval check...');

  // Find pending women with complete profiles
  const { data: pendingWomen, error } = await supabase
    .from('female_profiles')
    .select('id, user_id, full_name, photo_url, age, primary_language, country, approval_status')
    .eq('approval_status', 'pending')
    .not('photo_url', 'is', null)
    .neq('photo_url', '')
    .not('full_name', 'is', null)
    .not('age', 'is', null)
    .not('primary_language', 'is', null);

  if (error) {
    console.error('Error fetching pending women:', error);
    throw error;
  }

  console.log(`Found ${pendingWomen?.length || 0} pending women with complete profiles`);

  const approvedIds: string[] = [];
  
  for (const woman of pendingWomen || []) {
    // Check if profile is complete enough for auto-approval
    const isComplete = woman.full_name && 
                       woman.photo_url && 
                       woman.age >= 18 && 
                       woman.primary_language;

    if (isComplete) {
      // Auto-approve
      const { error: updateError } = await supabase
        .from('female_profiles')
        .update({
          approval_status: 'approved',
          ai_approved: true,
          auto_approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', woman.id);

      if (!updateError) {
        approvedIds.push(woman.id);
        console.log(`Auto-approved woman: ${woman.full_name} (${woman.id})`);

        // Create notification
        await supabase.from('notifications').insert({
          user_id: woman.user_id,
          title: 'Profile Approved!',
          message: 'Your profile has been automatically approved. You can now start chatting!',
          type: 'success'
        });
      }
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      approved_count: approvedIds.length,
      approved_ids: approvedIds 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Suspend women inactive for more than 15 days
async function suspendInactiveWomen(supabase: any) {
  console.log('Running inactivity check...');

  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  // Find active women who haven't been active in 15 days
  const { data: inactiveWomen, error } = await supabase
    .from('female_profiles')
    .select('id, user_id, full_name, last_active_at')
    .eq('account_status', 'active')
    .eq('approval_status', 'approved')
    .lt('last_active_at', fifteenDaysAgo.toISOString());

  if (error) {
    console.error('Error fetching inactive women:', error);
    throw error;
  }

  console.log(`Found ${inactiveWomen?.length || 0} inactive women (>15 days)`);

  const suspendedIds: string[] = [];

  for (const woman of inactiveWomen || []) {
    const { error: updateError } = await supabase
      .from('female_profiles')
      .update({
        account_status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspension_reason: 'Inactive for more than 15 days',
        updated_at: new Date().toISOString()
      })
      .eq('id', woman.id);

    if (!updateError) {
      suspendedIds.push(woman.id);
      console.log(`Suspended inactive woman: ${woman.full_name} (${woman.id})`);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: woman.user_id,
        title: 'Account Suspended',
        message: 'Your account has been suspended due to inactivity (15+ days). Please contact support to reactivate.',
        type: 'warning'
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      suspended_count: suspendedIds.length,
      suspended_ids: suspendedIds 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// AI distribution for chat - find best available woman based on load
async function distributeWomanForChat(supabase: any, data: any) {
  const { language, excludeUserIds = [] } = data;
  console.log(`Finding available woman for chat in language: ${language}`);

  // Get language limits
  const { data: limits } = await supabase
    .from('language_limits')
    .select('*')
    .eq('language_name', language)
    .single();

  // Get online women who speak this language and have capacity
  const { data: availableWomen, error } = await supabase
    .from('women_availability')
    .select(`
      user_id,
      current_chat_count,
      max_concurrent_chats,
      is_available
    `)
    .eq('is_available', true)
    .lt('current_chat_count', 3); // Less than max concurrent chats

  if (error || !availableWomen?.length) {
    console.log('No available women found');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No available women' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get profiles for these women
  const userIds = availableWomen.map((w: any) => w.user_id).filter((id: string) => !excludeUserIds.includes(id));
  
  const { data: womenProfiles } = await supabase
    .from('female_profiles')
    .select('user_id, full_name, photo_url, primary_language, age')
    .in('user_id', userIds)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active')
    .not('photo_url', 'is', null);

  if (!womenProfiles?.length) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No matching profiles' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Prioritize same language, then by lowest load
  const sameLanguage = womenProfiles.filter((w: any) => 
    w.primary_language?.toLowerCase() === language?.toLowerCase()
  );

  const candidates = sameLanguage.length > 0 ? sameLanguage : womenProfiles;

  // Sort by load (lowest chat count first)
  const availabilityMap = new Map<string, any>(availableWomen.map((w: any) => [w.user_id, w]));
  candidates.sort((a: any, b: any) => {
    const availA = availabilityMap.get(a.user_id);
    const availB = availabilityMap.get(b.user_id);
    const loadA = availA?.current_chat_count || 0;
    const loadB = availB?.current_chat_count || 0;
    return loadA - loadB;
  });

  const selectedWoman = candidates[0];

  return new Response(
    JSON.stringify({ 
      success: true, 
      woman: selectedWoman,
      needs_translation: selectedWoman.primary_language?.toLowerCase() !== language?.toLowerCase()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// AI distribution for video call - find best available woman
async function distributeWomanForCall(supabase: any, data: any) {
  const { language, excludeUserIds = [] } = data;
  console.log(`Finding available woman for video call in language: ${language}`);

  // Get women available for calls with capacity
  const { data: availableWomen, error } = await supabase
    .from('women_availability')
    .select(`
      user_id,
      current_call_count,
      max_concurrent_calls,
      is_available,
      is_available_for_calls
    `)
    .eq('is_available', true)
    .eq('is_available_for_calls', true)
    .eq('current_call_count', 0); // Not on any call

  if (error || !availableWomen?.length) {
    console.log('No available women for calls');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No available women for calls' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userIds = availableWomen.map((w: any) => w.user_id).filter((id: string) => !excludeUserIds.includes(id));

  // Get profiles - for calls, same language is required
  const { data: womenProfiles } = await supabase
    .from('female_profiles')
    .select('user_id, full_name, photo_url, primary_language, age')
    .in('user_id', userIds)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active')
    .not('photo_url', 'is', null)
    .ilike('primary_language', language);

  if (!womenProfiles?.length) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No women available for calls in this language' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Select randomly from available women for fair distribution
  const selectedWoman = womenProfiles[Math.floor(Math.random() * womenProfiles.length)];

  return new Response(
    JSON.stringify({ 
      success: true, 
      woman: selectedWoman
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get any available woman (for random matching)
async function getAvailableWoman(supabase: any, data: any) {
  const { type, language, manUserId } = data;
  
  if (type === 'chat') {
    return distributeWomanForChat(supabase, { language, excludeUserIds: [] });
  } else if (type === 'call') {
    return distributeWomanForCall(supabase, { language, excludeUserIds: [] });
  }
  
  return new Response(
    JSON.stringify({ error: 'Invalid type' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
