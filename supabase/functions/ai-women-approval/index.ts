import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  gender: string | null;
  primary_language: string | null;
  approval_status: string;
  account_status: string;
  performance_score: number;
  last_active_at: string | null;
  total_chats_count: number;
  avg_response_time_seconds: number;
  ai_approved: boolean;
  created_at: string;
}

interface LanguageGroup {
  id: string;
  name: string;
  languages: string[];
  max_women_users: number;
  current_women_count: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting AI Women Approval Process...");

    // Get all language groups
    const { data: languageGroups, error: lgError } = await supabase
      .from("language_groups")
      .select("*")
      .eq("is_active", true);

    if (lgError) throw lgError;

    const results = {
      approved: 0,
      disapproved: 0,
      retained: 0,
      rotatedOut: 0,
      errors: [] as string[],
    };

    for (const group of (languageGroups || []) as LanguageGroup[]) {
      console.log(`Processing language group: ${group.name}`);

      // Get current approved women count for this language group
      const { data: approvedWomen, error: awError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, primary_language, performance_score, last_active_at, total_chats_count, avg_response_time_seconds, ai_approved, approval_status, account_status, gender, created_at")
        .eq("gender", "female")
        .eq("approval_status", "approved")
        .eq("account_status", "active")
        .in("primary_language", group.languages);

      if (awError) {
        results.errors.push(`Error fetching approved women for ${group.name}: ${awError.message}`);
        continue;
      }

      const currentCount = (approvedWomen || []).length;

      // Update language group current count
      await supabase
        .from("language_groups")
        .update({ current_women_count: currentCount })
        .eq("id", group.id);

      // Step 1: Check for women who have been offline for more than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const woman of (approvedWomen || []) as Profile[]) {
        const lastActive = woman.last_active_at ? new Date(woman.last_active_at) : null;
        
        // Disapprove if offline for more than 30 days
        if (lastActive && lastActive < thirtyDaysAgo) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              approval_status: "disapproved",
              ai_approved: false,
              ai_disapproval_reason: "Inactive for more than 30 days",
              updated_at: new Date().toISOString(),
            })
            .eq("id", woman.id);

          if (!updateError) {
            results.rotatedOut++;
            console.log(`Rotated out ${woman.full_name} - inactive for 30+ days`);
          }
          continue;
        }

        // Step 2: Check performance score - disapprove if score is below 30
        if (woman.performance_score < 30) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              approval_status: "disapproved",
              ai_approved: false,
              ai_disapproval_reason: `Poor performance score: ${woman.performance_score}/100`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", woman.id);

          if (!updateError) {
            results.disapproved++;
            console.log(`Disapproved ${woman.full_name} - poor performance: ${woman.performance_score}`);
          }
          continue;
        }

        // Step 3: Check response time - disapprove if avg response time > 5 minutes (300 seconds)
        if (woman.avg_response_time_seconds > 300 && woman.total_chats_count > 10) {
          // Calculate new performance score
          const newScore = Math.max(0, woman.performance_score - 10);
          
          await supabase
            .from("profiles")
            .update({
              performance_score: newScore,
              updated_at: new Date().toISOString(),
            })
            .eq("id", woman.id);

          if (newScore < 30) {
            await supabase
              .from("profiles")
              .update({
                approval_status: "disapproved",
                ai_approved: false,
                ai_disapproval_reason: "Slow response times leading to poor performance",
                updated_at: new Date().toISOString(),
              })
              .eq("id", woman.id);

            results.disapproved++;
            console.log(`Disapproved ${woman.full_name} - slow responses`);
          }
          continue;
        }

        // Retain active, performing women
        results.retained++;
      }

      // Step 4: Auto-approve pending women if slots available
      const updatedCount = currentCount - results.rotatedOut - results.disapproved;
      const availableSlots = group.max_women_users - updatedCount;

      if (availableSlots > 0) {
        // Get pending women for this language group
        const { data: pendingWomen, error: pwError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, primary_language, created_at")
          .eq("gender", "female")
          .eq("approval_status", "pending")
          .eq("account_status", "active")
          .in("primary_language", group.languages)
          .order("created_at", { ascending: true })
          .limit(availableSlots);

        if (pwError) {
          results.errors.push(`Error fetching pending women for ${group.name}: ${pwError.message}`);
          continue;
        }

        // Auto-approve pending women
        for (const woman of (pendingWomen || [])) {
          const { error: approveError } = await supabase
            .from("profiles")
            .update({
              approval_status: "approved",
              ai_approved: true,
              ai_disapproval_reason: null,
              performance_score: 100, // Start with perfect score
              updated_at: new Date().toISOString(),
            })
            .eq("id", woman.id);

          if (!approveError) {
            results.approved++;
            console.log(`AI approved ${woman.full_name} for language group ${group.name}`);
          }
        }
      }

      // Update final count
      const { data: finalCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("gender", "female")
        .eq("approval_status", "approved")
        .eq("account_status", "active")
        .in("primary_language", group.languages);

      await supabase
        .from("language_groups")
        .update({ 
          current_women_count: finalCount?.length || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", group.id);
    }

    // Step 5: Update performance scores based on recent chat activity
    await updatePerformanceScores(supabase);

    console.log("AI Women Approval Process completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "AI Women Approval process completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("AI Women Approval error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updatePerformanceScores(supabase: any) {
  try {
    // Get all active approved women
    const { data: women } = await supabase
      .from("profiles")
      .select("id, user_id, performance_score, total_chats_count")
      .eq("gender", "female")
      .eq("approval_status", "approved")
      .eq("account_status", "active");

    if (!women) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const woman of women) {
      // Get recent chat sessions
      const { data: recentChats } = await supabase
        .from("active_chat_sessions")
        .select("id, total_minutes, total_earned, status")
        .eq("woman_user_id", woman.user_id)
        .gte("created_at", sevenDaysAgo.toISOString());

      // Get recent messages sent by this woman
      const { data: recentMessages } = await supabase
        .from("chat_messages")
        .select("id, created_at")
        .eq("sender_id", woman.user_id)
        .gte("created_at", sevenDaysAgo.toISOString());

      // Calculate performance metrics
      const chatCount = recentChats?.length || 0;
      const messageCount = recentMessages?.length || 0;
      const totalMinutes = recentChats?.reduce((sum: number, c: any) => sum + (c.total_minutes || 0), 0) || 0;

      // Performance formula:
      // Base: 50 points
      // +1 point per chat (max 20)
      // +0.5 points per 10 messages (max 15)
      // +1 point per 10 minutes active (max 15)
      let newScore = 50;
      newScore += Math.min(chatCount, 20);
      newScore += Math.min(messageCount / 20, 15);
      newScore += Math.min(totalMinutes / 10, 15);
      newScore = Math.round(Math.min(100, Math.max(0, newScore)));

      // Update if score changed significantly
      if (Math.abs(newScore - woman.performance_score) > 5) {
        await supabase
          .from("profiles")
          .update({ 
            performance_score: newScore,
            total_chats_count: (woman.total_chats_count || 0) + chatCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", woman.id);
      }
    }
  } catch (error) {
    console.error("Error updating performance scores:", error);
  }
}
