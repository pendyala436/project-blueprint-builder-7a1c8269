import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default configuration (can be overridden by admin_settings)
let DEFAULT_MAX_CONCURRENT_CHATS = 3;
let DEFAULT_MAX_CONCURRENT_CALLS = 1;

// Load admin settings for max chat windows
async function loadSettings(supabase: any) {
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["max_concurrent_chats", "max_concurrent_calls"]);

    if (settings) {
      for (const setting of settings) {
        const value = parseInt(setting.setting_value, 10);
        if (isNaN(value)) continue;
        if (setting.setting_key === "max_concurrent_chats") {
          DEFAULT_MAX_CONCURRENT_CHATS = value;
        } else if (setting.setting_key === "max_concurrent_calls") {
          DEFAULT_MAX_CONCURRENT_CALLS = value;
        }
      }
    }
    console.log(`[CONFIG] Max chats: ${DEFAULT_MAX_CONCURRENT_CHATS}, Max calls: ${DEFAULT_MAX_CONCURRENT_CALLS}`);
  } catch (error) {
    console.error("[CONFIG] Error loading settings:", error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load configurable settings
    await loadSettings(supabase);

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

        // Insert into women_availability table with configurable max values
        const { error: availError } = await supabase
          .from('women_availability')
          .upsert({
            user_id: woman.user_id,
            is_available: false,
            is_available_for_calls: false,
            current_chat_count: 0,
            current_call_count: 0,
            max_concurrent_chats: DEFAULT_MAX_CONCURRENT_CHATS,
            max_concurrent_calls: DEFAULT_MAX_CONCURRENT_CALLS,
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

// DYNAMIC DISTRIBUTION FOR CHAT
// - Same language OR different language women allowed
// - Maximum 3 parallel chats per woman (configurable via admin_settings)
// - Cross-language chats use auto-translation
// - Prioritizes same language, falls back to different language with translation
async function distributeWomanForChat(supabase: any, data: any) {
  const { language, excludeUserIds = [] } = data;
  const normalizedLanguage = (language || "english").toLowerCase().trim();
  console.log(`[Chat] Finding woman for chat, preferred language: ${normalizedLanguage}`);

  // Step 1: Get online women
  const { data: onlineStatuses } = await supabase
    .from('user_status')
    .select('user_id')
    .eq('is_online', true);

  const onlineUserIds = onlineStatuses?.map((s: any) => s.user_id) || [];
  
  if (onlineUserIds.length === 0) {
    console.log('[Chat] No users online');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No users are currently online.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 2: Get women with availability (must be online and have capacity)
  const { data: availableWomen, error } = await supabase
    .from('women_availability')
    .select('user_id, current_chat_count, max_concurrent_chats, is_available')
    .or('is_available.eq.true')
    .in('user_id', onlineUserIds);

  if (error) {
    console.log('[Chat] Error fetching availability:', error);
  }

  if (!availableWomen?.length) {
    console.log('[Chat] No women with availability records');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No women available at the moment.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 3: Filter by capacity (current_chat_count < max_concurrent_chats)
  const womenWithCapacity = availableWomen.filter((w: any) => {
    const maxChats = w.max_concurrent_chats || DEFAULT_MAX_CONCURRENT_CHATS;
    const currentChats = w.current_chat_count || 0;
    return currentChats < maxChats && !excludeUserIds.includes(w.user_id);
  });

  if (womenWithCapacity.length === 0) {
    console.log('[Chat] All available women are at maximum capacity');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'All users are currently busy. Please try again later.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userIds = womenWithCapacity.map((w: any) => w.user_id);

  // Step 4: Get profiles for these women
  const { data: womenProfiles } = await supabase
    .from('female_profiles')
    .select('user_id, full_name, photo_url, primary_language, preferred_language, age')
    .in('user_id', userIds)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active')
    .not('photo_url', 'is', null);

  if (!womenProfiles?.length) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No approved users available.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 5: Get user_languages for language matching
  const { data: userLanguages } = await supabase
    .from('user_languages')
    .select('user_id, language_name')
    .in('user_id', userIds);

  const languageMap = new Map<string, string>();
  (userLanguages || []).forEach((l: any) => {
    languageMap.set(l.user_id, (l.language_name || '').toLowerCase().trim());
  });

  // Step 6: Categorize by language match
  const sameLanguageWomen: any[] = [];
  const differentLanguageWomen: any[] = [];

  for (const woman of womenProfiles) {
    const profileLang = (woman.primary_language || '').toLowerCase().trim();
    const preferredLang = (woman.preferred_language || '').toLowerCase().trim();
    const userLang = languageMap.get(woman.user_id) || '';
    
    const isSameLanguage = profileLang === normalizedLanguage || 
                           preferredLang === normalizedLanguage || 
                           userLang === normalizedLanguage;

    const avail = womenWithCapacity.find((w: any) => w.user_id === woman.user_id);
    const enrichedWoman = {
      ...woman,
      current_chat_count: avail?.current_chat_count || 0,
      isSameLanguage
    };

    if (isSameLanguage) {
      sameLanguageWomen.push(enrichedWoman);
    } else {
      differentLanguageWomen.push(enrichedWoman);
    }
  }

  console.log(`[Chat] Found ${sameLanguageWomen.length} same-language, ${differentLanguageWomen.length} different-language`);

  // Step 7: Sort by load (lowest chat count first) for fair distribution
  const sortByLoad = (a: any, b: any) => a.current_chat_count - b.current_chat_count;
  sameLanguageWomen.sort(sortByLoad);
  differentLanguageWomen.sort(sortByLoad);

  // Step 8: Prioritize same language, fall back to different language
  const candidates = sameLanguageWomen.length > 0 ? sameLanguageWomen : differentLanguageWomen;

  if (candidates.length === 0) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No available users found.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const selectedWoman = candidates[0];
  const needsTranslation = !selectedWoman.isSameLanguage;

  console.log(`[Chat] Selected: ${selectedWoman.full_name}, same_language: ${selectedWoman.isSameLanguage}, load: ${selectedWoman.current_chat_count}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      woman: selectedWoman,
      needs_translation: needsTranslation,
      same_language: selectedWoman.isSameLanguage,
      available_count: candidates.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// DYNAMIC DISTRIBUTION FOR VIDEO CALL
// - 1-to-1 connection only (max 1 concurrent call per woman)
// - SAME LANGUAGE ONLY - no cross-language video calls
// - No translation for video calls
async function distributeWomanForCall(supabase: any, data: any) {
  const { language, excludeUserIds = [] } = data;
  const normalizedLanguage = (language || "english").toLowerCase().trim();
  console.log(`[VideoCall] Finding woman for video call, language: ${normalizedLanguage} (SAME LANGUAGE ONLY)`);
  console.log(`[VideoCall] Excluded users: ${excludeUserIds.length}`);

  // Step 1: Get ONLY online users
  const { data: onlineStatuses } = await supabase
    .from('user_status')
    .select('user_id')
    .eq('is_online', true);

  const onlineUserIds = onlineStatuses?.map((s: any) => s.user_id) || [];
  
  if (onlineUserIds.length === 0) {
    console.log('[VideoCall] No users online');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No users are currently online.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 2: Get women currently on active video calls (to exclude them)
  const { data: activeVideoSessions } = await supabase
    .from('video_call_sessions')
    .select('woman_user_id')
    .in('status', ['active', 'ringing', 'connecting']);

  const womenOnCalls = activeVideoSessions?.map((s: any) => s.woman_user_id) || [];
  console.log(`[VideoCall] Women currently on calls: ${womenOnCalls.length}`);

  // Step 3: Get women available for calls (must be online and not at max calls)
  const { data: availableWomen, error } = await supabase
    .from('women_availability')
    .select('user_id, current_call_count, max_concurrent_calls, current_chat_count, max_concurrent_chats, is_available, is_available_for_calls')
    .or('is_available.eq.true,is_available_for_calls.eq.true')
    .in('user_id', onlineUserIds);

  if (error) {
    console.log('[VideoCall] Error fetching women availability:', error);
  }

  if (!availableWomen?.length) {
    console.log('[VideoCall] No online women with availability records');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No free user available for video calls.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 4: Filter by call capacity and exclude busy/excluded users
  const allExcluded = [...excludeUserIds, ...womenOnCalls];
  const womenWithCallCapacity = availableWomen.filter((w: any) => {
    const maxCalls = w.max_concurrent_calls || DEFAULT_MAX_CONCURRENT_CALLS;
    const currentCalls = w.current_call_count || 0;
    return currentCalls < maxCalls && !allExcluded.includes(w.user_id);
  });

  if (womenWithCallCapacity.length === 0) {
    console.log('[VideoCall] All available women are on calls or excluded');
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No free user available. All users are busy on calls.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userIds = womenWithCallCapacity.map((w: any) => w.user_id);

  // Step 5: Get profiles for these women
  const { data: womenProfiles } = await supabase
    .from('female_profiles')
    .select('user_id, full_name, photo_url, primary_language, preferred_language, age')
    .in('user_id', userIds)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active')
    .not('photo_url', 'is', null);

  if (!womenProfiles?.length) {
    return new Response(
      JSON.stringify({ success: false, woman: null, reason: 'No approved users available.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 6: Get user_languages for language matching
  const { data: userLanguages } = await supabase
    .from('user_languages')
    .select('user_id, language_name')
    .in('user_id', userIds);

  const languageMap = new Map<string, string>();
  (userLanguages || []).forEach((l: any) => {
    languageMap.set(l.user_id, (l.language_name || '').toLowerCase().trim());
  });

  // Step 7: VIDEO CALLS REQUIRE SAME LANGUAGE - Filter strictly
  const sameLanguageWomen = womenProfiles.filter((w: any) => {
    const profileLang = (w.primary_language || '').toLowerCase().trim();
    const preferredLang = (w.preferred_language || '').toLowerCase().trim();
    const userLang = languageMap.get(w.user_id) || '';
    
    return profileLang === normalizedLanguage || 
           preferredLang === normalizedLanguage || 
           userLang === normalizedLanguage;
  });

  console.log(`[VideoCall] Found ${sameLanguageWomen.length} same-language women out of ${womenProfiles.length} total`);

  // VIDEO CALLS: Must have same language - no fallback to different language
  if (sameLanguageWomen.length === 0) {
    console.log(`[VideoCall] No same-language match for ${normalizedLanguage}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        woman: null, 
        reason: `No free user available of the same language (${language || 'your language'}). Video calls require same language.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Step 8: Sort by load (lowest call/chat count first) for fair distribution
  const availabilityMap = new Map<string, any>(womenWithCallCapacity.map((w: any) => [w.user_id, w]));
  sameLanguageWomen.sort((a: any, b: any) => {
    const availA = availabilityMap.get(a.user_id);
    const availB = availabilityMap.get(b.user_id);
    const loadA = (availA?.current_call_count || 0) + (availA?.current_chat_count || 0);
    const loadB = (availB?.current_call_count || 0) + (availB?.current_chat_count || 0);
    return loadA - loadB;
  });

  const selectedWoman = sameLanguageWomen[0];
  console.log(`[VideoCall] Selected: ${selectedWoman.full_name} (primary_language: ${selectedWoman.primary_language})`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      woman: selectedWoman,
      same_language: true,
      language: normalizedLanguage,
      available_count: sameLanguageWomen.length
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
