import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHIFT_HOURS = 9; // 9-hour shifts
const SHIFT_CHANGE_BUFFER = 1; // 1-hour shift change overlap
const WEEK_OFF_INTERVAL = 2; // Week off every 2 days
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Timezone offsets for common countries (UTC offset in hours)
const COUNTRY_TIMEZONES: Record<string, number> = {
  "India": 5.5,
  "United States": -5,
  "United Kingdom": 0,
  "Australia": 10,
  "Canada": -5,
  "Germany": 1,
  "France": 1,
  "Japan": 9,
  "China": 8,
  "Brazil": -3,
  "Russia": 3,
  "South Africa": 2,
  "UAE": 4,
  "Singapore": 8,
  "Philippines": 8,
  "Indonesia": 7,
  "Thailand": 7,
  "Vietnam": 7,
  "Malaysia": 8,
  "Bangladesh": 6,
  "Pakistan": 5,
  "Sri Lanka": 5.5,
  "Nepal": 5.75,
  "Saudi Arabia": 3,
  "Egypt": 2,
  "Nigeria": 1,
  "Kenya": 3,
  "Mexico": -6,
  "Argentina": -3,
  "Colombia": -5,
  "Peru": -5,
  "Chile": -4,
  "New Zealand": 12,
  "South Korea": 9,
  "Taiwan": 8,
  "Hong Kong": 8,
  "Italy": 1,
  "Spain": 1,
  "Netherlands": 1,
  "Poland": 1,
  "Turkey": 3,
  "Iran": 3.5,
  "Iraq": 3,
  "Israel": 2,
  "Greece": 2,
  "Sweden": 1,
  "Norway": 1,
  "Denmark": 1,
  "Finland": 2,
  "Portugal": 0,
  "Belgium": 1,
  "Switzerland": 1,
  "Austria": 1,
};

// Calculate optimal shift start time based on country timezone
function calculateShiftStartTime(country: string): { startHour: number; endHour: number } {
  const offset = COUNTRY_TIMEZONES[country] || 5.5; // Default to India
  
  // Target: Peak hours for chat (evening/night local time)
  // Start shift at 6 PM local time (18:00)
  const localStartHour = 18;
  
  // Calculate UTC equivalent, then adjust back
  const utcStartHour = (localStartHour - offset + 24) % 24;
  const utcEndHour = (utcStartHour + SHIFT_HOURS) % 24;
  
  return { startHour: Math.floor(utcStartHour), endHour: Math.floor(utcEndHour) };
}

// Calculate week off days based on registration date (every 2 days)
function calculateWeekOffDays(registrationDate: Date): number[] {
  const daysSinceRegistration = Math.floor((Date.now() - registrationDate.getTime()) / (24 * 60 * 60 * 1000));
  const weekOffs: number[] = [];
  
  // Generate week off pattern: every 2 days
  // Day 0, Day 2, Day 4, Day 6 = 4 days off per week
  for (let i = 0; i < 7; i += WEEK_OFF_INTERVAL + 1) {
    const dayIndex = ((daysSinceRegistration + i) % 7);
    if (!weekOffs.includes(dayIndex)) {
      weekOffs.push(dayIndex);
    }
  }
  
  // Limit to 2-3 days off per week (every 2 days pattern)
  return weekOffs.slice(0, 3);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, timezone, action, workOnWeekOff } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userTimezone = timezone || "UTC";
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // ============= AI AUTO SCHEDULE =============
    // Auto-generates monthly schedule based on language group and country timezone
    if (action === "ai_auto_schedule") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[AI Scheduler] Starting auto-schedule for user ${userId}`);

      // Get user profile with language and country
      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_language, preferred_language, country, created_at")
        .eq("user_id", userId)
        .maybeSingle();

      const userLanguage = profile?.primary_language || profile?.preferred_language || "English";
      const userCountry = profile?.country || "India";
      const registrationDate = new Date(profile?.created_at || now);

      // Find or create language group
      const { data: languageGroups } = await supabase
        .from("language_groups")
        .select("*")
        .eq("is_active", true)
        .order("current_women_count", { ascending: true });

      let matchedGroup = null;
      for (const group of languageGroups || []) {
        if (group.languages?.some((lang: string) => 
          lang.toLowerCase().includes(userLanguage.toLowerCase()) ||
          userLanguage.toLowerCase().includes(lang.toLowerCase())
        )) {
          matchedGroup = group;
          break;
        }
      }

      // Calculate shift times based on country
      const shiftTimes = calculateShiftStartTime(userCountry);
      
      // Calculate week off days (every 2 days pattern)
      const weekOffDays = calculateWeekOffDays(registrationDate);

      console.log(`[AI Scheduler] User ${userId}: Language=${userLanguage}, Country=${userCountry}, WeekOffs=${weekOffDays.map(d => DAYS_OF_WEEK[d]).join(", ")}`);

      // Get or update assignment
      let { data: assignment } = await supabase
        .from("women_shift_assignments")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!assignment) {
        // Create new assignment
        const { data: newAssignment, error: assignError } = await supabase
          .from("women_shift_assignments")
          .insert({
            user_id: userId,
            week_off_days: weekOffDays,
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
      } else {
        // Update week off days monthly
        const lastUpdate = new Date(assignment.updated_at);
        if (lastUpdate.getMonth() !== currentMonth || lastUpdate.getFullYear() !== currentYear) {
          await supabase
            .from("women_shift_assignments")
            .update({ 
              week_off_days: weekOffDays,
              updated_at: new Date().toISOString()
            })
            .eq("id", assignment.id);
          
          console.log(`[AI Scheduler] Updated monthly week offs for user ${userId}`);
        }
      }

      // Generate schedule for the rest of the month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const scheduledShifts = [];
      const today = now.getDate();

      for (let day = today; day <= daysInMonth; day++) {
        const scheduleDate = new Date(currentYear, currentMonth, day);
        const dayOfWeek = scheduleDate.getDay();
        const dateString = scheduleDate.toISOString().split("T")[0];
        
        // Skip week off days unless user opts to work
        if (weekOffDays.includes(dayOfWeek)) {
          console.log(`[AI Scheduler] ${dateString} is week off (${DAYS_OF_WEEK[dayOfWeek]})`);
          continue;
        }

        // Check for existing leave
        const { data: existingLeave } = await supabase
          .from("absence_records")
          .select("id")
          .eq("user_id", userId)
          .eq("absence_date", dateString)
          .maybeSingle();

        if (existingLeave) continue;

        // Check if shift already scheduled
        const { data: existingShift } = await supabase
          .from("scheduled_shifts")
          .select("id")
          .eq("user_id", userId)
          .eq("scheduled_date", dateString)
          .neq("status", "cancelled")
          .maybeSingle();

        if (!existingShift) {
          // Create shift with timezone-adjusted times
          const startTime = `${shiftTimes.startHour.toString().padStart(2, "0")}:00:00`;
          const endTime = `${shiftTimes.endHour.toString().padStart(2, "0")}:00:00`;

          scheduledShifts.push({
            user_id: userId,
            scheduled_date: dateString,
            start_time: startTime,
            end_time: endTime,
            timezone: userTimezone,
            ai_suggested: true,
            suggested_reason: `AI: ${SHIFT_HOURS}h shift (${userCountry} timezone, ${userLanguage} group)`,
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

      console.log(`[AI Scheduler] Created ${scheduledShifts.length} shifts for user ${userId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          scheduledCount: scheduledShifts.length,
          weekOffDays: weekOffDays.map((d: number) => DAYS_OF_WEEK[d]),
          shiftTimes: {
            start: `${shiftTimes.startHour}:00`,
            end: `${shiftTimes.endHour}:00`,
            duration: `${SHIFT_HOURS} hours`
          },
          languageGroup: matchedGroup?.name || userLanguage,
          country: userCountry,
          message: `AI scheduled ${scheduledShifts.length} shifts for ${userLanguage} speakers in ${userCountry}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= WORK ON WEEK OFF =============
    // Allows user to opt-in to work on their scheduled week off
    if (action === "work_on_week_off") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetDate = workOnWeekOff?.date;
      if (!targetDate) {
        return new Response(
          JSON.stringify({ error: "Target date is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user profile for shift calculation
      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", userId)
        .maybeSingle();

      const shiftTimes = calculateShiftStartTime(profile?.country || "India");

      // Check if already scheduled
      const { data: existing } = await supabase
        .from("scheduled_shifts")
        .select("id")
        .eq("user_id", userId)
        .eq("scheduled_date", targetDate)
        .neq("status", "cancelled")
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, message: "Shift already scheduled for this date" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create shift for week off day
      const { error } = await supabase
        .from("scheduled_shifts")
        .insert({
          user_id: userId,
          scheduled_date: targetDate,
          start_time: `${shiftTimes.startHour.toString().padStart(2, "0")}:00:00`,
          end_time: `${shiftTimes.endHour.toString().padStart(2, "0")}:00:00`,
          timezone: userTimezone,
          ai_suggested: true,
          suggested_reason: "User opted to work on week off",
          status: "confirmed"
        });

      if (error) throw error;

      console.log(`[AI Scheduler] User ${userId} opted to work on week off: ${targetDate}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Shift scheduled for ${targetDate} (optional work day)`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= GET SHIFT STATUS =============
    if (action === "get_shift_status") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const today = now.toISOString().split("T")[0];

      // Get active shift
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      // Get today's scheduled shift
      const { data: todayShift } = await supabase
        .from("scheduled_shifts")
        .select("*")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .neq("status", "cancelled")
        .maybeSingle();

      // Get upcoming shifts (next 7 days)
      const { data: upcomingShifts } = await supabase
        .from("scheduled_shifts")
        .select("*")
        .eq("user_id", userId)
        .gt("scheduled_date", today)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true })
        .limit(7);

      // Get assignment with week offs
      const { data: assignment } = await supabase
        .from("women_shift_assignments")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      // Get user profile for shift times
      const { data: profile } = await supabase
        .from("profiles")
        .select("country, primary_language")
        .eq("user_id", userId)
        .maybeSingle();

      const shiftTimes = calculateShiftStartTime(profile?.country || "India");

      return new Response(
        JSON.stringify({
          success: true,
          hasActiveShift: !!activeShift,
          activeShift,
          todayShift,
          upcomingShifts: upcomingShifts || [],
          weekOffDays: assignment?.week_off_days?.map((d: number) => ({ index: d, name: DAYS_OF_WEEK[d] })) || [],
          shiftConfig: {
            hours: SHIFT_HOURS,
            changeBuffer: SHIFT_CHANGE_BUFFER,
            weekOffInterval: WEEK_OFF_INTERVAL,
            startHour: shiftTimes.startHour,
            endHour: shiftTimes.endHour
          },
          country: profile?.country || "Unknown",
          language: profile?.primary_language || "Unknown"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= MARK ATTENDANCE =============
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

      console.log(`[AI Scheduler] Attendance marked for user ${userId} on ${today}`);

      return new Response(
        JSON.stringify({ success: true, message: "Attendance updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= MONTHLY REFRESH =============
    // Called to refresh schedules at the start of each month
    if (action === "monthly_refresh") {
      console.log("[AI Scheduler] Starting monthly refresh for all users");

      // Get all active women assignments
      const { data: assignments } = await supabase
        .from("women_shift_assignments")
        .select("user_id")
        .eq("is_active", true);

      let refreshedCount = 0;
      for (const assignment of assignments || []) {
        try {
          // Trigger auto-schedule for each user
          const { data: profile } = await supabase
            .from("profiles")
            .select("primary_language, preferred_language, country, created_at")
            .eq("user_id", assignment.user_id)
            .maybeSingle();

          if (profile) {
            const registrationDate = new Date(profile.created_at || now);
            const weekOffDays = calculateWeekOffDays(registrationDate);

            await supabase
              .from("women_shift_assignments")
              .update({ 
                week_off_days: weekOffDays,
                updated_at: new Date().toISOString()
              })
              .eq("user_id", assignment.user_id)
              .eq("is_active", true);

            refreshedCount++;
          }
        } catch (err) {
          console.error(`[AI Scheduler] Error refreshing user ${assignment.user_id}:`, err);
        }
      }

      console.log(`[AI Scheduler] Monthly refresh completed for ${refreshedCount} users`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          refreshedCount,
          message: `Monthly schedule refresh completed for ${refreshedCount} users`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Valid actions: ai_auto_schedule, work_on_week_off, get_shift_status, mark_attendance, monthly_refresh" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI Scheduler] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
