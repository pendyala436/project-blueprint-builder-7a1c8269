import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
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
  UserCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedMonth, setSelectedMonth] = useState<'current' | 'next'>('current');
  const [offDayVolunteers, setOffDayVolunteers] = useState<OffDayVolunteer[]>([]);
  const [myVolunteerDates, setMyVolunteerDates] = useState<string[]>([]);

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
        // Load off-day volunteers for leaders
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
    // Volunteers are tracked locally for now
    // In a real implementation, this would query a dedicated volunteers table
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

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
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
      <Card className="bg-card border-border">
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

  // Get all dates for the selected month
  const getDatesForMonth = () => {
    if (!scheduleData.all_women.length) return [];
    const monthData = selectedMonth === 'current' 
      ? scheduleData.all_women[0]?.current_month 
      : scheduleData.all_women[0]?.next_month;
    return monthData?.days || [];
  };

  const monthDates = getDatesForMonth();

  // Create grid header (dates)
  const renderGridHeader = () => (
    <div className="flex border-b border-border sticky top-0 bg-card z-10">
      <div className="min-w-[120px] w-[120px] shrink-0 p-2 border-r border-border font-medium text-sm text-muted-foreground sticky left-0 bg-card z-20">
        Team Member
      </div>
      <div className="flex">
        {monthDates.map((day) => {
          const isToday = new Date().toISOString().split('T')[0] === day.date;
          return (
            <div 
              key={day.date} 
              className={`w-[40px] shrink-0 p-1 text-center text-xs border-r border-border ${
                isToday ? 'bg-primary/10' : ''
              }`}
            >
              <div className="font-semibold">{day.day}</div>
              <div className="text-muted-foreground text-[10px]">{day.day_name.substring(0, 2)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render each woman's row
  const renderWomanRow = (woman: WomanSchedule) => {
    const monthData = selectedMonth === 'current' ? woman.current_month : woman.next_month;
    const isCurrentUser = woman.user_id === userId;

    return (
      <div 
        key={woman.user_id} 
        className={`flex border-b border-border/50 hover:bg-muted/30 ${
          isCurrentUser ? 'bg-primary/5' : ''
        }`}
      >
        {/* Woman info column - sticky left */}
        <div className="min-w-[120px] w-[120px] shrink-0 p-2 border-r border-border flex items-center gap-2 sticky left-0 bg-card z-10">
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
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Badge 
                variant="outline" 
                className={`text-[8px] px-1 py-0 ${SHIFT_COLORS[woman.current_shift.code as keyof typeof SHIFT_COLORS]}`}
              >
                {woman.current_shift.code}
              </Badge>
            </div>
          </div>
        </div>

        {/* Days columns */}
        <div className="flex">
          {monthData.days.map((day) => {
            const isToday = new Date().toISOString().split('T')[0] === day.date;
            const isMyOffDay = isCurrentUser && day.is_week_off;
            const hasVolunteered = myVolunteerDates.includes(day.date);

            return (
              <div
                key={day.date}
                className={`w-[40px] shrink-0 p-1 text-center text-[10px] border-r border-border/30 relative group ${
                  day.is_rotation_day 
                    ? 'bg-warning/10 border-warning/20'
                    : day.is_week_off 
                      ? 'bg-muted/40' 
                      : isToday 
                        ? 'bg-primary/10'
                        : SHIFT_BG_COLORS[day.shift_code as keyof typeof SHIFT_BG_COLORS] || ''
                }`}
              >
                {day.is_week_off ? (
                  <div className="flex flex-col items-center">
                    <span className="text-muted-foreground font-medium">OFF</span>
                    {isMyOffDay && !hasVolunteered && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-primary/80 text-primary-foreground text-[8px] h-full w-full rounded-none"
                        onClick={() => handleVolunteerForOffDay(day.date)}
                      >
                        <Hand className="h-3 w-3" />
                      </Button>
                    )}
                    {hasVolunteered && (
                      <CheckCircle className="h-3 w-3 text-primary absolute top-0 right-0" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    {SHIFT_ICONS[day.shift_code as keyof typeof SHIFT_ICONS]}
                    <span className="font-semibold">{day.shift_code}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Count off-day volunteers per date
  const getVolunteerCountForDate = (date: string) => {
    return offDayVolunteers.filter(v => v.date === date).length;
  };

  return (
    <Card className="bg-card border-border">
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
            On the 28th: A→B, B→C, C→A
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex gap-2">
          <Button
            variant={selectedMonth === 'current' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonth('current')}
          >
            {scheduleData.current_month.name}
          </Button>
          <Button
            variant={selectedMonth === 'next' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonth('next')}
          >
            {scheduleData.next_month.name}
          </Button>
        </div>

        {/* Calendar Grid - Full bidirectional scrolling for 150+ users */}
        <div 
          className="border border-border rounded-lg"
          style={{ 
            maxHeight: '500px',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <table className="border-collapse" style={{ minWidth: `${120 + (monthDates.length * 40)}px` }}>
            <thead className="sticky top-0 z-20 bg-card">
              <tr className="border-b border-border">
                <th className="min-w-[120px] w-[120px] p-2 text-left text-sm font-medium text-muted-foreground sticky left-0 bg-card z-30 border-r border-border">
                  Team Member
                </th>
                {monthDates.map((day) => {
                  const isToday = new Date().toISOString().split('T')[0] === day.date;
                  return (
                    <th 
                      key={day.date} 
                      className={`w-[40px] p-1 text-center text-xs border-r border-border ${
                        isToday ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="font-semibold">{day.day}</div>
                      <div className="text-muted-foreground text-[10px] font-normal">{day.day_name.substring(0, 2)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {scheduleData.all_women.length > 0 ? (
                scheduleData.all_women.map((woman) => {
                  const monthData = selectedMonth === 'current' ? woman.current_month : woman.next_month;
                  const isCurrentUser = woman.user_id === userId;
                  
                  return (
                    <tr 
                      key={woman.user_id} 
                      className={`border-b border-border/50 hover:bg-muted/30 ${
                        isCurrentUser ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="min-w-[120px] w-[120px] p-2 border-r border-border sticky left-0 bg-card z-10">
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
                      {monthData.days.map((day) => {
                        const isToday = new Date().toISOString().split('T')[0] === day.date;
                        const isMyOffDay = isCurrentUser && day.is_week_off;
                        const hasVolunteered = myVolunteerDates.includes(day.date);
                        
                        return (
                          <td
                            key={day.date}
                            className={`w-[40px] p-1 text-center text-[10px] border-r border-border/30 relative group ${
                              day.is_rotation_day 
                                ? 'bg-warning/10'
                                : day.is_week_off 
                                  ? 'bg-muted/40' 
                                  : isToday 
                                    ? 'bg-primary/10'
                                    : SHIFT_BG_COLORS[day.shift_code as keyof typeof SHIFT_BG_COLORS] || ''
                            }`}
                          >
                            {day.is_week_off ? (
                              <div className="flex flex-col items-center">
                                <span className="text-muted-foreground font-medium">OFF</span>
                                {isMyOffDay && !hasVolunteered && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-primary/80 text-primary-foreground text-[8px] h-full w-full rounded-none"
                                    onClick={() => handleVolunteerForOffDay(day.date)}
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
                                {SHIFT_ICONS[day.shift_code as keyof typeof SHIFT_ICONS]}
                                <span className="font-semibold">{day.shift_code}</span>
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
                  <td colSpan={monthDates.length + 1} className="text-center py-8 text-muted-foreground">
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
