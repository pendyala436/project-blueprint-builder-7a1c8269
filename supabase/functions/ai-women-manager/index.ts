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

    // Get authenticated user from auth header
    const authHeader = req.headers.get('authorization');
    let authenticatedUserId: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      authenticatedUserId = user?.id || null;
    }

    const { action, data } = await req.json();
    console.log(`AI Women Manager - Action: ${action}`, data);

    // SECURITY: For distribution actions, verify the caller is male (only men can initiate)
    if (action === 'distribute_for_chat' || action === 'distribute_for_call') {
      if (authenticatedUserId) {
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('user_id', authenticatedUserId)
          .maybeSingle();
        
        if (callerProfile?.gender?.toLowerCase() === 'female') {
          console.log(`[SECURITY] Female user ${authenticatedUserId} attempted to initiate ${action} - BLOCKED`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Women cannot initiate chats or video calls. Please wait for men to start a conversation with you.',
              error_code: 'WOMEN_CANNOT_INITIATE'
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

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

        // Insert into women_availability table
        const { error: availError } = await supabase
          .from('women_availability')
          .upsert({
            user_id: woman.user_id,
            is_available: false,
            is_available_for_calls: false,
            current_chat_count: 0,
            current_call_count: 0,
            max_concurrent_chats: 3,
            max_concurrent_calls: 1,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (availError) {
          console.error(`Error creating women_availability for ${woman.full_name}:`, availError);
        } else {
          console.log(`✓ Created women_availability entry for ${woman.full_name}`);
        }

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
// CRITICAL: Must check BOTH women_availability.is_available AND user_status.is_online
async function distributeWomanForChat(supabase: any, data: any) {
  const { language, excludeUserIds = [] } = data;
  const normalizedLanguage = (language || 'english').toLowerCase().trim();
  console.log(`[Chat] Finding available ONLINE woman for chat: ${normalizedLanguage}`);

  // Step 1: Get ONLY online users from user_status (critical check!)
  const { data: onlineStatuses } = await supabase
    .from('user_status')
    .select('user_id')
    .eq('is_online', true);

  const onlineUserIds = onlineStatuses?.map((s: any) => s.user_id) || [];
  
  if (onlineUserIds.length === 0) {
    console.log('[Chat] No users online');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No users online' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 2: Get women who are available AND online
  const { data: availableWomen, error } = await supabase
    .from('women_availability')
    .select('user_id, current_chat_count, max_concurrent_chats, is_available')
    .eq('is_available', true)
    .lt('current_chat_count', 3)
    .in('user_id', onlineUserIds); // MUST be online

  if (error || !availableWomen?.length) {
    console.log('[Chat] No online available women found');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No online available women' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 3: Filter out excluded users and get profiles
  const candidateUserIds = availableWomen
    .map((w: any) => w.user_id)
    .filter((id: string) => !excludeUserIds.includes(id));
  
  if (candidateUserIds.length === 0) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'All available women excluded' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 4: Get user languages from user_languages table
  const { data: userLanguages } = await supabase
    .from('user_languages')
    .select('user_id, language_name')
    .in('user_id', candidateUserIds);

  const languageMap = new Map<string, string>();
  (userLanguages || []).forEach((l: any) => {
    languageMap.set(l.user_id, (l.language_name || '').toLowerCase().trim());
  });

  // Step 5: Get profiles for online available women
  const { data: womenProfiles } = await supabase
    .from('female_profiles')
    .select('user_id, full_name, photo_url, primary_language, age')
    .in('user_id', candidateUserIds)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active')
    .not('photo_url', 'is', null);

  if (!womenProfiles?.length) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No matching online profiles' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 6: Prioritize same language, then by lowest load
  const availabilityMap = new Map<string, any>(availableWomen.map((w: any) => [w.user_id, w]));
  
  // Add language info to profiles
  const profilesWithLanguage = womenProfiles.map((w: any) => {
    const womanLanguage = (
      languageMap.get(w.user_id) || 
      w.primary_language || 
      ''
    ).toLowerCase().trim();
    return {
      ...w,
      language: womanLanguage,
      isSameLanguage: womanLanguage === normalizedLanguage,
      currentChats: availabilityMap.get(w.user_id)?.current_chat_count || 0
    };
  });

  // Sort: same language first, then by load
  profilesWithLanguage.sort((a: any, b: any) => {
    if (a.isSameLanguage !== b.isSameLanguage) {
      return a.isSameLanguage ? -1 : 1;
    }
    return a.currentChats - b.currentChats;
  });

  const selectedWoman = profilesWithLanguage[0];
  console.log(`[Chat] Selected ONLINE woman: ${selectedWoman.full_name} (language: ${selectedWoman.language}, same: ${selectedWoman.isSameLanguage})`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      woman: selectedWoman,
      needs_translation: !selectedWoman.isSameLanguage,
      same_language: selectedWoman.isSameLanguage
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// AI distribution for video call - STRICT: same language + IDLE women only
// Idle = Online + Not in any video call + Not in any chat + Not receiving another call
async function distributeWomanForCall(supabase: any, data: any) {
  const { language, excludeUserIds = [] } = data;
  const normalizedLanguage = (language || "english").toLowerCase().trim();
  console.log(`[VideoCall] Finding IDLE woman for video call: ${normalizedLanguage}`);

  // Step 1: Get ONLY online users
  const { data: onlineStatuses } = await supabase
    .from('user_status')
    .select('user_id')
    .eq('is_online', true);

  const onlineUserIds = onlineStatuses?.map((s: any) => s.user_id) || [];
  
  if (onlineUserIds.length === 0) {
    console.log('[VideoCall] No users online');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No users online' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 2: Get women who are available AND idle (no active chats, no active calls)
  const { data: availableWomen, error } = await supabase
    .from('women_availability')
    .select('user_id, current_call_count, current_chat_count, max_concurrent_calls, is_available, is_available_for_calls')
    .eq('is_available', true)
    .eq('is_available_for_calls', true)
    .eq('current_call_count', 0) // Not on any call
    .eq('current_chat_count', 0) // IDLE: Not in any chat
    .in('user_id', onlineUserIds); // MUST be online

  if (error) {
    console.error('[VideoCall] Error querying women_availability:', error);
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'Database error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!availableWomen?.length) {
    console.log('[VideoCall] No idle women available for calls (all are busy with chats or calls)');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No idle women available. All women are currently busy with chats or calls.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 3: Filter out women who are already receiving another incoming call (ringing)
  const candidateUserIds = availableWomen.map((w: any) => w.user_id);
  
  const { data: ringingCalls } = await supabase
    .from('video_call_sessions')
    .select('woman_user_id')
    .eq('status', 'ringing')
    .in('woman_user_id', candidateUserIds);
  
  const ringingUserIds = new Set((ringingCalls || []).map((c: any) => c.woman_user_id));
  
  const idleUserIds = candidateUserIds
    .filter((id: string) => !ringingUserIds.has(id))
    .filter((id: string) => !excludeUserIds.includes(id));

  if (idleUserIds.length === 0) {
    console.log('[VideoCall] All candidate women are currently receiving calls');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'All available women are currently receiving other calls. Please try again.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 4: Get user languages from user_languages table
  const { data: userLanguages } = await supabase
    .from('user_languages')
    .select('user_id, language_name')
    .in('user_id', idleUserIds);

  const languageMap = new Map<string, string>();
  (userLanguages || []).forEach((l: any) => {
    languageMap.set(l.user_id, (l.language_name || '').toLowerCase().trim());
  });

  // Step 5: Get profiles for IDLE women
  const { data: womenProfiles } = await supabase
    .from('female_profiles')
    .select('user_id, full_name, photo_url, primary_language, age, country')
    .in('user_id', idleUserIds)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active')
    .not('photo_url', 'is', null);

  if (!womenProfiles?.length) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No matching profiles found for idle women' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 6: Filter STRICTLY by same language (no translation for video calls)
  const sameLanguageWomen = womenProfiles.filter((w: any) => {
    const womanLanguage = (
      languageMap.get(w.user_id) || 
      w.primary_language || 
      ''
    ).toLowerCase().trim();
    return womanLanguage === normalizedLanguage;
  });

  if (sameLanguageWomen.length === 0) {
    console.log(`[VideoCall] No IDLE women available for calls in language: ${normalizedLanguage}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        woman: null, 
        reason: `No idle women available for video calls in ${language}. Video calls require same language and an idle user.` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 7: Sort randomly for fair distribution among idle users
  // (Since all idle women have 0 chats and 0 calls, load balancing is equal)
  const shuffled = sameLanguageWomen.sort(() => Math.random() - 0.5);
  const selectedWoman = shuffled[0];
  
  console.log(`[VideoCall] Selected IDLE woman: ${selectedWoman.full_name} (language: ${selectedWoman.primary_language})`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      woman: selectedWoman,
      same_language: true,
      language: normalizedLanguage,
      idle: true
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
