import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Monthly Earning Rotation Edge Function
 * 
 * Runs on the 1st of each month to:
 * 1. Demote paid Indian women with <10% of top earner's chat time
 * 2. Promote top free Indian women by chat time (based on admin limits)
 * 
 * IMPORTANT: This rotation only starts 3 months after system activation.
 * Only applies to Indian languages and Indian women.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting Monthly Earning Rotation...");

    // Check if rotation is enabled (starts 3 months after activation)
    const { data: rotationSetting } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "earning_rotation_start_date")
      .single();

    const now = new Date();
    
    // If no start date is set, set it to 3 months from now
    if (!rotationSetting) {
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() + 3);
      startDate.setDate(1); // First day of the month
      startDate.setHours(0, 0, 0, 0);
      
      await supabase.from("app_settings").upsert({
        setting_key: "earning_rotation_start_date",
        setting_value: JSON.stringify(startDate.toISOString()),
        setting_type: "date",
        category: "earning",
        description: "Date when monthly earning rotation begins (3 months after first activation)",
        is_public: false,
      }, { onConflict: "setting_key" });

      console.log(`Rotation start date set to: ${startDate.toISOString()}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Monthly rotation will begin on ${startDate.toISOString().split('T')[0]}. Current month skipped.`,
          rotationStartDate: startDate.toISOString(),
          skipped: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we've reached the rotation start date
    const rotationStartDate = new Date(JSON.parse(rotationSetting.setting_value));
    
    if (now < rotationStartDate) {
      const monthsRemaining = Math.ceil((rotationStartDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000));
      console.log(`Rotation not yet active. Starts on: ${rotationStartDate.toISOString()}. ${monthsRemaining} months remaining.`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Rotation starts on ${rotationStartDate.toISOString().split('T')[0]}. ${monthsRemaining} month(s) remaining.`,
          rotationStartDate: rotationStartDate.toISOString(),
          skipped: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Rotation is active. Processing monthly rotation...");

    // Get first day of previous month for calculations
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    
    console.log(`Processing month: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);

    const results = {
      demoted: 0,
      promoted: 0,
      languagesProcessed: 0,
      errors: [] as string[],
    };

    // Get all active language limits
    const { data: languageLimits, error: llError } = await supabase
      .from("language_limits")
      .select("*")
      .eq("is_active", true);

    if (llError) {
      throw new Error(`Failed to fetch language limits: ${llError.message}`);
    }

    // Helper function to get monthly chat minutes for a user
    async function getMonthlyMinutes(userId: string): Promise<number> {
      const { data, error } = await supabase
        .from("active_chat_sessions")
        .select("total_minutes")
        .eq("woman_user_id", userId)
        .gte("started_at", monthStart.toISOString())
        .lt("started_at", monthEnd.toISOString());

      if (error) {
        console.error(`Error getting minutes for ${userId}:`, error);
        return 0;
      }

      return data?.reduce((sum, s) => sum + (Number(s.total_minutes) || 0), 0) || 0;
    }

    // Helper function to get last 2 months chat minutes for inactivity check
    async function getLastTwoMonthsMinutes(userId: string): Promise<number> {
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      
      const { data, error } = await supabase
        .from("active_chat_sessions")
        .select("total_minutes")
        .eq("woman_user_id", userId)
        .gte("started_at", twoMonthsAgo.toISOString())
        .lt("started_at", monthEnd.toISOString());

      if (error) {
        console.error(`Error getting 2-month minutes for ${userId}:`, error);
        return 0;
      }

      return data?.reduce((sum, s) => sum + (Number(s.total_minutes) || 0), 0) || 0;
    }

    // Process each language
    for (const langLimit of languageLimits || []) {
      console.log(`\nProcessing language: ${langLimit.language_name}`);
      
      // Step 1: Get all paid Indian women for this language with their monthly minutes
      const { data: paidWomen, error: pwError } = await supabase
        .from("female_profiles")
        .select("id, user_id, full_name, primary_language")
        .eq("is_earning_eligible", true)
        .eq("country", "India")
        .ilike("primary_language", langLimit.language_name);

      if (pwError) {
        console.error(`Error fetching paid women for ${langLimit.language_name}:`, pwError);
        results.errors.push(`Paid women error: ${pwError.message}`);
        continue;
      }

      // Calculate monthly minutes for each paid woman
      const paidWithMinutes = await Promise.all(
        (paidWomen || []).map(async (w) => ({
          ...w,
          monthlyMinutes: await getMonthlyMinutes(w.user_id),
          lastTwoMonthsMinutes: await getLastTwoMonthsMinutes(w.user_id),
        }))
      );

      // Find top earner's minutes
      const topEarnerMinutes = Math.max(...paidWithMinutes.map(w => w.monthlyMinutes), 1);
      const thresholdMinutes = topEarnerMinutes * 0.10;
      
      console.log(`Top earner: ${topEarnerMinutes} mins, threshold (10%): ${thresholdMinutes} mins`);

      // Step 2: Demote women who:
      // - Have less than 10% of top earner's chat time, OR
      // - Have been inactive (0 minutes) for last 2 months
      for (const woman of paidWithMinutes) {
        const isLowPerformer = woman.monthlyMinutes < thresholdMinutes;
        const isInactive = woman.lastTwoMonthsMinutes === 0;
        
        if (isLowPerformer || isInactive) {
          const reason = isInactive 
            ? `Inactive for 2 months (0 mins)` 
            : `Low performance: ${woman.monthlyMinutes} mins < ${thresholdMinutes.toFixed(1)} threshold`;
          
          console.log(`Demoting ${woman.full_name}: ${reason}`);
          
          await supabase
            .from("female_profiles")
            .update({
              is_earning_eligible: false,
              earning_slot_assigned_at: null,
              earning_badge_type: null,
              monthly_chat_minutes: woman.monthlyMinutes,
              last_rotation_date: new Date().toISOString().split("T")[0],
              updated_at: new Date().toISOString(),
            })
            .eq("id", woman.id);

          await supabase
            .from("profiles")
            .update({
              is_earning_eligible: false,
              earning_slot_assigned_at: null,
              earning_badge_type: null,
              monthly_chat_minutes: woman.monthlyMinutes,
              last_rotation_date: new Date().toISOString().split("T")[0],
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", woman.user_id);

          results.demoted++;
        }
      }

      // Step 3: Count current earning women after demotions
      const { count: currentCount } = await supabase
        .from("female_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_earning_eligible", true)
        .eq("country", "India")
        .ilike("primary_language", langLimit.language_name);

      const slotsAvailable = langLimit.max_earning_women - (currentCount || 0);
      const maxPromotions = Math.min(5, slotsAvailable, langLimit.max_monthly_promotions || 10);
      
      console.log(`Slots available: ${slotsAvailable}, max promotions: ${maxPromotions}`);

      if (maxPromotions <= 0) {
        console.log(`No slots available for promotions in ${langLimit.language_name}`);
        results.languagesProcessed++;
        continue;
      }

      // Step 4: Get top free Indian women by chat time
      const { data: freeWomen, error: fwError } = await supabase
        .from("female_profiles")
        .select("id, user_id, full_name, primary_language")
        .eq("is_earning_eligible", false)
        .eq("country", "India")
        .eq("approval_status", "approved")
        .eq("account_status", "active")
        .ilike("primary_language", langLimit.language_name);

      if (fwError) {
        console.error(`Error fetching free women for ${langLimit.language_name}:`, fwError);
        results.errors.push(`Free women error: ${fwError.message}`);
        continue;
      }

      // Calculate monthly minutes for each free woman
      const freeWithMinutes = await Promise.all(
        (freeWomen || []).map(async (w) => ({
          ...w,
          monthlyMinutes: await getMonthlyMinutes(w.user_id),
        }))
      );

      // Sort by minutes descending and take top performers
      const topFreeWomen = freeWithMinutes
        .filter(w => w.monthlyMinutes > 0)
        .sort((a, b) => b.monthlyMinutes - a.monthlyMinutes)
        .slice(0, maxPromotions);

      // Step 5: Promote top free women
      for (const woman of topFreeWomen) {
        console.log(`Promoting ${woman.full_name}: ${woman.monthlyMinutes} mins`);
        
        await supabase
          .from("female_profiles")
          .update({
            is_earning_eligible: true,
            earning_slot_assigned_at: new Date().toISOString(),
            earning_badge_type: "star",
            monthly_chat_minutes: woman.monthlyMinutes,
            last_rotation_date: new Date().toISOString().split("T")[0],
            promoted_from_free: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", woman.id);

        await supabase
          .from("profiles")
          .update({
            is_earning_eligible: true,
            earning_slot_assigned_at: new Date().toISOString(),
            earning_badge_type: "star",
            monthly_chat_minutes: woman.monthlyMinutes,
            last_rotation_date: new Date().toISOString().split("T")[0],
            promoted_from_free: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", woman.user_id);

        results.promoted++;
      }

      // Update language limit count
      const { count: finalCount } = await supabase
        .from("female_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_earning_eligible", true)
        .eq("country", "India")
        .ilike("primary_language", langLimit.language_name);

      await supabase
        .from("language_limits")
        .update({
          current_earning_women: finalCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", langLimit.id);

      results.languagesProcessed++;
    }

    console.log("\nMonthly rotation completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Monthly earning rotation completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Monthly rotation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
