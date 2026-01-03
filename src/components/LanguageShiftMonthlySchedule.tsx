import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  Users, 
  Sun, 
  Moon, 
  Sunrise,
  RefreshCw,
  Globe,
  CalendarDays,
  Hand,
  Bell,
  CheckCircle,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  generateCalendarMonthsFromNow, 
  type CalendarMonth, 
  type CalendarDay,
  DAY_NAMES 
} from "@/lib/calendar-date";

interface WomanDaySchedule {
  date: string;
  day: number;
  day_name: string;
  is_week_off: boolean;
  is_rotation_day: boolean;
  shift_code: string;
  local_start_time: string;
  local_end_time: string;
}

interface WomanSchedule {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  country: string;
  timezone_offset: number;
  current_shift: {
    code: string;
    name: string;
    display: string;
    local_start_time: string;
    local_end_time: string;
  };
  role_type: string;
  week_off_days: string[];
  week_off_day_indices: number[];
  current_month: {
    name: string;
    days: WomanDaySchedule[];
  };
  next_month: {
    name: string;
    days: WomanDaySchedule[];
  };
}

interface ScheduleData {
  language: string;
  total_women: number;
  current_month: { name: string; days_remaining: number };
  next_month: { name: string; total_days: number };
  rotation: { next_date: string; days_until: number; rule: string };
  shifts: {
    A: { name: string; display: string; women_count: number };
    B: { name: string; display: string; women_count: number };
    C: { name: string; display: string; women_count: number };
  };
  women_by_shift: {
    A: WomanSchedule[];
    B: WomanSchedule[];
    C: WomanSchedule[];
  };
  all_women: WomanSchedule[];
}

interface OffDayVolunteer {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  date: string;
}

interface LanguageShiftMonthlyScheduleProps {
  userId: string;
  language?: string;
  isLeader?: boolean;
}

const SHIFT_ICONS = {
  A: <Sunrise className="h-3 w-3" />,
  B: <Sun className="h-3 w-3" />,
  C: <Moon className="h-3 w-3" />
};

const SHIFT_COLORS = {
  A: "bg-warning/30 text-warning-foreground border-warning/40",
  B: "bg-info/30 text-info-foreground border-info/40",
  C: "bg-secondary/30 text-secondary-foreground border-secondary/40"
};

const SHIFT_BG_COLORS = {
  A: "bg-warning/20",
  B: "bg-info/20",
  C: "bg-secondary/20"
};

export default function LanguageShiftMonthlySchedule({ userId, language, isLeader = false }: LanguageShiftMonthlyScheduleProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, 1 = next month, etc.
  const [offDayVolunteers, setOffDayVolunteers] = useState<OffDayVolunteer[]>([]);
  const [myVolunteerDates, setMyVolunteerDates] = useState<string[]>([]);

  // Generate months dynamically - always 3 months visible starting from monthOffset
  // This continues infinitely into the future (years 1 to 9999)
  const visibleMonths = useMemo(() => {
    // Generate 3 months starting from current month + offset
    return generateCalendarMonthsFromNow(monthOffset + 3).slice(monthOffset, monthOffset + 3);
  }, [monthOffset]);

  // Currently selected month (first of the 3 visible)
  const [selectedVisibleIndex, setSelectedVisibleIndex] = useState(0);
  
  const selectedMonth = useMemo(() => {
    return visibleMonths[selectedVisibleIndex] || visibleMonths[0];
  }, [visibleMonths, selectedVisibleIndex]);

  useEffect(() => {
    if (userId) {
      loadSchedule();
    }
  }, [userId, language]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shift-auto-scheduler', {
        body: { action: 'get_full_monthly_schedule', userId, data: { language } }
      });

      if (error) throw error;

      if (data?.success) {
        setScheduleData(data);
        if (isLeader) {
          await loadOffDayVolunteers();
        }
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast({
        title: "Error",
        description: "Failed to load schedule",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadOffDayVolunteers = async () => {
    setOffDayVolunteers([]);
  };

  const handleVolunteerForOffDay = async (date: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shift-auto-scheduler', {
        body: { action: 'opt_in_work_on_off_day', userId, data: { date } }
      });

      if (error) throw error;

      if (data?.success) {
        setMyVolunteerDates(prev => [...prev, date]);
        toast({
          title: "Volunteered!",
          description: `You've volunteered to work on ${date}`,
        });
        loadSchedule();
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to volunteer",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error volunteering:', error);
      toast({
        title: "Error",
        description: "Failed to volunteer for this day",
        variant: "destructive"
      });
    }
  };

  // Get schedule for a specific date from woman's schedule
  // For months beyond current/next, calculate week-off based on week_off_day_indices
  const getScheduleForDate = (woman: WomanSchedule, dateStr: string, dayOfWeek: number): WomanDaySchedule | null => {
    // First check if we have explicit schedule data
    const currentMonthDay = woman.current_month?.days?.find(d => d.date === dateStr);
    if (currentMonthDay) return currentMonthDay;
    
    const nextMonthDay = woman.next_month?.days?.find(d => d.date === dateStr);
    if (nextMonthDay) return nextMonthDay;
    
    // For future months, generate schedule based on week_off_day_indices
    // week_off_day_indices contains days of the week (0=Sunday to 6=Saturday) that are off
    const isWeekOff = woman.week_off_day_indices?.includes(dayOfWeek) ?? false;
    
    // Parse date to get day number
    const [year, month, day] = dateStr.split('-').map(Number);
    
    return {
      date: dateStr,
      day: day,
      day_name: DAY_NAMES[dayOfWeek],
      is_week_off: isWeekOff,
      is_rotation_day: day === 28, // Rotation happens on 28th of each month
      shift_code: woman.current_shift.code,
      local_start_time: woman.current_shift.local_start_time || '',
      local_end_time: woman.current_shift.local_end_time || ''
    };
  };

  if (isLoading) {
    return (
      <Card className="bg-background border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!scheduleData) {
    return (
      <Card className="bg-background border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No schedule data available</p>
          <Button onClick={loadSchedule} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get days from selected month only
  const allDisplayedDays = selectedMonth.days;

  return (
    <Card className="bg-background border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span>{scheduleData.language} Team Schedule</span>
            <Badge variant="secondary" className="text-xs">
              {scheduleData.total_women} members
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={loadSchedule}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shift Summary with Timings */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={`p-2 rounded-lg ${SHIFT_COLORS.A}`}>
            <div className="flex items-center justify-center gap-1">
              {SHIFT_ICONS.A}
              <span className="font-semibold text-sm">A</span>
            </div>
            <div className="text-[10px] mt-1">7 AM - 4 PM</div>
            <div className="text-lg font-bold">{scheduleData.shifts.A.women_count}</div>
          </div>
          <div className={`p-2 rounded-lg ${SHIFT_COLORS.B}`}>
            <div className="flex items-center justify-center gap-1">
              {SHIFT_ICONS.B}
              <span className="font-semibold text-sm">B</span>
            </div>
            <div className="text-[10px] mt-1">3 PM - 12 AM</div>
            <div className="text-lg font-bold">{scheduleData.shifts.B.women_count}</div>
          </div>
          <div className={`p-2 rounded-lg ${SHIFT_COLORS.C}`}>
            <div className="flex items-center justify-center gap-1">
              {SHIFT_ICONS.C}
              <span className="font-semibold text-sm">C</span>
            </div>
            <div className="text-[10px] mt-1">11 PM - 8 AM</div>
            <div className="text-lg font-bold">{scheduleData.shifts.C.women_count}</div>
          </div>
        </div>

        {/* Off-Day Rules Notice */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
          <div className="font-medium text-foreground">Week-Off Rules:</div>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>2 off-days per week (can work if you want)</li>
            <li>Off-days must be consecutive (no single day off)</li>
            <li>All women of same shift cannot be off on same day</li>
          </ul>
        </div>

        {/* Rotation Notice */}
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-warning" />
            <span className="font-medium text-warning">
              Next Rotation: {scheduleData.rotation.days_until} days
            </span>
          </div>
          <p className="text-xs text-warning/70 mt-1">
            On the 28th: A→C, C→B, B→A
          </p>
        </div>

        {/* Month Navigation - Navigate through unlimited future months */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (monthOffset > 0) {
                setMonthOffset(monthOffset - 1);
                setSelectedVisibleIndex(0);
              }
            }}
            disabled={monthOffset === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-2 flex-wrap justify-center">
            {visibleMonths.map((month, idx) => (
              <Button
                key={`${month.year}-${month.month}`}
                variant={selectedVisibleIndex === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedVisibleIndex(idx)}
                className="text-sm px-4 py-2"
              >
                {month.monthName} {month.year !== new Date().getFullYear() ? month.year : ''}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMonthOffset(monthOffset + 1);
              setSelectedVisibleIndex(0);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Month Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">{selectedMonth.name}</h3>
          <p className="text-sm text-muted-foreground">{selectedMonth.daysCount} days</p>
        </div>

        {/* Calendar Grid - Single month */}
        <div 
          className="border border-border rounded-lg"
          style={{ 
            maxHeight: '60vh',
            minHeight: '300px',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}
        >
          <table className="border-collapse w-full" style={{ minWidth: `${120 + (allDisplayedDays.length * 36)}px` }}>
            <thead className="sticky top-0 z-20 bg-background">
              {/* Day numbers row */}
              <tr className="border-b border-border">
                <th className="min-w-[120px] w-[120px] p-2 text-left text-sm font-medium text-muted-foreground sticky left-0 bg-background z-30 border-r border-border">
                  Team Member
                </th>
                {allDisplayedDays.map((day) => (
                  <th 
                    key={day.dateStr} 
                    className={`w-[36px] min-w-[36px] p-1 text-center text-xs border-r border-border ${
                      day.isToday ? 'bg-primary/20' : ''
                    }`}
                  >
                    <div className="font-semibold">{day.day}</div>
                    <div className="text-muted-foreground text-[9px] font-normal">{day.dayName.substring(0, 2)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleData.all_women.length > 0 ? (
                scheduleData.all_women.map((woman) => {
                  const isCurrentUser = woman.user_id === userId;
                  
                  return (
                    <tr 
                      key={woman.user_id} 
                      className={`border-b border-border/50 hover:bg-muted/30 ${
                        isCurrentUser ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="min-w-[120px] w-[120px] p-2 border-r border-border sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={woman.photo_url || ''} />
                            <AvatarFallback className="text-[10px] bg-muted">
                              {woman.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate flex items-center gap-1">
                              {woman.full_name?.split(' ')[0]}
                              {isCurrentUser && <Badge variant="outline" className="text-[8px] px-1">You</Badge>}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-[8px] px-1 py-0 ${SHIFT_COLORS[woman.current_shift.code as keyof typeof SHIFT_COLORS]}`}
                            >
                              {woman.current_shift.code}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      {allDisplayedDays.map((day) => {
                        const schedule = getScheduleForDate(woman, day.dateStr, day.dayOfWeek);
                        const isMyOffDay = isCurrentUser && schedule?.is_week_off;
                        const hasVolunteered = myVolunteerDates.includes(day.dateStr);
                        
                        // If no schedule data, show placeholder based on shift
                        const shiftCode = schedule?.shift_code || woman.current_shift.code;
                        const isWeekOff = schedule?.is_week_off ?? false;
                        const isRotationDay = schedule?.is_rotation_day ?? false;
                        
                        return (
                          <td
                            key={day.dateStr}
                            className={`w-[36px] min-w-[36px] p-1 text-center text-[10px] border-r border-border/30 relative group ${
                              isRotationDay 
                                ? 'bg-warning/10'
                                : isWeekOff 
                                  ? 'bg-muted/40' 
                                  : day.isToday 
                                    ? 'bg-primary/10'
                                    : SHIFT_BG_COLORS[shiftCode as keyof typeof SHIFT_BG_COLORS] || ''
                            }`}
                          >
                            {isWeekOff ? (
                              <div className="flex flex-col items-center">
                                <span className="text-muted-foreground font-medium text-[9px]">OFF</span>
                                {isMyOffDay && !hasVolunteered && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-primary/80 text-primary-foreground text-[8px] h-full w-full rounded-none"
                                    onClick={() => handleVolunteerForOffDay(day.dateStr)}
                                  >
                                    <Hand className="h-3 w-3" />
                                  </Button>
                                )}
                                {hasVolunteered && (
                                  <CheckCircle className="h-3 w-3 text-primary absolute top-0 right-0" />
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center">
                                {SHIFT_ICONS[shiftCode as keyof typeof SHIFT_ICONS]}
                                <span className="font-semibold text-[9px]">{shiftCode}</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={allDisplayedDays.length + 1} className="text-center py-8 text-muted-foreground">
                    No team members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Off-Day Volunteers Section (Leader View) */}
        {isLeader && offDayVolunteers.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Off-Day Volunteers</span>
              <Badge variant="secondary" className="text-xs">{offDayVolunteers.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {offDayVolunteers.slice(0, 5).map((volunteer, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-card rounded-full px-2 py-1 text-xs">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={volunteer.photo_url || ''} />
                    <AvatarFallback className="text-[8px]">{volunteer.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{volunteer.full_name}</span>
                  <Badge variant="outline" className="text-[8px]">{volunteer.date}</Badge>
                </div>
              ))}
              {offDayVolunteers.length > 5 && (
                <Badge variant="secondary" className="text-xs">+{offDayVolunteers.length - 5} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded ${SHIFT_BG_COLORS.A}`} />
            <span>A (7AM-4PM)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded ${SHIFT_BG_COLORS.B}`} />
            <span>B (3PM-12AM)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded ${SHIFT_BG_COLORS.C}`} />
            <span>C (11PM-8AM)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted/40" />
            <span>Off</span>
          </div>
          <div className="flex items-center gap-1">
            <Hand className="h-3 w-3" />
            <span>Volunteer</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
