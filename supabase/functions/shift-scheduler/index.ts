import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SHIFT_HOURS = 9;
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, timezone, action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userTimezone = timezone || "UTC";
    const now = new Date();

    // Generate AI schedule with week offs for load balancing
    if (action === "generate_ai_schedule") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Generating AI schedule for user ${userId}`);

      // Get or create assignment with AI-determined week off
      let { data: assignment } = await supabase
        .from("women_shift_assignments")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!assignment) {
        // Count total women for load balancing week offs
        const { count: totalWomen } = await supabase
          .from("women_shift_assignments")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        // Distribute week offs evenly across days for load balancing
        // Each woman gets 1 day off, rotated to balance load
        const weekOffDay = (totalWomen || 0) % 7;

        // Get user's language for group assignment
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
          .order("current_women_count", { ascending: true }); // Load balance by least busy group

        let matchedGroup = null;
        for (const group of languageGroups || []) {
          if (group.languages.some((lang: string) => 
            lang.toLowerCase().includes(userLanguage.toLowerCase()) ||
            userLanguage.toLowerCase().includes(lang.toLowerCase())
          )) {
            matchedGroup = group;
            break;
          }
        }

        // Create assignment
        const { data: newAssignment, error: assignError } = await supabase
          .from("women_shift_assignments")
          .insert({
            user_id: userId,
            week_off_days: [weekOffDay],
            language_group_id: matchedGroup?.id || null,
            is_active: true
          })
          .select()
          .single();

        if (assignError) throw assignError;
        assignment = newAssignment;

        // Update language group count
        if (matchedGroup) {
          await supabase
            .from("language_groups")
            .update({ current_women_count: (matchedGroup.current_women_count || 0) + 1 })
            .eq("id", matchedGroup.id);
        }

        console.log(`Created new assignment for user ${userId} with week off on ${DAYS_OF_WEEK[weekOffDay]}`);
      }

      const weekOffDays = assignment.week_off_days || [0];
      const scheduledShifts = [];

      // Generate schedule for next 7 days
      for (let i = 1; i <= 7; i++) {
        const scheduleDate = new Date(now);
        scheduleDate.setDate(scheduleDate.getDate() + i);
        const dayOfWeek = scheduleDate.getDay();
        
        // Skip week off days
        if (weekOffDays.includes(dayOfWeek)) {
          console.log(`Skipping ${DAYS_OF_WEEK[dayOfWeek]} - week off`);
          continue;
        }

        // Check for existing leave
        const { data: existingLeave } = await supabase
          .from("absence_records")
          .select("id")
          .eq("user_id", userId)
          .eq("absence_date", scheduleDate.toISOString().split("T")[0])
          .maybeSingle();

        if (existingLeave) {
          console.log(`Skipping ${scheduleDate.toISOString().split("T")[0]} - leave applied`);
          continue;
        }

        // Check if shift already scheduled
        const { data: existingShift } = await supabase
          .from("scheduled_shifts")
          .select("id")
          .eq("user_id", userId)
          .eq("scheduled_date", scheduleDate.toISOString().split("T")[0])
          .neq("status", "cancelled")
          .maybeSingle();

        if (!existingShift) {
          // Use current local time as base for scheduling
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const startTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}:00`;
          
          // Calculate end time (current time + 9 hours)
          const endDate = new Date(now.getTime() + DEFAULT_SHIFT_HOURS * 60 * 60 * 1000);
          const endHour = endDate.getHours();
          const endMinute = endDate.getMinutes();
          const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;

          scheduledShifts.push({
            user_id: userId,
            scheduled_date: scheduleDate.toISOString().split("T")[0],
            start_time: startTime,
            end_time: endTime,
            timezone: userTimezone,
            ai_suggested: true,
            suggested_reason: `AI: ${DEFAULT_SHIFT_HOURS}h from ${startTime.slice(0,5)}`,
            status: "scheduled"
          });
        }
      }

      if (scheduledShifts.length > 0) {
        const { error } = await supabase
          .from("scheduled_shifts")
          .insert(scheduledShifts);

        if (error) throw error;
      }

      console.log(`Generated ${scheduledShifts.length} AI shifts for user ${userId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          scheduledCount: scheduledShifts.length,
          weekOffDays: weekOffDays.map((d: number) => DAYS_OF_WEEK[d]),
          message: `AI scheduled ${scheduledShifts.length} shifts with ${DAYS_OF_WEEK[weekOffDays[0]]} off`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-assign shift for new women users
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

      // Count for load balancing
      const { count: totalWomen } = await supabase
        .from("women_shift_assignments")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const weekOffDay = (totalWomen || 0) % 7;

      // Create flexible assignment
      const { data: assignment, error: assignError } = await supabase
        .from("women_shift_assignments")
        .insert({
          user_id: userId,
          week_off_days: [weekOffDay],
          is_active: true
        })
        .select()
        .single();

      if (assignError) throw assignError;

      console.log(`Auto-assigned flexible shift to user ${userId} with ${DAYS_OF_WEEK[weekOffDay]} off`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          assignment,
          weekOff: DAYS_OF_WEEK[weekOffDay],
          message: `Assigned with ${DAYS_OF_WEEK[weekOffDay]} as week off for load balancing`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get shift status
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

      const { data: assignment } = await supabase
        .from("women_shift_assignments")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          hasActiveShift: !!activeShift,
          shift: activeShift,
          weekOffDays: assignment?.week_off_days?.map((d: number) => DAYS_OF_WEEK[d]) || [],
          suggestedHours: DEFAULT_SHIFT_HOURS
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark attendance
    if (action === "mark_attendance") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const today = now.toISOString().split("T")[0];

      const { data: actualShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .gte("start_time", `${today}T00:00:00`)
        .lte("start_time", `${today}T23:59:59`)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("attendance_date", today)
        .maybeSingle();

      if (existingAttendance) {
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
