import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  Calendar, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  Globe,
  Languages,
  CalendarPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, parseISO, addHours } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShiftConfig {
  hours: number;
  changeBuffer: number;
  weekOffInterval: number;
  startHour: number;
  endHour: number;
}

interface ScheduledShift {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  ai_suggested: boolean;
  suggested_reason: string | null;
}

interface WeekOff {
  index: number;
  name: string;
}

interface AIShiftDisplayProps {
  userId: string;
  compact?: boolean;
}

const AIShiftDisplay = ({ userId, compact = false }: AIShiftDisplayProps) => {
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [todayShift, setTodayShift] = useState<ScheduledShift | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<ScheduledShift[]>([]);
  const [weekOffDays, setWeekOffDays] = useState<WeekOff[]>([]);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [country, setCountry] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [hasActiveShift, setHasActiveShift] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchShiftData();
      triggerAutoSchedule();
    }
  }, [userId]);

  const triggerAutoSchedule = async () => {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      await supabase.functions.invoke("shift-scheduler", {
        body: { 
          userId, 
          timezone: userTimezone, 
          action: "ai_auto_schedule" 
        }
      });
      
      // Refresh data after scheduling
      await fetchShiftData();
    } catch (error) {
      console.error("Error triggering auto-schedule:", error);
    }
  };

  const fetchShiftData = async () => {
    try {
      setLoading(true);
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const { data, error } = await supabase.functions.invoke("shift-scheduler", {
        body: { userId, timezone: userTimezone, action: "get_shift_status" }
      });

      if (error) throw error;

      setTodayShift(data.todayShift || null);
      setUpcomingShifts(data.upcomingShifts || []);
      setWeekOffDays(data.weekOffDays || []);
      setShiftConfig(data.shiftConfig || null);
      setCountry(data.country || "");
      setLanguage(data.language || "");
      setHasActiveShift(data.hasActiveShift || false);
    } catch (error) {
      console.error("Error fetching shift data:", error);
    } finally {
      setLoading(false);
    }
  };

  const workOnWeekOff = async (date: string) => {
    try {
      setScheduling(true);
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const { data, error } = await supabase.functions.invoke("shift-scheduler", {
        body: { 
          userId, 
          timezone: userTimezone, 
          action: "work_on_week_off",
          workOnWeekOff: { date }
        }
      });

      if (error) throw error;

      toast.success(data.message || "Shift scheduled for week off day");
      await fetchShiftData();
    } catch (error) {
      console.error("Error scheduling work on week off:", error);
      toast.error("Failed to schedule shift");
    } finally {
      setScheduling(false);
    }
  };

  const formatShiftTime = (startTime: string, endTime: string) => {
    const start = startTime.slice(0, 5);
    const end = endTime.slice(0, 5);
    return `${start} - ${end}`;
  };

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  const isCurrentlyInShift = () => {
    if (!todayShift) return false;
    const now = new Date();
    const [startHour, startMin] = todayShift.start_time.split(":").map(Number);
    const [endHour, endMin] = todayShift.end_time.split(":").map(Number);
    
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = currentHour * 60 + currentMin;
    const startTimeMin = startHour * 60 + startMin;
    const endTimeMin = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endTimeMin < startTimeMin) {
      return currentTime >= startTimeMin || currentTime <= endTimeMin;
    }
    return currentTime >= startTimeMin && currentTime <= endTimeMin;
  };

  const getShiftStatus = () => {
    if (hasActiveShift) return { label: "On Shift", color: "bg-green-500", icon: Play };
    if (isCurrentlyInShift()) return { label: "Shift Active", color: "bg-green-500", icon: CheckCircle2 };
    if (todayShift) return { label: "Scheduled", color: "bg-blue-500", icon: Clock };
    return { label: "Off Today", color: "bg-muted", icon: Calendar };
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const shiftStatus = getShiftStatus();
  const StatusIcon = shiftStatus.icon;

  if (compact) {
    return (
      <Card className={cn(
        "relative overflow-hidden transition-all",
        hasActiveShift || isCurrentlyInShift() 
          ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" 
          : "bg-gradient-aurora"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-full", shiftStatus.color)}>
                <StatusIcon className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">{shiftStatus.label}</p>
                {todayShift && (
                  <p className="text-xs text-muted-foreground">
                    {formatShiftTime(todayShift.start_time, todayShift.end_time)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
              {weekOffDays.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {weekOffDays.length} days off
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2">
        <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Scheduled
        </Badge>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Your Shift Schedule
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Shift Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span>{country}</span>
          </div>
          <div className="flex items-center gap-1">
            <Languages className="h-4 w-4" />
            <span>{language}</span>
          </div>
          {shiftConfig && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{shiftConfig.hours}h shifts</span>
            </div>
          )}
        </div>

        {/* Today's Shift */}
        <div className={cn(
          "p-4 rounded-xl border transition-all",
          hasActiveShift || isCurrentlyInShift()
            ? "bg-green-500/10 border-green-500/30"
            : todayShift
            ? "bg-blue-500/10 border-blue-500/30"
            : "bg-muted/50 border-muted"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-full", shiftStatus.color)}>
                <StatusIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">{shiftStatus.label}</p>
                {todayShift ? (
                  <p className="text-sm text-muted-foreground">
                    {formatShiftTime(todayShift.start_time, todayShift.end_time)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No shift scheduled</p>
                )}
              </div>
            </div>
            {isCurrentlyInShift() && (
              <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
            )}
          </div>
        </div>

        {/* Week Off Days */}
        {weekOffDays.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Week Off Days (Every 2 days)
            </p>
            <div className="flex flex-wrap gap-2">
              {weekOffDays.map((day) => (
                <Badge key={day.index} variant="outline" className="text-xs">
                  {day.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 You can choose to work on week off days if you want
            </p>
          </div>
        )}

        {/* Upcoming Shifts */}
        {upcomingShifts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Upcoming Shifts</p>
            <div className="space-y-2">
              {upcomingShifts.slice(0, 5).map((shift) => (
                <div 
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {getDateLabel(shift.scheduled_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatShiftTime(shift.start_time, shift.end_time)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {shift.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work on Week Off Option */}
        {weekOffDays.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Want to work on your week off?
            </p>
            <div className="flex flex-wrap gap-2">
              {weekOffDays.map((day) => {
                // Calculate next occurrence of this day
                const today = new Date();
                const currentDay = today.getDay();
                let daysUntil = day.index - currentDay;
                if (daysUntil <= 0) daysUntil += 7;
                const nextDate = new Date(today);
                nextDate.setDate(today.getDate() + daysUntil);
                const dateString = nextDate.toISOString().split("T")[0];

                return (
                  <Button
                    key={day.index}
                    variant="outline"
                    size="sm"
                    onClick={() => workOnWeekOff(dateString)}
                    disabled={scheduling}
                    className="text-xs"
                  >
                    <CalendarPlus className="h-3 w-3 mr-1" />
                    Work on {day.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIShiftDisplay;
