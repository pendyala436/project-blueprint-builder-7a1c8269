import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SHIFT_HOURS = 9;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, timezone, action, loginTime } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const now = new Date();

    // Get suggested shift times based on login time
    if (action === "get_suggested_shift") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use provided login time or current time
      const startTime = loginTime ? new Date(loginTime) : now;
      const endTime = new Date(startTime.getTime() + DEFAULT_SHIFT_HOURS * 60 * 60 * 1000);

      return new Response(
        JSON.stringify({
          success: true,
          suggestedShift: {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            durationHours: DEFAULT_SHIFT_HOURS,
            timezone: userTimezone,
            message: `AI suggests a ${DEFAULT_SHIFT_HOURS}-hour shift. You can work more or less as needed.`
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's active shift status
    if (action === "get_shift_status") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: activeShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (activeShift) {
        const startTime = new Date(activeShift.start_time);
        const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
        const targetMinutes = DEFAULT_SHIFT_HOURS * 60;
        const progress = Math.min((elapsedMinutes / targetMinutes) * 100, 100);

        let status = "in_progress";
        if (elapsedMinutes >= targetMinutes) status = "target_reached";
        if (elapsedMinutes >= targetMinutes * 1.5) status = "extended";

        return new Response(
          JSON.stringify({
            success: true,
            hasActiveShift: true,
            shift: activeShift,
            elapsedMinutes,
            targetMinutes,
            progress,
            status,
            suggestedEndTime: new Date(startTime.getTime() + DEFAULT_SHIFT_HOURS * 60 * 60 * 1000).toISOString()
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          hasActiveShift: false,
          suggestedDurationHours: DEFAULT_SHIFT_HOURS
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-assign shift for new women users (simplified)
    if (action === "auto_assign_shift") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already assigned
      const { data: existingAssignment } = await supabase
        .from("women_shift_assignments")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingAssignment) {
        return new Response(
          JSON.stringify({ success: true, message: "Already assigned", assignment: existingAssignment }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's language from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_language, primary_language")
        .eq("user_id", userId)
        .maybeSingle();

      const userLanguage = profile?.primary_language || profile?.preferred_language || "English";

      // Find matching language group
      const { data: languageGroups } = await supabase
        .from("language_groups")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      let matchedLanguageGroup = null;
      for (const group of languageGroups || []) {
        if (group.languages.some((lang: string) => 
          lang.toLowerCase().includes(userLanguage.toLowerCase()) ||
          userLanguage.toLowerCase().includes(lang.toLowerCase())
        )) {
          matchedLanguageGroup = group;
          break;
        }
      }

      // Create flexible assignment (no fixed shift template - user decides when to work)
      const { data: assignment, error: assignError } = await supabase
        .from("women_shift_assignments")
        .insert({
          user_id: userId,
          shift_template_id: null, // Flexible - no fixed template
          language_group_id: matchedLanguageGroup?.id || null,
          week_off_days: [], // No fixed off days
          is_active: true
        })
        .select()
        .single();

      if (assignError) throw assignError;

      console.log(`Auto-assigned flexible shift to user ${userId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          assignment,
          message: `Flexible ${DEFAULT_SHIFT_HOURS}-hour shifts enabled. Start and end whenever you want!`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark attendance based on actual shift activity
    if (action === "mark_attendance") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const today = now.toISOString().split("T")[0];

      // Get today's actual shift
      const { data: actualShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .gte("start_time", `${today}T00:00:00`)
        .lte("start_time", `${today}T23:59:59`)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check if attendance already exists
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("attendance_date", today)
        .maybeSingle();

      if (existingAttendance) {
        // Update if shift ended
        if (actualShift && actualShift.end_time && !existingAttendance.check_out_time) {
          await supabase
            .from("attendance")
            .update({
              check_out_time: actualShift.end_time,
              shift_id: actualShift.id,
              status: "present"
            })
            .eq("id", existingAttendance.id);
        }
      } else if (actualShift) {
        // Create new attendance record
        await supabase
          .from("attendance")
          .insert({
            user_id: userId,
            shift_id: actualShift.id,
            attendance_date: today,
            check_in_time: actualShift.start_time,
            check_out_time: actualShift.end_time || null,
            status: "present",
            auto_marked: true
          });
      }

      console.log(`Attendance marked for user ${userId} on ${today}`);

      return new Response(
        JSON.stringify({ success: true, message: "Attendance updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Shift scheduler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
