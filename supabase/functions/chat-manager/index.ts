import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRIORITY_WAIT_THRESHOLD_SECONDS = 180; // 3 minutes

interface ChatRequest {
  action: "start_chat" | "end_chat" | "heartbeat" | "transfer_chat" | "get_available_woman" | "join_queue" | "leave_queue" | "check_queue_status";
  man_user_id?: string;
  woman_user_id?: string;
  chat_id?: string;
  end_reason?: string;
  preferred_language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, man_user_id, woman_user_id, chat_id, end_reason, preferred_language }: ChatRequest = await req.json();

    console.log(`Chat manager action: ${action}`, { man_user_id, woman_user_id, chat_id, preferred_language });

    switch (action) {
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

      case "start_chat": {
        if (!man_user_id || !woman_user_id) {
          return new Response(
            JSON.stringify({ success: false, message: "Missing user IDs" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
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
          .select("rate_per_minute")
          .eq("is_active", true)
          .maybeSingle();

        const ratePerMinute = pricing?.rate_per_minute || 4.00;

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

        // Calculate time elapsed since last activity
        const lastActivity = new Date(session.last_activity_at);
        const now = new Date();
        const minutesElapsed = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

        // Calculate earnings for this period
        const earnings = minutesElapsed * session.rate_per_minute;
        const newTotalMinutes = session.total_minutes + minutesElapsed;
        const newTotalEarned = session.total_earned + earnings;

        // Check man's wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance, id")
          .eq("user_id", session.man_user_id)
          .maybeSingle();

        if (!wallet || wallet.balance < earnings) {
          // End chat due to insufficient balance
          await endChatSession(supabase, chat_id, "insufficient_balance", session);
          return new Response(
            JSON.stringify({ success: false, message: "Insufficient balance", end_chat: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Deduct from man's wallet
        await supabase
          .from("wallets")
          .update({ balance: wallet.balance - earnings })
          .eq("id", wallet.id);

        // Record transaction
        await supabase
          .from("wallet_transactions")
          .insert({
            wallet_id: wallet.id,
            user_id: session.man_user_id,
            type: "debit",
            amount: earnings,
            description: `Chat with partner - ${minutesElapsed.toFixed(2)} minutes`,
            status: "completed"
          });

        // Add earnings to woman
        await supabase
          .from("women_earnings")
          .insert({
            user_id: session.woman_user_id,
            chat_session_id: session.id,
            amount: earnings,
            earning_type: "chat",
            description: `Chat earnings - ${minutesElapsed.toFixed(2)} minutes`
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

        console.log(`Heartbeat processed: ${chat_id}, earnings: ${earnings.toFixed(2)}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            minutes_elapsed: minutesElapsed,
            earnings,
            remaining_balance: wallet.balance - earnings
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