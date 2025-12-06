import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shift templates
const SHIFT_TEMPLATES = [
  { code: "A", name: "Morning", startTime: "06:00:00", endTime: "15:00:00" },
  { code: "B", name: "Evening", startTime: "15:00:00", endTime: "00:00:00" },
  { code: "C", name: "Night", startTime: "00:00:00", endTime: "09:00:00" }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, timezone, action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userTimezone = timezone || "Asia/Kolkata";
    const now = new Date();

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

      // Get shift templates
      const { data: shiftTemplates } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("is_active", true);

      // Count current assignments per shift for load balancing
      const { data: currentAssignments } = await supabase
        .from("women_shift_assignments")
        .select("shift_template_id")
        .eq("is_active", true);

      const shiftCounts: Record<string, number> = {};
      (currentAssignments || []).forEach(a => {
        shiftCounts[a.shift_template_id] = (shiftCounts[a.shift_template_id] || 0) + 1;
      });

      // Assign to shift with least women (load balancing)
      let selectedShift = shiftTemplates?.[0];
      let minCount = Infinity;

      for (const shift of shiftTemplates || []) {
        const count = shiftCounts[shift.id] || 0;
        if (count < minCount) {
          minCount = count;
          selectedShift = shift;
        }
      }

      // Assign week off - rotate based on user count
      const totalAssigned = currentAssignments?.length || 0;
      const weekOffDay = totalAssigned % 7; // 0=Sunday, 1=Monday, etc.

      // Create assignment
      const { data: assignment, error: assignError } = await supabase
        .from("women_shift_assignments")
        .insert({
          user_id: userId,
          shift_template_id: selectedShift?.id,
          language_group_id: matchedLanguageGroup?.id || null,
          week_off_days: [weekOffDay],
          is_active: true
        })
        .select(`
          *,
          shift_template:shift_templates(*),
          language_group:language_groups(*)
        `)
        .single();

      if (assignError) throw assignError;

      console.log(`Auto-assigned user ${userId} to shift ${selectedShift?.shift_code} with week off on day ${weekOffDay}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          assignment,
          message: `Assigned to ${selectedShift?.name} with ${getDayName(weekOffDay)} off`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's shift assignment
    if (action === "get_assignment") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: assignment } = await supabase
        .from("women_shift_assignments")
        .select(`
          *,
          shift_template:shift_templates(*),
          language_group:language_groups(*)
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      return new Response(
        JSON.stringify({ success: true, assignment }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate schedule based on assignment
    if (action === "generate_schedule") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's shift assignment
      const { data: assignment } = await supabase
        .from("women_shift_assignments")
        .select(`
          *,
          shift_template:shift_templates(*)
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!assignment) {
        // Auto-assign first
        const autoAssignResponse = await fetch(`${supabaseUrl}/functions/v1/shift-scheduler`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ userId, action: "auto_assign_shift" })
        });
        const autoAssignResult = await autoAssignResponse.json();
        
        if (!autoAssignResult.success) {
          return new Response(
            JSON.stringify({ error: "Failed to auto-assign shift" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Re-fetch assignment after potential auto-assign
      const { data: finalAssignment } = await supabase
        .from("women_shift_assignments")
        .select(`
          *,
          shift_template:shift_templates(*)
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!finalAssignment?.shift_template) {
        return new Response(
          JSON.stringify({ error: "No shift template assigned" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const shiftTemplate = finalAssignment.shift_template;
      const weekOffDays = finalAssignment.week_off_days || [0];
      const scheduledShifts = [];

      // Generate schedule for next 7 days
      for (let i = 1; i <= 7; i++) {
        const scheduleDate = new Date(now);
        scheduleDate.setDate(scheduleDate.getDate() + i);
        const dayOfWeek = scheduleDate.getDay();
        
        // Skip week off days
        if (weekOffDays.includes(dayOfWeek)) continue;

        // Check if shift already scheduled for this date
        const { data: existingShift } = await supabase
          .from("scheduled_shifts")
          .select("id")
          .eq("user_id", userId)
          .eq("scheduled_date", scheduleDate.toISOString().split("T")[0])
          .maybeSingle();

        if (!existingShift) {
          scheduledShifts.push({
            user_id: userId,
            scheduled_date: scheduleDate.toISOString().split("T")[0],
            start_time: shiftTemplate.start_time,
            end_time: shiftTemplate.end_time,
            timezone: userTimezone,
            ai_suggested: true,
            suggested_reason: `${shiftTemplate.name} - ${shiftTemplate.work_hours}h work, ${shiftTemplate.break_hours}h break`,
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

      console.log(`Generated ${scheduledShifts.length} scheduled shifts for user ${userId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          scheduledCount: scheduledShifts.length,
          shiftName: shiftTemplate.name,
          weekOffDays: weekOffDays.map(getDayName),
          message: `Scheduled ${scheduledShifts.length} shifts (${shiftTemplate.name})`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "mark_attendance") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const today = now.toISOString().split("T")[0];

      // Get today's scheduled shift
      const { data: scheduledShift } = await supabase
        .from("scheduled_shifts")
        .select("*")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .maybeSingle();

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

      // Check if attendance already marked
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("attendance_date", today)
        .maybeSingle();

      if (existingAttendance) {
        // Update existing attendance
        if (actualShift && !existingAttendance.check_out_time && actualShift.end_time) {
          await supabase
            .from("attendance")
            .update({
              check_out_time: actualShift.end_time,
              shift_id: actualShift.id,
              status: "present"
            })
            .eq("id", existingAttendance.id);
        }
      } else {
        // Create new attendance record
        let status = "pending";
        let checkInTime = null;

        if (actualShift) {
          checkInTime = actualShift.start_time;
          
          if (scheduledShift) {
            const scheduledStart = new Date(`${today}T${scheduledShift.start_time}`);
            const actualStart = new Date(actualShift.start_time);
            const diffMinutes = (actualStart.getTime() - scheduledStart.getTime()) / (1000 * 60);
            
            if (diffMinutes > 30) {
              status = "late";
            } else {
              status = "present";
            }
          } else {
            status = "present";
          }
        } else if (scheduledShift) {
          // Scheduled but no actual shift - check if shift time has passed
          const scheduledEnd = new Date(`${today}T${scheduledShift.end_time}`);
          if (now > scheduledEnd) {
            status = "absent";
            
            // Create absence record
            await supabase
              .from("absence_records")
              .insert({
                user_id: userId,
                absence_date: today,
                leave_type: "no_show",
                ai_detected: true,
                reason: "AI detected: Scheduled shift was missed"
              });
          }
        }

        await supabase
          .from("attendance")
          .insert({
            user_id: userId,
            scheduled_shift_id: scheduledShift?.id || null,
            shift_id: actualShift?.id || null,
            attendance_date: today,
            check_in_time: checkInTime,
            check_out_time: actualShift?.end_time || null,
            status: status,
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

function getDayName(dayIndex: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayIndex] || "Unknown";
}
