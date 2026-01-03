import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Shift timings in local time - each shift is 9 hours with 1 hour overlap
const SHIFTS = {
  A: { name: 'Shift A (Morning)', start: 7, end: 16, code: 'A', display: '7:00 AM - 4:00 PM' },  // 7 AM - 4 PM
  B: { name: 'Shift B (Evening)', start: 15, end: 24, code: 'B', display: '3:00 PM - 12:00 AM' }, // 3 PM - 12 AM
  C: { name: 'Shift C (Night)', start: 23, end: 8, code: 'C', display: '11:00 PM - 8:00 AM' },  // 11 PM - 8 AM (next day)
};

const SHIFT_OVERLAP_HOURS = 1; // 1 hour overlap between shifts
const ROTATION_DAY = 28; // Day of month when shifts rotate
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Country to timezone offset mapping (minutes from UTC)
const TIMEZONE_OFFSETS: Record<string, number> = {
  'India': 330,
  'United States': -300, // EST
  'United Kingdom': 0,
  'Australia': 600,
  'Japan': 540,
  'Germany': 60,
  'France': 60,
  'Brazil': -180,
  'Canada': -300,
  'UAE': 240,
  'Singapore': 480,
  'Philippines': 480,
  'Indonesia': 420,
  'Bangladesh': 360,
  'Pakistan': 300,
  'Nepal': 345,
  'Sri Lanka': 330,
};

function getTimezoneOffset(country: string): number {
  return TIMEZONE_OFFSETS[country] || 330; // Default to IST
}

function formatTimeForTimezone(hour: number, offsetMinutes: number): string {
  const adjustedHour = (hour + Math.floor(offsetMinutes / 60)) % 24;
  const period = adjustedHour >= 12 ? 'PM' : 'AM';
  const displayHour = adjustedHour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rotateShift(currentShift: string): string {
  switch (currentShift) {
    case 'C': return 'A';
    case 'A': return 'B';
    case 'B': return 'C';
    default: return 'A';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, data } = await req.json();
    console.log(`[ShiftAutoScheduler] Action: ${action}, UserId: ${userId}`);

    switch (action) {
      case 'generate_monthly_schedule': {
        // Generate schedules for all approved women for current and next month
        const result = await generateMonthlySchedule(supabase, data?.targetMonth);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_my_schedule': {
        // Get current user's schedule with local time display
        const result = await getMySchedule(supabase, userId);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_language_group_schedule': {
        // Get all women's schedules in a language group
        const result = await getLanguageGroupSchedule(supabase, userId, data?.language);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'opt_in_work_on_off_day': {
        // Woman opts to work on their scheduled off day
        const result = await optInWorkOnOffDay(supabase, userId, data?.date);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'rotate_shifts_monthly': {
        // Run on 28th of each month to rotate shifts for next month
        const result = await rotateShiftsMonthly(supabase);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'assign_initial_shift': {
        // Assign a new woman to an initial shift based on language group distribution
        const result = await assignInitialShift(supabase, userId);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
  } catch (error: unknown) {
    console.error('[ShiftAutoScheduler] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function generateMonthlySchedule(supabase: any, targetMonth?: string) {
  const now = new Date();
  const targetDate = targetMonth ? new Date(targetMonth + '-01') : now;
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  // Get all approved women with their language
  const { data: women, error: womenError } = await supabase
    .from('female_profiles')
    .select(`
      user_id,
      full_name,
      country,
      primary_language,
      preferred_language
    `)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active');

  if (womenError) throw womenError;
  if (!women || women.length === 0) {
    return { success: true, message: 'No approved women to schedule', count: 0 };
  }

  // Get user languages
  const userIds = women.map((w: any) => w.user_id);
  const { data: userLanguages } = await supabase
    .from('user_languages')
    .select('user_id, language_name')
    .in('user_id', userIds);

  const languageMap = new Map();
  userLanguages?.forEach((ul: any) => {
    languageMap.set(ul.user_id, ul.language_name);
  });

  // Group women by language
  const languageGroups: Record<string, any[]> = {};
  women.forEach((woman: any) => {
    const language = languageMap.get(woman.user_id) || woman.primary_language || woman.preferred_language || 'English';
    if (!languageGroups[language]) {
      languageGroups[language] = [];
    }
    languageGroups[language].push({
      ...woman,
      language,
      timezoneOffset: getTimezoneOffset(woman.country || 'India')
    });
  });

  // Get existing shift assignments
  const { data: existingAssignments } = await supabase
    .from('women_shift_assignments')
    .select('user_id, shift_template_id')
    .in('user_id', userIds)
    .eq('is_active', true);

  const existingShiftMap = new Map();
  existingAssignments?.forEach((a: any) => {
    existingShiftMap.set(a.user_id, a.shift_template_id);
  });

  // Get shift templates
  const { data: shiftTemplates } = await supabase
    .from('shift_templates')
    .select('*')
    .eq('is_active', true)
    .order('shift_code');

  const shiftMap: Record<string, any> = {};
  shiftTemplates?.forEach((s: any) => {
    shiftMap[s.shift_code] = s;
  });

  // Generate days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const schedules: any[] = [];
  const assignments: any[] = [];

  // Process each language group
  for (const [language, groupWomen] of Object.entries(languageGroups)) {
    const womenInGroup = groupWomen as any[];
    
    // Distribute women across shifts evenly
    const shiftsPerGroup = ['A', 'B', 'C'];
    const womenPerShift = Math.ceil(womenInGroup.length / 3);

    womenInGroup.forEach((woman, index) => {
      // Determine shift based on index (round-robin)
      const shiftIndex = Math.floor(index / womenPerShift) % 3;
      const shiftCode = shiftsPerGroup[shiftIndex];
      const shiftTemplate = shiftMap[shiftCode];

      // Determine role: first half = chat, second half = video_call
      const positionInShift = index % womenPerShift;
      const halfPoint = Math.ceil(womenPerShift / 2);
      const roleType = positionInShift < halfPoint ? 'chat' : 'video_call';

      // Calculate week off days (2 per week, distributed)
      // Use user index to distribute off days across the week
      const offDay1 = (index * 2) % 7;
      const offDay2 = (index * 2 + 3) % 7;

      // Create or update assignment
      assignments.push({
        user_id: woman.user_id,
        shift_template_id: shiftTemplate?.id,
        language_group_id: null,
        week_off_days: [offDay1, offDay2],
        is_active: true,
        shift_code: shiftCode,
        role_type: roleType,
        language_group: language,
        timezone_offset: woman.timezoneOffset
      });

      // Generate daily schedules for the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const isWeekOff = dayOfWeek === offDay1 || dayOfWeek === offDay2;

        schedules.push({
          user_id: woman.user_id,
          full_name: woman.full_name,
          shift_code: shiftCode,
          shift_name: SHIFTS[shiftCode as keyof typeof SHIFTS].name,
          role_type: roleType,
          language_group: language,
          shift_date: date.toISOString().split('T')[0],
          day_of_week: DAYS_OF_WEEK[dayOfWeek],
          is_week_off: isWeekOff,
          is_optional_work: false,
          start_hour: SHIFTS[shiftCode as keyof typeof SHIFTS].start,
          end_hour: SHIFTS[shiftCode as keyof typeof SHIFTS].end,
          timezone_offset: woman.timezoneOffset,
          country: woman.country
        });
      }
    });
  }

  // Upsert assignments
  for (const assignment of assignments) {
    await supabase
      .from('women_shift_assignments')
      .upsert({
        user_id: assignment.user_id,
        shift_template_id: assignment.shift_template_id,
        language_group_id: assignment.language_group_id,
        week_off_days: assignment.week_off_days,
        is_active: true
      }, { onConflict: 'user_id' });
  }

  // Store scheduled_shifts for the month
  for (const schedule of schedules) {
    if (!schedule.is_week_off) {
      const shiftDef = SHIFTS[schedule.shift_code as keyof typeof SHIFTS];
      const startTime = `${String(shiftDef.start).padStart(2, '0')}:00:00`;
      const endTime = shiftDef.end > shiftDef.start 
        ? `${String(shiftDef.end).padStart(2, '0')}:00:00`
        : `${String(shiftDef.end).padStart(2, '0')}:00:00`; // Handles overnight shifts

      await supabase
        .from('scheduled_shifts')
        .upsert({
          user_id: schedule.user_id,
          scheduled_date: schedule.shift_date,
          start_time: startTime,
          end_time: endTime,
          timezone: schedule.country === 'India' ? 'IST' : 'UTC',
          status: 'scheduled',
          ai_suggested: true,
          suggested_reason: `Auto-assigned to ${schedule.shift_name} as ${schedule.role_type} support`
        }, { onConflict: 'user_id,scheduled_date' });
    }
  }

  return {
    success: true,
    message: `Generated ${schedules.length} schedule entries for ${women.length} women`,
    stats: {
      totalWomen: women.length,
      languageGroups: Object.keys(languageGroups).length,
      schedulesGenerated: schedules.length
    }
  };
}

async function getMySchedule(supabase: any, userId: string) {
  // Get user's profile and language
  const { data: profile } = await supabase
    .from('female_profiles')
    .select('full_name, country, primary_language, preferred_language')
    .eq('user_id', userId)
    .single();

  const { data: userLang } = await supabase
    .from('user_languages')
    .select('language_name')
    .eq('user_id', userId)
    .limit(1);

  const language = userLang?.[0]?.language_name || profile?.primary_language || 'English';
  const timezoneOffset = getTimezoneOffset(profile?.country || 'India');

  // Get assignment
  const { data: assignment } = await supabase
    .from('women_shift_assignments')
    .select('*, shift_templates(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  // Calculate date range: remaining days of current month + all of next month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // End date is last day of next month
  const nextMonth = currentMonth + 1 > 11 ? 0 : currentMonth + 1;
  const nextMonthYear = currentMonth + 1 > 11 ? currentYear + 1 : currentYear;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0);

  const { data: scheduledShifts } = await supabase
    .from('scheduled_shifts')
    .select('*')
    .eq('user_id', userId)
    .gte('scheduled_date', today.toISOString().split('T')[0])
    .lte('scheduled_date', lastDayNextMonth.toISOString().split('T')[0])
    .order('scheduled_date');

  const shiftCode = assignment?.shift_templates?.shift_code || 'A';
  const shiftDef = SHIFTS[shiftCode as keyof typeof SHIFTS];
  const weekOffDays = assignment?.week_off_days || [0, 6];

  // Calculate next rotation info
  const daysUntilRotation = ROTATION_DAY - today.getDate();
  const nextShiftAfterRotation = rotateShift(shiftCode);
  const rotationDate = new Date(currentYear, currentMonth, ROTATION_DAY);
  const isRotationThisMonth = daysUntilRotation > 0;

  // Build schedule with local times, grouped by month
  const scheduleWithLocalTime = scheduledShifts?.map((shift: any) => {
    const date = new Date(shift.scheduled_date);
    const dayOfWeek = date.getDay();
    const isWeekOff = weekOffDays.includes(dayOfWeek);
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isAfterRotation = date.getDate() >= ROTATION_DAY || date.getMonth() > currentMonth;
    
    // After rotation, shift code changes
    const effectiveShiftCode = isAfterRotation ? nextShiftAfterRotation : shiftCode;
    const effectiveShiftDef = SHIFTS[effectiveShiftCode as keyof typeof SHIFTS];

    return {
      ...shift,
      shift_code: effectiveShiftCode,
      shift_name: effectiveShiftDef.name,
      shift_display: effectiveShiftDef.display,
      day_of_week: DAYS_OF_WEEK[dayOfWeek],
      is_week_off: isWeekOff,
      month_label: isCurrentMonth ? 'This Month' : 'Next Month',
      month_name: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
      local_start_time: formatTimeForTimezone(effectiveShiftDef.start, timezoneOffset - 330),
      local_end_time: formatTimeForTimezone(effectiveShiftDef.end, timezoneOffset - 330),
      timezone_name: profile?.country === 'India' ? 'IST' : 'Local',
      is_rotation_day: date.getDate() === ROTATION_DAY && isCurrentMonth
    };
  }) || [];

  return {
    success: true,
    profile: {
      full_name: profile?.full_name,
      country: profile?.country,
      language,
      timezone_offset: timezoneOffset
    },
    assignment: {
      shift_code: shiftCode,
      shift_name: shiftDef.name,
      shift_display: shiftDef.display,
      start_time: formatTimeForTimezone(shiftDef.start, 0),
      end_time: formatTimeForTimezone(shiftDef.end, 0),
      local_start_time: formatTimeForTimezone(shiftDef.start, timezoneOffset - 330),
      local_end_time: formatTimeForTimezone(shiftDef.end, timezoneOffset - 330),
      week_off_days: weekOffDays.map((d: number) => DAYS_OF_WEEK[d]),
      role_type: 'chat'
    },
    rotation: {
      next_rotation_date: rotationDate.toISOString().split('T')[0],
      days_until_rotation: isRotationThisMonth ? daysUntilRotation : daysUntilRotation + new Date(currentYear, currentMonth + 1, 0).getDate(),
      current_shift: shiftCode,
      next_shift: nextShiftAfterRotation,
      rotation_rule: 'C→A, A→B, B→C on 28th of each month'
    },
    schedules: scheduleWithLocalTime
  };
}

async function getLanguageGroupSchedule(supabase: any, userId: string, language?: string) {
  // Get user's language if not provided
  let targetLanguage = language;
  if (!targetLanguage) {
    const { data: userLang } = await supabase
      .from('user_languages')
      .select('language_name')
      .eq('user_id', userId)
      .limit(1);
    
    if (!userLang?.[0]) {
      const { data: profile } = await supabase
        .from('female_profiles')
        .select('primary_language')
        .eq('user_id', userId)
        .single();
      targetLanguage = profile?.primary_language || 'English';
    } else {
      targetLanguage = userLang[0].language_name;
    }
  }

  // Get all women in this language group with their assignments
  const { data: womenInGroup } = await supabase
    .from('female_profiles')
    .select(`
      user_id,
      full_name,
      photo_url,
      country,
      primary_language
    `)
    .eq('approval_status', 'approved')
    .eq('account_status', 'active');

  // Get user languages to filter by language group
  const userIds = womenInGroup?.map((w: any) => w.user_id) || [];
  const { data: userLanguages } = await supabase
    .from('user_languages')
    .select('user_id, language_name')
    .in('user_id', userIds);

  const languageMap = new Map();
  userLanguages?.forEach((ul: any) => {
    languageMap.set(ul.user_id, ul.language_name);
  });

  // Filter women by target language
  const filteredWomen = womenInGroup?.filter((w: any) => {
    const wLang = languageMap.get(w.user_id) || w.primary_language || 'English';
    return wLang.toLowerCase() === targetLanguage?.toLowerCase();
  }) || [];

  // Get assignments for filtered women
  const filteredUserIds = filteredWomen.map((w: any) => w.user_id);
  const { data: assignments } = await supabase
    .from('women_shift_assignments')
    .select('*, shift_templates(*)')
    .in('user_id', filteredUserIds)
    .eq('is_active', true);

  const assignmentMap = new Map();
  assignments?.forEach((a: any) => {
    assignmentMap.set(a.user_id, a);
  });

  // Get today's date info
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Build group schedule
  const groupSchedule = {
    A: { chat: [] as any[], video_call: [] as any[] },
    B: { chat: [] as any[], video_call: [] as any[] },
    C: { chat: [] as any[], video_call: [] as any[] }
  };

  filteredWomen.forEach((woman: any, index: number) => {
    const assignment = assignmentMap.get(woman.user_id);
    const shiftCode = assignment?.shift_templates?.shift_code || ['A', 'B', 'C'][index % 3];
    const weekOffDays = assignment?.week_off_days || [0, 6];
    const isWeekOff = weekOffDays.includes(dayOfWeek);
    const timezoneOffset = getTimezoneOffset(woman.country || 'India');
    
    // Determine role based on position
    const womenInShift = filteredWomen.filter((w: any, i: number) => {
      const a = assignmentMap.get(w.user_id);
      return (a?.shift_templates?.shift_code || ['A', 'B', 'C'][i % 3]) === shiftCode;
    });
    const positionInShift = womenInShift.findIndex((w: any) => w.user_id === woman.user_id);
    const roleType = positionInShift < Math.ceil(womenInShift.length / 2) ? 'chat' : 'video_call';

    const shiftDef = SHIFTS[shiftCode as keyof typeof SHIFTS];
    const womanData = {
      user_id: woman.user_id,
      full_name: woman.full_name,
      photo_url: woman.photo_url,
      country: woman.country,
      is_week_off: isWeekOff,
      week_off_days: weekOffDays.map((d: number) => DAYS_OF_WEEK[d]),
      local_start_time: formatTimeForTimezone(shiftDef.start, timezoneOffset - 330),
      local_end_time: formatTimeForTimezone(shiftDef.end, timezoneOffset - 330),
      timezone_name: woman.country === 'India' ? 'IST' : 'Local'
    };

    if (groupSchedule[shiftCode as keyof typeof groupSchedule]) {
      groupSchedule[shiftCode as keyof typeof groupSchedule][roleType as 'chat' | 'video_call'].push(womanData);
    }
  });

  // Calculate rotation info
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysUntilRotation = ROTATION_DAY - today.getDate();
  const rotationDate = new Date(currentYear, currentMonth, ROTATION_DAY);

  return {
    success: true,
    language: targetLanguage,
    total_women: filteredWomen.length,
    today: {
      date: today.toISOString().split('T')[0],
      day_of_week: DAYS_OF_WEEK[dayOfWeek]
    },
    shifts: {
      A: {
        name: SHIFTS.A.name,
        time: SHIFTS.A.display,
        overlap: '1 hour overlap with Shift B (3-4 PM)',
        chat_support: groupSchedule.A.chat,
        video_support: groupSchedule.A.video_call
      },
      B: {
        name: SHIFTS.B.name,
        time: SHIFTS.B.display,
        overlap: '1 hour overlap with A (3-4 PM) and C (11 PM-12 AM)',
        chat_support: groupSchedule.B.chat,
        video_support: groupSchedule.B.video_call
      },
      C: {
        name: SHIFTS.C.name,
        time: SHIFTS.C.display,
        overlap: '1 hour overlap with Shift B (11 PM-12 AM)',
        chat_support: groupSchedule.C.chat,
        video_support: groupSchedule.C.video_call
      }
    },
    rotation: {
      next_rotation_date: rotationDate.toISOString().split('T')[0],
      days_until_rotation: daysUntilRotation > 0 ? daysUntilRotation : daysUntilRotation + new Date(currentYear, currentMonth + 1, 0).getDate(),
      rotation_rule: 'On 28th: C→A, A→B, B→C'
    }
  };
}

async function optInWorkOnOffDay(supabase: any, userId: string, date: string) {
  if (!date) {
    return { success: false, error: 'Date is required' };
  }

  // Get user's assignment
  const { data: assignment } = await supabase
    .from('women_shift_assignments')
    .select('*, shift_templates(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!assignment) {
    return { success: false, error: 'No active assignment found' };
  }

  const shiftCode = assignment.shift_templates?.shift_code || 'A';
  const shiftDef = SHIFTS[shiftCode as keyof typeof SHIFTS];
  const startTime = `${String(shiftDef.start).padStart(2, '0')}:00:00`;
  const endTime = `${String(shiftDef.end).padStart(2, '0')}:00:00`;

  // Create or update the scheduled shift for this date
  const { error } = await supabase
    .from('scheduled_shifts')
    .upsert({
      user_id: userId,
      scheduled_date: date,
      start_time: startTime,
      end_time: endTime,
      timezone: 'IST',
      status: 'scheduled',
      ai_suggested: false,
      suggested_reason: 'Optional work on week off day'
    }, { onConflict: 'user_id,scheduled_date' });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: `Scheduled to work on ${date}`,
    shift: {
      shift_code: shiftCode,
      shift_name: shiftDef.name,
      date
    }
  };
}

async function rotateShiftsMonthly(supabase: any) {
  const today = new Date();
  
  // Only run on 28th
  if (today.getDate() !== 28) {
    return { success: false, message: 'Rotation only runs on 28th of each month' };
  }

  // Get all active assignments
  const { data: assignments, error } = await supabase
    .from('women_shift_assignments')
    .select('*, shift_templates(*)')
    .eq('is_active', true);

  if (error) throw error;

  const rotations: any[] = [];
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  for (const assignment of assignments || []) {
    const currentShiftCode = assignment.shift_templates?.shift_code;
    if (!currentShiftCode) continue;

    const newShiftCode = rotateShift(currentShiftCode);

    // Get new shift template
    const { data: newTemplate } = await supabase
      .from('shift_templates')
      .select('id')
      .eq('shift_code', newShiftCode)
      .single();

    if (newTemplate) {
      // Update assignment
      await supabase
        .from('women_shift_assignments')
        .update({
          shift_template_id: newTemplate.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id);

      rotations.push({
        user_id: assignment.user_id,
        from_shift: currentShiftCode,
        to_shift: newShiftCode
      });
    }
  }

  // Generate new schedules for next month
  await generateMonthlySchedule(supabase, nextMonth.toISOString().slice(0, 7));

  return {
    success: true,
    message: `Rotated ${rotations.length} shift assignments`,
    rotations
  };
}

async function assignInitialShift(supabase: any, userId: string) {
  // Get user's language
  const { data: userLang } = await supabase
    .from('user_languages')
    .select('language_name')
    .eq('user_id', userId)
    .limit(1);

  const { data: profile } = await supabase
    .from('female_profiles')
    .select('primary_language, country')
    .eq('user_id', userId)
    .single();

  const language = userLang?.[0]?.language_name || profile?.primary_language || 'English';

  // Check existing assignments in this language group to balance shifts
  const { data: existingAssignments } = await supabase
    .from('women_shift_assignments')
    .select('*, shift_templates(*)')
    .eq('is_active', true);

  // Count women per shift in this language group
  const shiftCounts = { A: 0, B: 0, C: 0 };
  
  // Get languages for existing assignments
  const assignedUserIds = existingAssignments?.map((a: any) => a.user_id) || [];
  const { data: assignedLanguages } = await supabase
    .from('user_languages')
    .select('user_id, language_name')
    .in('user_id', assignedUserIds);

  const langMap = new Map();
  assignedLanguages?.forEach((ul: any) => {
    langMap.set(ul.user_id, ul.language_name);
  });

  existingAssignments?.forEach((a: any) => {
    const aLang = langMap.get(a.user_id) || 'English';
    if (aLang.toLowerCase() === language.toLowerCase()) {
      const code = a.shift_templates?.shift_code as keyof typeof shiftCounts;
      if (code && shiftCounts[code] !== undefined) {
        shiftCounts[code]++;
      }
    }
  });

  // Assign to shift with fewest women
  const assignedShift = Object.entries(shiftCounts).reduce((a, b) => 
    a[1] <= b[1] ? a : b
  )[0] as 'A' | 'B' | 'C';

  // Get shift template
  const { data: shiftTemplate } = await supabase
    .from('shift_templates')
    .select('id')
    .eq('shift_code', assignedShift)
    .single();

  // Calculate week off days based on user count
  const userIndex = (shiftCounts.A + shiftCounts.B + shiftCounts.C);
  const offDay1 = (userIndex * 2) % 7;
  const offDay2 = (userIndex * 2 + 3) % 7;

  // Create assignment
  const { error } = await supabase
    .from('women_shift_assignments')
    .upsert({
      user_id: userId,
      shift_template_id: shiftTemplate?.id,
      language_group_id: null,
      week_off_days: [offDay1, offDay2],
      is_active: true
    }, { onConflict: 'user_id' });

  if (error) {
    return { success: false, error: error.message };
  }

  const shiftDef = SHIFTS[assignedShift];
  const timezoneOffset = getTimezoneOffset(profile?.country || 'India');

  return {
    success: true,
    assignment: {
      shift_code: assignedShift,
      shift_name: shiftDef.name,
      start_time: formatTimeForTimezone(shiftDef.start, 0),
      end_time: formatTimeForTimezone(shiftDef.end, 0),
      local_start_time: formatTimeForTimezone(shiftDef.start, timezoneOffset - 330),
      local_end_time: formatTimeForTimezone(shiftDef.end, timezoneOffset - 330),
      week_off_days: [DAYS_OF_WEEK[offDay1], DAYS_OF_WEEK[offDay2]],
      language_group: language
    }
  };
}
