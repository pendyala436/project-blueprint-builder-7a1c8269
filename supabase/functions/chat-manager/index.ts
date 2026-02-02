import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default values (will be overridden by admin_settings)
let PRIORITY_WAIT_THRESHOLD_SECONDS = 180; // 3 minutes
let CHAT_INACTIVITY_TIMEOUT_SECONDS = 120; // 2 minutes - chat auto-stops if inactive
let USER_IDLE_TIMEOUT_SECONDS = 600; // 10 minutes - user auto-logged out if idle
let MAX_PARALLEL_CHATS = 3; // Maximum parallel connections per user
let RECONNECT_ATTEMPTS = 3; // Auto-reconnect attempts
let HEARTBEAT_INTERVAL_SECONDS = 60; // Billing heartbeat interval

// Super user email patterns - they bypass ALL balance requirements
const SUPER_USER_PATTERNS = {
  female: /^female([1-9]|1[0-5])@meow-meow\.com$/i,
  male: /^male([1-9]|1[0-5])@meow-meow\.com$/i,
  admin: /^admin([1-9]|1[0-5])@meow-meow\.com$/i,
};

const isSuperUserEmail = (email: string): boolean => {
  if (!email) return false;
  return (
    SUPER_USER_PATTERNS.female.test(email) ||
    SUPER_USER_PATTERNS.male.test(email) ||
    SUPER_USER_PATTERNS.admin.test(email)
  );
};

// Helper function to check if a user is a super user by their user_id
const checkIsSuperUser = async (supabase: any, userId: string): Promise<boolean> => {
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (authUser?.user?.email) {
      return isSuperUserEmail(authUser.user.email);
    }
    return false;
  } catch (error) {
    console.error("Error checking super user status:", error);
    return false;
  }
};

// NLLB-200 supported countries list (countries with NLLB language support)
const NLLB200_COUNTRIES = [
  // Major countries with NLLB language support
  "india", "united states", "united kingdom", "australia", "canada", 
  "germany", "france", "spain", "italy", "portugal", "russia", "poland", "ukraine",
  "china", "japan", "korea", "south korea", "vietnam", "thailand", "indonesia", "malaysia", "philippines", "myanmar", "cambodia",
  "saudi arabia", "uae", "united arab emirates", "iran", "turkey", "israel",
  "kenya", "tanzania", "ethiopia", "nigeria", "south africa", "egypt",
  "brazil", "mexico", "argentina", "colombia", "peru", "chile",
  "greece", "romania", "hungary", "czech republic", "sweden", "denmark", "finland", "norway",
  "netherlands", "belgium", "switzerland", "austria",
  "pakistan", "bangladesh", "nepal", "sri lanka"
];

// Indian NLLB-200 languages
const INDIAN_LANGUAGES = [
  "hindi", "bengali", "marathi", "telugu", "tamil", "gujarati", "urdu", 
  "kannada", "odia", "malayalam", "punjabi", "assamese", "maithili", 
  "santali", "kashmiri", "nepali", "sindhi", "dogri", "konkani", "manipuri",
  "bodo", "sanskrit"
];

const isIndianLanguage = (lang: string): boolean => {
  const lowerLang = lang.toLowerCase().trim();
  return INDIAN_LANGUAGES.some(l => lowerLang.includes(l) || l.includes(lowerLang));
};

// Helper to load admin settings
async function loadAdminSettings(supabase: any): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "auto_disconnect_timer",
        "max_parallel_connections",
        "reconnect_attempts",
        "heartbeat_interval",
        "priority_wait_threshold"
      ]);

    if (settings) {
      for (const setting of settings) {
        const value = parseInt(setting.setting_value, 10);
        if (isNaN(value)) continue;

        switch (setting.setting_key) {
          case "auto_disconnect_timer":
          case "chat_inactivity_timeout":
            CHAT_INACTIVITY_TIMEOUT_SECONDS = value;
            break;
          case "user_idle_timeout":
            USER_IDLE_TIMEOUT_SECONDS = value;
            break;
          case "max_parallel_connections":
            MAX_PARALLEL_CHATS = value;
            break;
          case "reconnect_attempts":
            RECONNECT_ATTEMPTS = value;
            break;
          case "heartbeat_interval":
            HEARTBEAT_INTERVAL_SECONDS = value;
            break;
          case "priority_wait_threshold":
            PRIORITY_WAIT_THRESHOLD_SECONDS = value;
            break;
        }
      }
    }
    console.log(`[CONFIG] Loaded settings: chatInactivity=${CHAT_INACTIVITY_TIMEOUT_SECONDS}s, userIdle=${USER_IDLE_TIMEOUT_SECONDS}s, maxChats=${MAX_PARALLEL_CHATS}, reconnect=${RECONNECT_ATTEMPTS}, heartbeat=${HEARTBEAT_INTERVAL_SECONDS}s`);
  } catch (error) {
    console.error("[CONFIG] Error loading admin settings, using defaults:", error);
  }
}

interface ChatRequest {
  action: "start_chat" | "end_chat" | "heartbeat" | "transfer_chat" | "get_available_woman" | "get_available_indian_woman" | "find_match" | "auto_reconnect" | "join_queue" | "leave_queue" | "check_queue_status" | "update_status" | "check_inactivity" | "get_active_chats" | "get_settings";
  man_user_id?: string;
  woman_user_id?: string;
  user_id?: string;
  chat_id?: string;
  end_reason?: string;
  preferred_language?: string;
  man_country?: string;
  exclude_user_ids?: string[]; // Users to exclude from matching
}

// Helper to verify authenticated user and extract user ID from JWT
async function verifyAuthAndGetUser(req: Request): Promise<{ isValid: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create a client with the user's auth header for proper JWT validation
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  
  // CRITICAL: Pass token explicitly for proper validation with verify_jwt=false
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) {
    console.log(`[AUTH] Token validation failed: ${error?.message || 'No user returned'}`);
    return { isValid: false, error: 'Invalid or expired token' };
  }

  return { isValid: true, userId: user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify caller is authenticated
    const authResult = await verifyAuthAndGetUser(req);
    if (!authResult.isValid) {
      console.log(`[SECURITY] Unauthorized access to chat-manager: ${authResult.error}`);
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = authResult.userId;

    // Load dynamic settings from admin_settings
    await loadAdminSettings(supabase);

    const { action, man_user_id, woman_user_id, user_id, chat_id, end_reason, preferred_language, man_country, exclude_user_ids }: ChatRequest = await req.json();

    // SECURITY: Verify the user_id in request matches authenticated user (prevent impersonation)
    const requestedUserId = user_id || man_user_id || woman_user_id;
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      // Check if authenticated user is admin (admins can act on behalf of others)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authenticatedUserId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roleData) {
        console.log(`[SECURITY] User ${authenticatedUserId} attempted to act as ${requestedUserId}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot perform actions for other users' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[AUDIT] User ${authenticatedUserId} called chat-manager action: ${action}`, { man_user_id, woman_user_id, user_id, chat_id, preferred_language, man_country });

    // Helper function to update user status based on their chat sessions
    const updateUserStatus = async (userId: string) => {
      // Get active chat count
      const { count: manChats } = await supabase
        .from("active_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("man_user_id", userId)
        .eq("status", "active");

      const { count: womanChats } = await supabase
        .from("active_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("woman_user_id", userId)
        .eq("status", "active");

      const totalChats = (manChats || 0) + (womanChats || 0);
      
      // Determine status: 3 sessions = busy, 1-2 = online, 0 = depends on if logged in
      let statusText = "online";
      if (totalChats >= 3) {
        statusText = "busy";
      } else if (totalChats > 0) {
        statusText = "online";
      }

      // Update user_status table
      const { data: existingStatus } = await supabase
        .from("user_status")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingStatus) {
        await supabase
          .from("user_status")
          .update({
            is_online: true,
            status_text: statusText,
            last_seen: new Date().toISOString()
          })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_status")
          .insert({
            user_id: userId,
            is_online: true,
            status_text: statusText,
            last_seen: new Date().toISOString()
          });
      }

      return { totalChats, statusText };
    };

    switch (action) {
      // Update user status (login/logout/activity)
      case "update_status": {
        const targetUserId = user_id || man_user_id || woman_user_id;
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user ID" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { totalChats, statusText } = await updateUserStatus(targetUserId);

        return new Response(
          JSON.stringify({ success: true, status: statusText, active_chats: totalChats }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for inactive sessions and end them
      case "check_inactivity": {
        const targetUserId = user_id || man_user_id || woman_user_id;
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user ID" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const now = new Date();
        const thresholdTime = new Date(now.getTime() - CHAT_INACTIVITY_TIMEOUT_SECONDS * 1000);

        // Find inactive sessions for this user (as man)
        const { data: inactiveManSessions } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("man_user_id", targetUserId)
          .eq("status", "active")
          .lt("last_activity_at", thresholdTime.toISOString());

        // Find inactive sessions for this user (as woman)
        const { data: inactiveWomanSessions } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("woman_user_id", targetUserId)
          .eq("status", "active")
          .lt("last_activity_at", thresholdTime.toISOString());

        const endedSessions: string[] = [];

        // End inactive man sessions
        for (const session of inactiveManSessions || []) {
          await endChatSession(supabase, session.chat_id, "inactivity_timeout", session);
          endedSessions.push(session.chat_id);
          console.log(`Ended inactive session (man): ${session.chat_id}`);
        }

        // End inactive woman sessions
        for (const session of inactiveWomanSessions || []) {
          await endChatSession(supabase, session.chat_id, "inactivity_timeout", session);
          endedSessions.push(session.chat_id);
          console.log(`Ended inactive session (woman): ${session.chat_id}`);
        }

        // Update user status after ending sessions
        if (endedSessions.length > 0) {
          await updateUserStatus(targetUserId);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            ended_sessions: endedSessions,
            count: endedSessions.length 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      case "join_queue": {
        if (!man_user_id || !preferred_language) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user ID or language" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Check if already in queue
        const { data: existingQueue } = await supabase
          .from("chat_wait_queue")
          .select("id")
          .eq("user_id", man_user_id)
          .eq("status", "waiting")
          .maybeSingle();

        if (existingQueue) {
          return new Response(
            JSON.stringify({ success: true, message: "Already in queue", queue_id: existingQueue.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Add to queue
        const { data: queueEntry, error } = await supabase
          .from("chat_wait_queue")
          .insert({
            user_id: man_user_id,
            preferred_language,
            status: "waiting",
            priority: 0
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`User ${man_user_id} joined queue for language: ${preferred_language}`);

        return new Response(
          JSON.stringify({ success: true, queue_id: queueEntry.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "leave_queue": {
        if (!man_user_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user ID" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        await supabase
          .from("chat_wait_queue")
          .update({ status: "left" })
          .eq("user_id", man_user_id)
          .eq("status", "waiting");

        console.log(`User ${man_user_id} left queue`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_queue_status": {
        if (!man_user_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user ID" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Get user's queue entry
        const { data: queueEntry } = await supabase
          .from("chat_wait_queue")
          .select("*")
          .eq("user_id", man_user_id)
          .eq("status", "waiting")
          .maybeSingle();

        if (!queueEntry) {
          return new Response(
            JSON.stringify({ success: false, message: "Not in queue" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const waitTimeSeconds = Math.floor((Date.now() - new Date(queueEntry.joined_at).getTime()) / 1000);
        const isPriority = waitTimeSeconds >= PRIORITY_WAIT_THRESHOLD_SECONDS;

        // Update wait time and priority
        if (isPriority && queueEntry.priority === 0) {
          await supabase
            .from("chat_wait_queue")
            .update({ priority: 1, wait_time_seconds: waitTimeSeconds })
            .eq("id", queueEntry.id);
        } else {
          await supabase
            .from("chat_wait_queue")
            .update({ wait_time_seconds: waitTimeSeconds })
            .eq("id", queueEntry.id);
        }

        // Get queue position
        const { count: positionAhead } = await supabase
          .from("chat_wait_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "waiting")
          .eq("preferred_language", queueEntry.preferred_language)
          .lt("joined_at", queueEntry.joined_at);

        return new Response(
          JSON.stringify({ 
            success: true, 
            wait_time_seconds: waitTimeSeconds,
            is_priority: isPriority,
            queue_position: (positionAhead || 0) + 1,
            preferred_language: queueEntry.preferred_language
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // MAIN MATCHING LOGIC: Find best match based on language with load balancing (global - all languages)
      case "find_match": {
        const manLanguage = (preferred_language || "english").toLowerCase().trim();
        const manId = man_user_id;
        
        if (!manId) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing man user ID" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        console.log(`Finding match for man ${manId} with language: ${manLanguage}`);
        
        // Step 1: Get all online women
        const { data: onlineStatuses } = await supabase
          .from("user_status")
          .select("user_id")
          .eq("is_online", true);
        
        const onlineUserIds = onlineStatuses?.map((s: any) => s.user_id) || [];
        
        if (onlineUserIds.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No women online" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Step 2: Get female profiles with their languages (global - all countries)
        const { data: womenProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, primary_language, preferred_language, country, ai_approved, approval_status")
          .or("gender.eq.female,gender.eq.Female")
          .in("user_id", onlineUserIds);

        if (!womenProfiles || womenProfiles.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No women profiles found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Step 3: Get availability for load balancing
        const womenIds = womenProfiles.map((w: any) => w.user_id);
        const { data: availabilities } = await supabase
          .from("women_availability")
          .select("user_id, current_chat_count, max_concurrent_chats, is_available")
          .in("user_id", womenIds);

        const availabilityMap = new Map<string, any>();
        (availabilities || []).forEach((a: any) => availabilityMap.set(a.user_id, a));

        // Step 4: Get languages from user_languages table
        const { data: userLanguages } = await supabase
          .from("user_languages")
          .select("user_id, language_name")
          .in("user_id", womenIds);

        const languageMap = new Map<string, string>();
        (userLanguages || []).forEach((l: any) => {
          if (!languageMap.has(l.user_id)) {
            languageMap.set(l.user_id, l.language_name);
          }
        });

        // Step 5: Filter women by availability (no language/country restrictions)
        const eligibleWomen: any[] = [];
        
        for (const woman of womenProfiles) {
          const avail = availabilityMap.get(woman.user_id);
          const maxChats = avail?.max_concurrent_chats || 3;
          const currentChats = avail?.current_chat_count || 0;
          const isAvailable = avail?.is_available !== false;
          
          // Check if woman has capacity
          if (currentChats >= maxChats || !isAvailable) {
            continue;
          }

          // Get woman's language
          const womanLanguage = (
            languageMap.get(woman.user_id) || 
            woman.primary_language || 
            woman.preferred_language || 
            "english"
          ).toLowerCase().trim();

          eligibleWomen.push({
            ...woman,
            language: womanLanguage,
            currentChats,
            isSameLanguage: womanLanguage === manLanguage
          });
        }

        if (eligibleWomen.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No women available at the moment" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Step 6: Sort by priority (same language first, then by load)
        eligibleWomen.sort((a, b) => {
          // Priority 1: Same language
          if (a.isSameLanguage !== b.isSameLanguage) {
            return a.isSameLanguage ? -1 : 1;
          }
          // Priority 2: Lower chat count (load balancing)
          return a.currentChats - b.currentChats;
        });

        const selectedWoman = eligibleWomen[0];
        const translationNeeded = !selectedWoman.isSameLanguage;

        console.log(`Match found: ${selectedWoman.user_id}, language: ${selectedWoman.language}, same_language: ${selectedWoman.isSameLanguage}, load: ${selectedWoman.currentChats}`);

        return new Response(
          JSON.stringify({
            success: true,
            woman_user_id: selectedWoman.user_id,
            profile: {
              full_name: selectedWoman.full_name,
              photo_url: selectedWoman.photo_url,
              primary_language: selectedWoman.language,
              country: selectedWoman.country
            },
            same_language: selectedWoman.isSameLanguage,
            translation_needed: translationNeeded,
            current_load: selectedWoman.currentChats,
            total_available: eligibleWomen.length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_available_woman": {
        const requestedLanguage = preferred_language || "en";
        const requestedLanguageLower = requestedLanguage.toLowerCase().trim();

        console.log(`[get_available_woman] Finding ONLINE woman for language: ${requestedLanguage}`);

        // CRITICAL: First get only ONLINE users from user_status
        const { data: onlineStatuses } = await supabase
          .from("user_status")
          .select("user_id")
          .eq("is_online", true);

        const onlineUserIds = onlineStatuses?.map((s: any) => s.user_id) || [];
        
        if (onlineUserIds.length === 0) {
          console.log("[get_available_woman] No users online at all");
          return new Response(
            JSON.stringify({ success: false, message: "No women online at the moment. Please try again later." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find language group for this language
        const { data: languageGroups } = await supabase
          .from("language_groups")
          .select("id, languages")
          .eq("is_active", true);

        let matchingGroupId: string | null = null;
        if (languageGroups) {
          for (const group of languageGroups) {
            if (group.languages && group.languages.includes(requestedLanguage)) {
              matchingGroupId = group.id;
              break;
            }
          }
        }

        // Find available AND online women
        let availableWomen: any[] = [];
        
        if (matchingGroupId) {
          const { data } = await supabase
            .from("women_availability")
            .select(`
              user_id, 
              current_chat_count,
              women_shift_assignments!inner(language_group_id)
            `)
            .eq("is_available", true)
            .lt("current_chat_count", 3)
            .in("user_id", onlineUserIds) // MUST be online
            .eq("women_shift_assignments.language_group_id", matchingGroupId)
            .order("current_chat_count", { ascending: true })
            .order("last_assigned_at", { ascending: true, nullsFirst: true })
            .limit(1);
          
          if (data && data.length > 0) {
            availableWomen = data;
          }
        }

        // If no language match, find any available AND online woman
        if (availableWomen.length === 0) {
          const { data, error } = await supabase
            .from("women_availability")
            .select("user_id, current_chat_count")
            .eq("is_available", true)
            .lt("current_chat_count", 3)
            .in("user_id", onlineUserIds) // MUST be online
            .order("current_chat_count", { ascending: true })
            .order("last_assigned_at", { ascending: true, nullsFirst: true })
            .limit(1);

          if (error) throw error;
          availableWomen = data || [];
        }

        // No sample/mock data fallback - only use real authenticated users
        if (availableWomen.length === 0) {
          console.log("[get_available_woman] No online women available for chat");
          return new Response(
            JSON.stringify({ success: false, message: "No women online at the moment. Please try again later." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const selectedWoman = availableWomen[0];

        // Get woman's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, photo_url, primary_language")
          .eq("user_id", selectedWoman.user_id)
          .single();

        console.log(`[get_available_woman] Found ONLINE woman: ${profile?.full_name || selectedWoman.user_id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            woman_user_id: selectedWoman.user_id,
            profile,
            language_matched: matchingGroupId !== null
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Match users globally - prioritizes same language, with translation support for all languages
      case "get_available_indian_woman": {
        const requestedLanguage = preferred_language || "en";
        const requestedLanguageLower = requestedLanguage.toLowerCase().trim();

        // Find online women with availability (no country restrictions - global app)
        const { data: onlineStatuses } = await supabase
          .from("user_status")
          .select("user_id")
          .eq("is_online", true);

        if (!onlineStatuses || onlineStatuses.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No women online at the moment" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const onlineUserIds = onlineStatuses.map(s => s.user_id);

        // Get female profiles (global - all countries)
        const { data: womenProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, primary_language, preferred_language, country")
          .or("gender.eq.female,gender.eq.Female")
          .in("user_id", onlineUserIds);

        if (!womenProfiles || womenProfiles.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No women available at the moment" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const womenIds = womenProfiles.map(w => w.user_id);

        // Get availability for load balancing
        const { data: availabilities } = await supabase
          .from("women_availability")
          .select("user_id, current_chat_count, max_concurrent_chats, is_available")
          .in("user_id", womenIds);

        const availabilityMap = new Map<string, any>();
        (availabilities || []).forEach((a: any) => availabilityMap.set(a.user_id, a));

        // Get languages from user_languages table
        const { data: userLanguages } = await supabase
          .from("user_languages")
          .select("user_id, language_name")
          .in("user_id", womenIds);

        const languageMap = new Map<string, string>();
        (userLanguages || []).forEach((l: any) => {
          if (!languageMap.has(l.user_id)) {
            languageMap.set(l.user_id, l.language_name);
          }
        });

        // Filter and categorize eligible women (no country restrictions)
        const eligibleWomen: any[] = [];
        
        for (const woman of womenProfiles) {
          const avail = availabilityMap.get(woman.user_id);
          const maxChats = avail?.max_concurrent_chats || 3;
          const currentChats = avail?.current_chat_count || 0;
          const isAvailable = avail?.is_available !== false;
          
          // Check if woman has capacity
          if (currentChats >= maxChats || !isAvailable) {
            continue;
          }

          // Get woman's language from user_languages table first, then profile
          const womanLanguage = (
            languageMap.get(woman.user_id) || 
            woman.primary_language || 
            woman.preferred_language || 
            "english"
          ).toLowerCase().trim();

          const isSameLanguage = womanLanguage === requestedLanguageLower;

          eligibleWomen.push({
            ...woman,
            language: womanLanguage,
            currentChats,
            isSameLanguage
          });
        }

        if (eligibleWomen.length === 0) {
          console.log("No eligible women available for chat");
          return new Response(
            JSON.stringify({ success: false, message: "No women available at the moment. Please try again later." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Sort by priority:
        // 1. Same language (highest priority)
        // 2. Lower chat count (load balancing)
        eligibleWomen.sort((a, b) => {
          // Priority 1: Same language
          if (a.isSameLanguage !== b.isSameLanguage) {
            return a.isSameLanguage ? -1 : 1;
          }
          // Priority 2: Lower chat count (load balancing)
          return a.currentChats - b.currentChats;
        });

        const selectedWoman = eligibleWomen[0];
        const translationNeeded = !selectedWoman.isSameLanguage;

        console.log(`Matched man (lang: ${requestedLanguage}) with woman ${selectedWoman.user_id}, lang: ${selectedWoman.language}, same_language: ${selectedWoman.isSameLanguage}, load: ${selectedWoman.currentChats}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            woman_user_id: selectedWoman.user_id,
            profile: {
              full_name: selectedWoman.full_name,
              photo_url: selectedWoman.photo_url,
              primary_language: selectedWoman.language
            },
            current_load: selectedWoman.currentChats,
            same_language: selectedWoman.isSameLanguage,
            translation_enabled: translationNeeded,
            woman_country: selectedWoman.country || "Unknown"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "start_chat": {
        if (!man_user_id || !woman_user_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user IDs" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // SECURITY: Check if either user has blocked the other
        const { data: blockCheck } = await supabase
          .from("user_blocks")
          .select("id, blocked_by")
          .or(`and(blocked_by.eq.${man_user_id},blocked_user_id.eq.${woman_user_id}),and(blocked_by.eq.${woman_user_id},blocked_user_id.eq.${man_user_id})`)
          .maybeSingle();

        if (blockCheck) {
          const blockedByMan = blockCheck.blocked_by === man_user_id;
          console.log(`[SECURITY] Chat blocked - ${blockedByMan ? 'Man blocked woman' : 'Woman blocked man'}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: blockedByMan 
                ? "You have blocked this user" 
                : "This user has blocked you",
              error_code: "USER_BLOCKED"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }

        // SECURITY: Verify that the authenticated user is the man (initiator)
        // Women cannot initiate chats - they can only respond
        if (authenticatedUserId !== man_user_id) {
          // Check if the authenticated user is the woman trying to initiate
          if (authenticatedUserId === woman_user_id) {
            console.log(`[SECURITY] Woman ${authenticatedUserId} attempted to initiate chat - BLOCKED`);
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: "Women cannot initiate chats. Please wait for men to start a conversation with you.",
                error_code: "WOMEN_CANNOT_INITIATE"
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
            );
          }
          
          // Check if admin (admins can act on behalf)
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', authenticatedUserId)
            .eq('role', 'admin')
            .maybeSingle();
          
          if (!roleData) {
            console.log(`[SECURITY] User ${authenticatedUserId} attempted to start chat as ${man_user_id} - BLOCKED`);
            return new Response(
              JSON.stringify({ success: false, message: "You can only initiate chats as yourself" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
            );
          }
        }

        // Verify the initiator (man_user_id) is actually male
        const { data: initiatorProfile } = await supabase
          .from("profiles")
          .select("gender")
          .eq("user_id", man_user_id)
          .maybeSingle();
        
        if (initiatorProfile?.gender?.toLowerCase() === "female") {
          console.log(`[SECURITY] Female user ${man_user_id} attempted to initiate chat as man - BLOCKED`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Women cannot initiate chats. Please wait for men to start a conversation with you.",
              error_code: "WOMEN_CANNOT_INITIATE"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }

        const MAX_PARALLEL_CHATS = 3;

        // Check man's active chat count (max 3 parallel sessions)
        const { count: manActiveChats } = await supabase
          .from("active_chat_sessions")
          .select("*", { count: "exact", head: true })
          .eq("man_user_id", man_user_id)
          .eq("status", "active");

        if ((manActiveChats || 0) >= MAX_PARALLEL_CHATS) {
          return new Response(
            JSON.stringify({ success: false, message: `Maximum ${MAX_PARALLEL_CHATS} parallel chats allowed` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check woman's active chat count (max 3 parallel sessions)
        const { count: womanActiveChats } = await supabase
          .from("active_chat_sessions")
          .select("*", { count: "exact", head: true })
          .eq("woman_user_id", woman_user_id)
          .eq("status", "active");

        if ((womanActiveChats || 0) >= MAX_PARALLEL_CHATS) {
          return new Response(
            JSON.stringify({ success: false, message: "This user is at maximum chat capacity" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove from queue if present
        await supabase
          .from("chat_wait_queue")
          .update({ status: "matched", matched_at: new Date().toISOString() })
          .eq("user_id", man_user_id)
          .eq("status", "waiting");

        // Only check wallet balance for real users (not super users)
        // Check if user is a super user by email - they bypass ALL balance requirements
        const isSuperUser = await checkIsSuperUser(supabase, man_user_id);
        
        if (!isSuperUser) {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", man_user_id)
            .maybeSingle();

          // Get current pricing to calculate minimum balance requirement
          const { data: pricingData } = await supabase
            .from("chat_pricing")
            .select("rate_per_minute")
            .eq("is_active", true)
            .maybeSingle();
          
          const ratePerMin = pricingData?.rate_per_minute || 5.00;
          const minRequiredBalance = ratePerMin * 2; // Need at least 2 minutes worth

          if (!wallet || wallet.balance < minRequiredBalance) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: `Insufficient balance. Need at least ₹${minRequiredBalance} to start chat.`,
                min_balance_required: minRequiredBalance,
                current_balance: wallet?.balance || 0
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.log(`[START_CHAT] Super user ${man_user_id} - bypassing balance check`);
        }

        // Get current pricing
        const { data: pricing } = await supabase
          .from("chat_pricing")
          .select("rate_per_minute, women_earning_rate")
          .eq("is_active", true)
          .maybeSingle();

        const ratePerMinute = pricing?.rate_per_minute || 4.00;
        const womenEarningRate = pricing?.women_earning_rate || 2.00;

        // Create chat session
        const chatId = `chat_${man_user_id}_${woman_user_id}_${Date.now()}`;
        const { data: session, error: sessionError } = await supabase
          .from("active_chat_sessions")
          .insert({
            chat_id: chatId,
            man_user_id,
            woman_user_id,
            rate_per_minute: ratePerMinute,
            status: "active"
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Update woman's availability
        const { data: currentAvailability } = await supabase
          .from("women_availability")
          .select("current_chat_count")
          .eq("user_id", woman_user_id)
          .maybeSingle();

        if (currentAvailability) {
          await supabase
            .from("women_availability")
            .update({
              current_chat_count: currentAvailability.current_chat_count + 1,
              last_assigned_at: new Date().toISOString()
            })
            .eq("user_id", woman_user_id);
        }

        // Update both users' status
        await updateUserStatus(man_user_id);
        await updateUserStatus(woman_user_id);

        console.log(`Chat started: ${chatId}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            chat_id: chatId,
            session,
            rate_per_minute: ratePerMinute
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "heartbeat": {
        if (!chat_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing chat_id" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Get session (include both active and billing_paused statuses)
        const { data: session } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("chat_id", chat_id)
          .in("status", ["active", "billing_paused"])
          .maybeSingle();

        if (!session) {
          return new Response(
            JSON.stringify({ success: false, message: "Session not found or ended" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const isBillingPaused = session.status === "billing_paused";

        const MESSAGE_INACTIVITY_TIMEOUT_MS = 180000; // 3 minutes in milliseconds
        const now = new Date();

        // Get messages from both parties to check two-way conversation
        const { data: manMessages } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("chat_id", chat_id)
          .eq("sender_id", session.man_user_id)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: womanMessages } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("chat_id", chat_id)
          .eq("sender_id", session.woman_user_id)
          .order("created_at", { ascending: false })
          .limit(1);

        const manHasMessaged = manMessages && manMessages.length > 0;
        const womanHasMessaged = womanMessages && womanMessages.length > 0;
        const bothHaveMessaged = manHasMessaged && womanHasMessaged;

        // BILLING REQUIREMENT: Both man AND woman must have sent at least one message
        if (!bothHaveMessaged) {
          // Just update activity timestamp, no billing
          await supabase
            .from("active_chat_sessions")
            .update({ last_activity_at: now.toISOString() })
            .eq("chat_id", chat_id);

          const waitingFor = !manHasMessaged && !womanHasMessaged 
            ? "both parties to send first message"
            : !manHasMessaged 
              ? "man to send first message" 
              : "woman to reply";

          return new Response(
            JSON.stringify({ 
              success: true, 
              billing_started: false,
              man_has_messaged: manHasMessaged,
              woman_has_messaged: womanHasMessaged,
              waiting_for: waitingFor,
              message: `Billing not started: waiting for ${waitingFor}`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check 3-minute inactivity from either party - PAUSE BILLING (don't disconnect)
        const manLastMessageTime = new Date(manMessages[0].created_at).getTime();
        const womanLastMessageTime = new Date(womanMessages[0].created_at).getTime();
        const nowTime = now.getTime();

        const manInactiveMs = nowTime - manLastMessageTime;
        const womanInactiveMs = nowTime - womanLastMessageTime;

        // If either party hasn't replied for 3 minutes, PAUSE BILLING (chat stays connected)
        if (manInactiveMs >= MESSAGE_INACTIVITY_TIMEOUT_MS) {
          console.log(`[HEARTBEAT] Man ${session.man_user_id} inactive for ${Math.floor(manInactiveMs / 1000)}s - PAUSING billing (chat stays connected)`);
          
          // Update session to mark billing as paused
          await supabase
            .from("active_chat_sessions")
            .update({ 
              last_activity_at: now.toISOString(),
              status: "billing_paused"
            })
            .eq("chat_id", chat_id);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              billing_paused: true,
              billing_started: false,
              message: "Billing paused: Man inactive for 3+ minutes. Chat still connected - reply to resume billing.",
              inactive_party: "man",
              inactive_seconds: Math.floor(manInactiveMs / 1000)
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (womanInactiveMs >= MESSAGE_INACTIVITY_TIMEOUT_MS) {
          console.log(`[HEARTBEAT] Woman ${session.woman_user_id} inactive for ${Math.floor(womanInactiveMs / 1000)}s - PAUSING billing (chat stays connected)`);
          
          // Update session to mark billing as paused
          await supabase
            .from("active_chat_sessions")
            .update({ 
              last_activity_at: now.toISOString(),
              status: "billing_paused"
            })
            .eq("chat_id", chat_id);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              billing_paused: true,
              billing_started: false,
              message: "Billing paused: Woman inactive for 3+ minutes. Chat still connected - reply to resume billing.",
              inactive_party: "woman",
              inactive_seconds: Math.floor(womanInactiveMs / 1000)
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Both parties are active (within 3 minutes) - resume billing if it was paused
        if (isBillingPaused) {
          console.log(`[HEARTBEAT] Both parties active - resuming billing for chat ${chat_id}`);
          await supabase
            .from("active_chat_sessions")
            .update({ 
              status: "active",
              last_activity_at: now.toISOString()
            })
            .eq("chat_id", chat_id);
        }

        // Get current pricing for women's earning rate
        const { data: pricing } = await supabase
          .from("chat_pricing")
          .select("women_earning_rate")
          .eq("is_active", true)
          .maybeSingle();

        const womenEarningRate = pricing?.women_earning_rate || 2.00;

        // Calculate time elapsed since last activity (using 'now' from above)
        const lastActivity = new Date(session.last_activity_at);
        const minutesElapsed = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

        // Calculate charges and earnings for this period (different rates)
        const menCharge = minutesElapsed * session.rate_per_minute;
        const newTotalMinutes = session.total_minutes + minutesElapsed;
        const newTotalEarned = session.total_earned + menCharge;

        // Check if man is a super user by email - they don't get charged
        const isSuperUser = await checkIsSuperUser(supabase, session.man_user_id);

        // Check man's wallet balance (only for non-super users)
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance, id")
          .eq("user_id", session.man_user_id)
          .maybeSingle();
        
        if (!isSuperUser && (!wallet || wallet.balance < menCharge)) {
          // End chat due to insufficient balance - auto-disconnect
          await endChatSession(supabase, chat_id, "insufficient_balance", session);
          console.log(`[HEARTBEAT] Auto-disconnecting chat ${chat_id} due to insufficient balance. Required: ${menCharge}, Available: ${wallet?.balance || 0}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Insufficient balance - chat ended", 
              end_chat: true,
              balance_required: menCharge,
              balance_available: wallet?.balance || 0
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Super users don't get charged but women still earn
        if (isSuperUser) {
          // Just update activity and credit woman without charging man
          const womenEarnings = minutesElapsed * womenEarningRate;
          
          await supabase
            .from("women_earnings")
            .insert({
              user_id: session.woman_user_id,
              chat_session_id: session.id,
              amount: womenEarnings,
              earning_type: "chat",
              description: `Chat earnings (super user) - ${minutesElapsed.toFixed(2)} minutes at ₹${womenEarningRate}/min`
            });

          await supabase
            .from("active_chat_sessions")
            .update({
              last_activity_at: now.toISOString(),
              total_minutes: newTotalMinutes,
              total_earned: session.total_earned + womenEarnings
            })
            .eq("chat_id", chat_id);

          console.log(`[HEARTBEAT] Super user ${session.man_user_id} - no charge, women earned: ${womenEarnings.toFixed(2)}`);
          
          return new Response(
            JSON.stringify({
              success: true,
              billing_started: true,
              super_user: true,
              minutes_elapsed: minutesElapsed,
              women_earned: womenEarnings,
              message: "Super user - no charge applied"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // At this point, wallet must exist (checked above for non-super users)
        if (!wallet) {
          return new Response(
            JSON.stringify({ success: false, message: "Wallet not found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Deduct from man's wallet (what men are charged)
        const newBalance = wallet.balance - menCharge;
        await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        // Record transaction (what men paid)
        await supabase
          .from("wallet_transactions")
          .insert({
            wallet_id: wallet.id,
            user_id: session.man_user_id,
            type: "debit",
            amount: menCharge,
            description: `Chat with partner - ${minutesElapsed.toFixed(2)} minutes`,
            status: "completed"
          });

        // All women can earn from chats (both Indian and non-Indian based on mother tongue matching)
        const womenEarnings = minutesElapsed * womenEarningRate;
        
        await supabase
          .from("women_earnings")
          .insert({
            user_id: session.woman_user_id,
            chat_session_id: session.id,
            amount: womenEarnings,
            earning_type: "chat",
            description: `Chat earnings - ${minutesElapsed.toFixed(2)} minutes at ₹${womenEarningRate}/min`
          });

        // Update session
        await supabase
          .from("active_chat_sessions")
          .update({
            last_activity_at: now.toISOString(),
            total_minutes: newTotalMinutes,
            total_earned: newTotalEarned
          })
          .eq("chat_id", chat_id);

        console.log(`Heartbeat processed: ${chat_id}, men charged: ${menCharge.toFixed(2)}, women earned: ${womenEarnings.toFixed(2)}`);

        return new Response(
          JSON.stringify({
            success: true, 
            billing_started: true,
            minutes_elapsed: minutesElapsed,
            men_charged: menCharge,
            women_earned: womenEarnings,
            remaining_balance: newBalance
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "end_chat": {
        if (!chat_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing chat_id" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { data: session } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("chat_id", chat_id)
          .maybeSingle();

        if (session) {
          await endChatSession(supabase, chat_id, end_reason || "user_ended", session);
        }

        console.log(`Chat ended: ${chat_id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "transfer_chat": {
        if (!chat_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing chat_id" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Get current session
        const { data: session } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("chat_id", chat_id)
          .eq("status", "active")
          .maybeSingle();

        if (!session) {
          return new Response(
            JSON.stringify({ success: false, message: "Session not found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find new available woman (excluding current)
        const { data: availableWomen } = await supabase
          .from("women_availability")
          .select("user_id")
          .eq("is_available", true)
          .neq("user_id", session.woman_user_id)
          .lt("current_chat_count", 3)
          .order("current_chat_count", { ascending: true })
          .limit(1);

        if (!availableWomen || availableWomen.length === 0) {
          // No one else available, end chat
          await endChatSession(supabase, chat_id, "no_transfer_available", session);
          return new Response(
            JSON.stringify({ success: false, message: "No women available for transfer" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newWomanId = availableWomen[0].user_id;

        // End current session
        await endChatSession(supabase, chat_id, "transferred", session);

        // Start new session with new woman
        const newChatId = `chat_${session.man_user_id}_${newWomanId}_${Date.now()}`;
        await supabase
          .from("active_chat_sessions")
          .insert({
            chat_id: newChatId,
            man_user_id: session.man_user_id,
            woman_user_id: newWomanId,
            rate_per_minute: session.rate_per_minute,
            status: "active"
          });

        console.log(`Chat transferred: ${chat_id} -> ${newChatId}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            new_chat_id: newChatId,
            new_woman_user_id: newWomanId
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============= AUTO-RECONNECT =============
      // When woman closes/disconnects, auto-connect man to another online woman
      case "auto_reconnect": {
        const manId = man_user_id || user_id;
        const excludeIds: string[] = exclude_user_ids || [];
        
        if (!manId) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing man user ID" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        console.log(`[AUTO-RECONNECT] Man ${manId} requesting reconnection, excluding: ${excludeIds.join(", ")}`);

        // Check man's current active chat count
        const { count: currentChats } = await supabase
          .from("active_chat_sessions")
          .select("*", { count: "exact", head: true })
          .eq("man_user_id", manId)
          .eq("status", "active");

        if ((currentChats || 0) >= MAX_PARALLEL_CHATS) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Already at maximum parallel chats",
              current_chats: currentChats
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get man's language preference
        const { data: manProfile } = await supabase
          .from("profiles")
          .select("primary_language, preferred_language")
          .eq("user_id", manId)
          .maybeSingle();

        const { data: manLanguages } = await supabase
          .from("user_languages")
          .select("language_name")
          .eq("user_id", manId)
          .limit(1);

        const manLanguage = manLanguages?.[0]?.language_name || 
                           manProfile?.primary_language || 
                           manProfile?.preferred_language || 
                           "english";

        const manHasIndianLanguage = isIndianLanguage(manLanguage);

        // Get all currently connected woman IDs to exclude
        const { data: activeConnections } = await supabase
          .from("active_chat_sessions")
          .select("woman_user_id")
          .eq("man_user_id", manId)
          .eq("status", "active");

        const connectedWomanIds = activeConnections?.map((c: any) => c.woman_user_id) || [];
        const allExcludeIds = [...new Set([...excludeIds, ...connectedWomanIds])];

        // Find online women
        const { data: onlineStatuses } = await supabase
          .from("user_status")
          .select("user_id")
          .eq("is_online", true);

        const onlineUserIds = onlineStatuses?.map((s: any) => s.user_id) || [];

        // Get available women with capacity
        const { data: availableWomen } = await supabase
          .from("women_availability")
          .select("user_id, current_chat_count, max_concurrent_chats")
          .in("user_id", onlineUserIds)
          .eq("is_available", true)
          .order("current_chat_count", { ascending: true })
          .order("last_assigned_at", { ascending: true, nullsFirst: true });

        // Filter women with capacity and not excluded
        let eligibleWomen = (availableWomen || []).filter((w: any) => {
          const hasCapacity = w.current_chat_count < (w.max_concurrent_chats || 3);
          const notExcluded = !allExcludeIds.includes(w.user_id);
          return hasCapacity && notExcluded;
        });

        // Get profiles and languages for eligible women
        if (eligibleWomen.length === 0) {
          console.log(`[AUTO-RECONNECT] No women available for man ${manId}`);
          return new Response(
            JSON.stringify({ success: false, message: "No women available for reconnection" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const eligibleIds = eligibleWomen.map((w: any) => w.user_id);
        
        const { data: womenProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, primary_language, country")
          .in("user_id", eligibleIds);

        const { data: womenLanguages } = await supabase
          .from("user_languages")
          .select("user_id, language_name")
          .in("user_id", eligibleIds);

        const languageMap = new Map<string, string>();
        (womenLanguages || []).forEach((l: any) => {
          if (!languageMap.has(l.user_id)) {
            languageMap.set(l.user_id, l.language_name);
          }
        });

        // Apply language matching rules
        let matchedWomen: any[] = [];
        
        for (const woman of eligibleWomen) {
          const profile = womenProfiles?.find((p: any) => p.user_id === woman.user_id);
          const womanLanguage = languageMap.get(woman.user_id) || profile?.primary_language || "english";
          const womanHasIndianLanguage = isIndianLanguage(womanLanguage);

          // Non-Indian men can ONLY see Indian women
          if (!manHasIndianLanguage && !womanHasIndianLanguage) {
            continue;
          }

          matchedWomen.push({
            ...woman,
            profile,
            language: womanLanguage,
            isSameLanguage: womanLanguage.toLowerCase() === manLanguage.toLowerCase()
          });
        }

        if (matchedWomen.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No matching women available" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Sort: same language first, then by load
        matchedWomen.sort((a, b) => {
          if (a.isSameLanguage !== b.isSameLanguage) return a.isSameLanguage ? -1 : 1;
          return a.current_chat_count - b.current_chat_count;
        });

        const selectedWoman = matchedWomen[0];

        console.log(`[AUTO-RECONNECT] Selected woman ${selectedWoman.user_id} for man ${manId}, load: ${selectedWoman.current_chat_count}`);

        return new Response(
          JSON.stringify({
            success: true,
            woman_user_id: selectedWoman.user_id,
            profile: selectedWoman.profile,
            same_language: selectedWoman.isSameLanguage,
            current_load: selectedWoman.current_chat_count,
            available_count: matchedWomen.length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============= GET ACTIVE CHATS =============
      // Get all active chat sessions for a user
      case "get_active_chats": {
        const targetUserId = user_id || man_user_id || woman_user_id;
        
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user ID" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Get chats where user is man
        const { data: manChats } = await supabase
          .from("active_chat_sessions")
          .select(`
            *,
            woman_profile:profiles!active_chat_sessions_woman_user_id_fkey(user_id, full_name, photo_url)
          `)
          .eq("man_user_id", targetUserId)
          .eq("status", "active");

        // Get chats where user is woman
        const { data: womanChats } = await supabase
          .from("active_chat_sessions")
          .select(`
            *,
            man_profile:profiles!active_chat_sessions_man_user_id_fkey(user_id, full_name, photo_url)
          `)
          .eq("woman_user_id", targetUserId)
          .eq("status", "active");

        const allChats = [
          ...(manChats || []).map((c: any) => ({ ...c, role: "man", partner: c.woman_profile })),
          ...(womanChats || []).map((c: any) => ({ ...c, role: "woman", partner: c.man_profile }))
        ];

        return new Response(
          JSON.stringify({
            success: true,
            active_chats: allChats,
            count: allChats.length,
            max_allowed: MAX_PARALLEL_CHATS,
            can_add_more: allChats.length < MAX_PARALLEL_CHATS
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============= GET CURRENT SETTINGS =============
      // Returns current configurable settings for frontend use
      case "get_settings": {
        return new Response(
          JSON.stringify({
            success: true,
            settings: {
              chat_inactivity_timeout_seconds: CHAT_INACTIVITY_TIMEOUT_SECONDS,
              user_idle_timeout_seconds: USER_IDLE_TIMEOUT_SECONDS,
              max_parallel_chats: MAX_PARALLEL_CHATS,
              reconnect_attempts: RECONNECT_ATTEMPTS,
              heartbeat_interval_seconds: HEARTBEAT_INTERVAL_SECONDS,
              priority_wait_threshold_seconds: PRIORITY_WAIT_THRESHOLD_SECONDS
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, message: "Invalid action" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Chat manager error:", error);
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function endChatSession(supabase: any, chatId: string, reason: string, session: any) {
  // Update session status
  await supabase
    .from("active_chat_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      end_reason: reason
    })
    .eq("chat_id", chatId);

  // Sync woman's availability with ACTUAL active session count (not just decrement)
  const { count: actualActiveCount } = await supabase
    .from("active_chat_sessions")
    .select("*", { count: "exact", head: true })
    .eq("woman_user_id", session.woman_user_id)
    .eq("status", "active");

  const newChatCount = actualActiveCount || 0;

  // Update women_availability with accurate count
  await supabase
    .from("women_availability")
    .update({
      current_chat_count: newChatCount,
      is_available: newChatCount < 3
    })
    .eq("user_id", session.woman_user_id);

  // Update user_status to reflect correct status based on actual chat count
  let newStatusText = "online";
  if (newChatCount >= 3) {
    newStatusText = "busy";
  }

  await supabase
    .from("user_status")
    .update({
      status_text: newStatusText,
      last_seen: new Date().toISOString()
    })
    .eq("user_id", session.woman_user_id);

  // Also update man's status
  const { count: manActiveCount } = await supabase
    .from("active_chat_sessions")
    .select("*", { count: "exact", head: true })
    .eq("man_user_id", session.man_user_id)
    .eq("status", "active");

  let manStatusText = "online";
  if ((manActiveCount || 0) >= 3) {
    manStatusText = "busy";
  }

  await supabase
    .from("user_status")
    .update({
      status_text: manStatusText,
      last_seen: new Date().toISOString()
    })
    .eq("user_id", session.man_user_id);
}

// Sync function to fix stale status data - call periodically or on disconnect
async function syncUserStatus(supabase: any, userId: string) {
  // Get actual active chat count
  const { count: manChats } = await supabase
    .from("active_chat_sessions")
    .select("*", { count: "exact", head: true })
    .eq("man_user_id", userId)
    .eq("status", "active");

  const { count: womanChats } = await supabase
    .from("active_chat_sessions")
    .select("*", { count: "exact", head: true })
    .eq("woman_user_id", userId)
    .eq("status", "active");

  const totalChats = (manChats || 0) + (womanChats || 0);
  
  // Determine correct status
  let statusText = "online";
  if (totalChats >= 3) {
    statusText = "busy";
  }

  // Update user_status
  await supabase
    .from("user_status")
    .update({
      status_text: statusText,
      last_seen: new Date().toISOString()
    })
    .eq("user_id", userId);

  // Update women_availability if applicable
  await supabase
    .from("women_availability")
    .update({
      current_chat_count: womanChats || 0,
      is_available: (womanChats || 0) < 3
    })
    .eq("user_id", userId);

  return { totalChats, statusText };
}