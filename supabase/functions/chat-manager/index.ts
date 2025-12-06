import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRIORITY_WAIT_THRESHOLD_SECONDS = 180; // 3 minutes

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

const INACTIVITY_TIMEOUT_SECONDS = 180; // 3 minutes inactivity timeout

interface ChatRequest {
  action: "start_chat" | "end_chat" | "heartbeat" | "transfer_chat" | "get_available_woman" | "get_available_indian_woman" | "join_queue" | "leave_queue" | "check_queue_status" | "update_status" | "check_inactivity";
  man_user_id?: string;
  woman_user_id?: string;
  user_id?: string;
  chat_id?: string;
  end_reason?: string;
  preferred_language?: string;
  man_country?: string; // Country of the man for NLLB matching
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, man_user_id, woman_user_id, user_id, chat_id, end_reason, preferred_language, man_country }: ChatRequest = await req.json();

    console.log(`Chat manager action: ${action}`, { man_user_id, woman_user_id, user_id, chat_id, preferred_language, man_country });

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
        const thresholdTime = new Date(now.getTime() - INACTIVITY_TIMEOUT_SECONDS * 1000);

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

      case "get_available_woman": {
        const requestedLanguage = preferred_language || "en";

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

        // First try to find a woman with matching language group
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
            .eq("women_shift_assignments.language_group_id", matchingGroupId)
            .order("current_chat_count", { ascending: true })
            .order("last_assigned_at", { ascending: true, nullsFirst: true })
            .limit(1);
          
          if (data && data.length > 0) {
            availableWomen = data;
          }
        }

        // If no language match, find any available woman
        if (availableWomen.length === 0) {
          const { data, error } = await supabase
            .from("women_availability")
            .select("user_id, current_chat_count")
            .eq("is_available", true)
            .lt("current_chat_count", 3)
            .order("current_chat_count", { ascending: true })
            .order("last_assigned_at", { ascending: true, nullsFirst: true })
            .limit(1);

          if (error) throw error;
          availableWomen = data || [];
        }

        if (availableWomen.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No women available" }),
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

      // Match men from NLLB-200 countries with available Indian women
      case "get_available_indian_woman": {
        const requestedLanguage = preferred_language || "en";
        const manCountryLower = (man_country || "").toLowerCase().trim();

        // Verify man is from an NLLB-200 supported country
        const isNLLB200Country = NLLB200_COUNTRIES.some(c => 
          manCountryLower.includes(c) || c.includes(manCountryLower)
        );

        if (!isNLLB200Country && manCountryLower) {
          console.log(`Man's country ${man_country} is not in NLLB-200 list`);
          return new Response(
            JSON.stringify({ success: false, message: "Country not supported for NLLB translation" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find Indian women who are:
        // 1. Available (is_available = true)
        // 2. Online (check user_status)
        // 3. Have capacity (current_chat_count < max_concurrent_chats)
        // 4. From India
        // Order by load (lowest chat count first) and last assigned (round-robin)

        // Get online Indian women with availability
        const { data: onlineIndianWomen } = await supabase
          .from("profiles")
          .select("user_id")
          .or("gender.eq.female,gender.eq.Female")
          .eq("country", "India");

        if (!onlineIndianWomen || onlineIndianWomen.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No Indian women available" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const indianWomanIds = onlineIndianWomen.map(w => w.user_id);

        // Check which ones are online
        const { data: onlineStatuses } = await supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", indianWomanIds)
          .eq("is_online", true);

        const onlineWomanIds = onlineStatuses?.map(s => s.user_id) || [];

        if (onlineWomanIds.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "No Indian women online" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get availability for online women, ordered by load
        const { data: availableWomen } = await supabase
          .from("women_availability")
          .select("user_id, current_chat_count, max_concurrent_chats")
          .in("user_id", onlineWomanIds)
          .eq("is_available", true)
          .order("current_chat_count", { ascending: true })
          .order("last_assigned_at", { ascending: true, nullsFirst: true });

        // Filter by capacity
        const womenWithCapacity = availableWomen?.filter(w => 
          w.current_chat_count < (w.max_concurrent_chats || 3)
        ) || [];

        if (womenWithCapacity.length === 0) {
          return new Response(
            JSON.stringify({ success: false, message: "All Indian women are at capacity" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Select woman with lowest load (first in sorted list)
        const selectedWoman = womenWithCapacity[0];

        // Get woman's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, photo_url, primary_language, preferred_language")
          .eq("user_id", selectedWoman.user_id)
          .single();

        console.log(`Matched international man (${man_country}) with Indian woman ${selectedWoman.user_id}, load: ${selectedWoman.current_chat_count}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            woman_user_id: selectedWoman.user_id,
            profile,
            current_load: selectedWoman.current_chat_count,
            nllb_translation_enabled: true,
            man_country: man_country,
            woman_country: "India"
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

        // Check man's wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", man_user_id)
          .maybeSingle();

        if (!wallet || wallet.balance <= 0) {
          return new Response(
            JSON.stringify({ success: false, message: "Insufficient balance" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current pricing
        const { data: pricing } = await supabase
          .from("chat_pricing")
          .select("rate_per_minute, women_earning_rate")
          .eq("is_active", true)
          .maybeSingle();

        const ratePerMinute = pricing?.rate_per_minute || 5.00;
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

        // Get session
        const { data: session } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("chat_id", chat_id)
          .eq("status", "active")
          .maybeSingle();

        if (!session) {
          return new Response(
            JSON.stringify({ success: false, message: "Session not found or inactive" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current pricing for women's earning rate
        const { data: pricing } = await supabase
          .from("chat_pricing")
          .select("women_earning_rate")
          .eq("is_active", true)
          .maybeSingle();

        const womenEarningRate = pricing?.women_earning_rate || 2.00;

        // Calculate time elapsed since last activity
        const lastActivity = new Date(session.last_activity_at);
        const now = new Date();
        const minutesElapsed = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

        // Calculate charges and earnings for this period (different rates)
        const menCharge = minutesElapsed * session.rate_per_minute;
        const newTotalMinutes = session.total_minutes + minutesElapsed;
        const newTotalEarned = session.total_earned + menCharge;

        // Check man's wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance, id")
          .eq("user_id", session.man_user_id)
          .maybeSingle();

        if (!wallet || wallet.balance < menCharge) {
          // End chat due to insufficient balance
          await endChatSession(supabase, chat_id, "insufficient_balance", session);
          return new Response(
            JSON.stringify({ success: false, message: "Insufficient balance", end_chat: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Deduct from man's wallet (what men are charged)
        await supabase
          .from("wallets")
          .update({ balance: wallet.balance - menCharge })
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
            minutes_elapsed: minutesElapsed,
            men_charged: menCharge,
            women_earned: womenEarnings,
            remaining_balance: wallet.balance - menCharge
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

  // Decrease woman's chat count
  const { data: availability } = await supabase
    .from("women_availability")
    .select("current_chat_count")
    .eq("user_id", session.woman_user_id)
    .maybeSingle();

  if (availability) {
    await supabase
      .from("women_availability")
      .update({
        current_chat_count: Math.max(0, availability.current_chat_count - 1)
      })
      .eq("user_id", session.woman_user_id);
  }
}