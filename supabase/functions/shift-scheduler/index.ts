import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, timezone, action } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userTimezone = timezone || "Asia/Kolkata";
    const now = new Date();

    if (action === "generate_schedule") {
      // Generate AI-suggested shifts for the next 7 days
      const scheduledShifts = [];
      
      // Fetch user's past shift patterns
      const { data: pastShifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("start_time", { ascending: false })
        .limit(30);

      // Analyze patterns to suggest optimal shift times
      let preferredStartHour = 10; // Default 10 AM
      let preferredEndHour = 18; // Default 6 PM
      let avgShiftDuration = 8; // Default 8 hours

      if (pastShifts && pastShifts.length > 0) {
        const startHours = pastShifts.map(s => new Date(s.start_time).getHours());
        const durations = pastShifts
          .filter(s => s.end_time)
          .map(s => (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60));

        if (startHours.length > 0) {
          preferredStartHour = Math.round(startHours.reduce((a, b) => a + b, 0) / startHours.length);
        }
        if (durations.length > 0) {
          avgShiftDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
          preferredEndHour = preferredStartHour + avgShiftDuration;
        }
      }

      // Generate schedule for next 7 days
      for (let i = 1; i <= 7; i++) {
        const scheduleDate = new Date(now);
        scheduleDate.setDate(scheduleDate.getDate() + i);
        
        // Skip Sundays (optional rest day)
        if (scheduleDate.getDay() === 0) continue;

        const startTime = `${preferredStartHour.toString().padStart(2, "0")}:00:00`;
        const endTime = `${Math.min(preferredEndHour, 23).toString().padStart(2, "0")}:00:00`;

        // Check if shift already scheduled for this date
        const { data: existingShift } = await supabase
          .from("scheduled_shifts")
          .select("id")
          .eq("user_id", userId)
          .eq("scheduled_date", scheduleDate.toISOString().split("T")[0])
          .maybeSingle();

        if (!existingShift) {
          const reason = pastShifts && pastShifts.length > 0
            ? `Based on your pattern: avg ${avgShiftDuration}h shifts starting around ${preferredStartHour}:00`
            : "Default schedule - adjust based on your preference";

          scheduledShifts.push({
            user_id: userId,
            scheduled_date: scheduleDate.toISOString().split("T")[0],
            start_time: startTime,
            end_time: endTime,
            timezone: userTimezone,
            ai_suggested: true,
            suggested_reason: reason,
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
          message: `AI scheduled ${scheduledShifts.length} shifts based on your patterns`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "mark_attendance") {
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
