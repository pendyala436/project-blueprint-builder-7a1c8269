import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { 
  Clock, 
  Play, 
  Square, 
  IndianRupee,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar as CalendarIcon,
  Timer,
  Gift,
  Loader2,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Target,
  Zap,
  CalendarPlus,
  CalendarOff,
  RefreshCw,
  Bot
} from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours, addDays, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import NavigationHeader from "@/components/NavigationHeader";

interface Shift {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  total_chats: number;
  total_messages: number;
  earnings: number;
  bonus_earnings: number;
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

interface TeamShift {
  id: string;
  user_id: string;
  full_name: string | null;
  primary_language: string | null;
  shift_code: string;
  shift_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  week_off_days: number[];
}

interface AbsenceRecord {
  id: string;
  absence_date: string;
  reason: string | null;
  leave_type: string;
  approved: boolean;
  ai_detected: boolean;
}

interface WeekOff {
  dayIndex: number;
  dayName: string;
}

const DEFAULT_SHIFT_HOURS = 9;
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ShiftManagementScreen = () => {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scheduledShifts, setScheduledShifts] = useState<ScheduledShift[]>([]);
  const [teamShifts, setTeamShifts] = useState<TeamShift[]>([]);
  const [userLanguage, setUserLanguage] = useState<string | null>(null);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [weekOffs, setWeekOffs] = useState<WeekOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [startingShift, setStartingShift] = useState(false);
  const [endingShift, setEndingShift] = useState(false);
  const [bookingShift, setBookingShift] = useState(false);
  const [applyingLeave, setApplyingLeave] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dialog states
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedBookHours, setSelectedBookHours] = useState("9");
  const [selectedLeaveDate, setSelectedLeaveDate] = useState<Date | undefined>();
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState("casual");

  const [summary, setSummary] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalShifts: 0,
    totalHours: 0,
    avgPerHour: 0
  });

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const updateElapsedTime = () => {
    if (!activeShift) return;
    const start = new Date(activeShift.start_time);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const totalMinutes = Math.floor(diff / 60);
    setElapsedMinutes(totalMinutes);
    const hours = Math.floor(diff / 3600).toString().padStart(2, "0");
    const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
    const seconds = (diff % 60).toString().padStart(2, "0");
    setElapsedTime(`${hours}:${minutes}:${seconds}`);
  };

  const animateEarnings = (target: number) => {
    const duration = 1000;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedEarnings(target);
        clearInterval(interval);
      } else {
        setAnimatedEarnings(current);
      }
    }, duration / steps);
  };

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const [activeShiftRes, shiftsRes, scheduledRes, absencesRes, assignmentRes] = await Promise.all([
        supabase.from("shifts").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
        supabase.from("shifts").select("*").eq("user_id", user.id).order("start_time", { ascending: false }).limit(30),
        supabase.from("scheduled_shifts").select("*").eq("user_id", user.id).gte("scheduled_date", new Date().toISOString().split("T")[0]).order("scheduled_date", { ascending: true }).limit(14),
        supabase.from("absence_records").select("*").eq("user_id", user.id).order("absence_date", { ascending: false }).limit(10),
        supabase.from("women_shift_assignments").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle()
      ]);

      if (activeShiftRes.data) setActiveShift(activeShiftRes.data);
      setShifts(shiftsRes.data || []);
      setScheduledShifts(scheduledRes.data || []);
      setAbsences(absencesRes.data || []);

      // Set week offs from assignment
      if (assignmentRes.data?.week_off_days) {
        setWeekOffs(assignmentRes.data.week_off_days.map((d: number) => ({
          dayIndex: d,
          dayName: DAYS_OF_WEEK[d]
        })));
      }

      // Calculate summary
      const allShifts = shiftsRes.data?.filter(s => s.status === "completed") || [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayEarnings = 0, weekEarnings = 0, monthEarnings = 0, totalHours = 0;

      allShifts.forEach((shift) => {
        const shiftDate = new Date(shift.start_time);
        const earnings = Number(shift.earnings) + Number(shift.bonus_earnings);
        
        if (shiftDate >= todayStart) todayEarnings += earnings;
        if (shiftDate >= weekStart) weekEarnings += earnings;
        if (shiftDate >= monthStart) monthEarnings += earnings;

        if (shift.end_time) {
          totalHours += differenceInMinutes(new Date(shift.end_time), new Date(shift.start_time)) / 60;
        }
      });

      const totalEarnings = allShifts.reduce((acc, s) => acc + Number(s.earnings) + Number(s.bonus_earnings), 0);

      setSummary({
        today: todayEarnings,
        thisWeek: weekEarnings,
        thisMonth: monthEarnings,
        totalShifts: allShifts.length,
        totalHours: Math.round(totalHours * 10) / 10,
        avgPerHour: totalHours > 0 ? Math.round((totalEarnings / totalHours) * 100) / 100 : 0
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch team shifts for same language group
  const fetchTeamShifts = async () => {
    setLoadingTeam(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's language group
      const { data: assignment } = await supabase
        .from("women_shift_assignments")
        .select("language_group_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!assignment?.language_group_id) {
        setTeamShifts([]);
        return;
      }

      // Get language group info
      const { data: langGroup } = await supabase
        .from("language_groups")
        .select("name, languages")
        .eq("id", assignment.language_group_id)
        .single();

      if (langGroup) {
        setUserLanguage(langGroup.name);
      }

      // Get all women in the same language group with their shifts
      const { data: teamAssignments } = await supabase
        .from("women_shift_assignments")
        .select(`
          id,
          user_id,
          week_off_days,
          shift_template_id,
          language_group_id
        `)
        .eq("language_group_id", assignment.language_group_id)
        .eq("is_active", true);

      if (!teamAssignments || teamAssignments.length === 0) {
        setTeamShifts([]);
        return;
      }

      const userIds = teamAssignments.map(a => a.user_id);

      // Get profiles for all team members - try both female_profiles and profiles tables
      const [femaleProfilesRes, profilesRes] = await Promise.all([
        supabase
          .from("female_profiles")
          .select("user_id, full_name, primary_language")
          .in("user_id", userIds),
        supabase
          .from("profiles")
          .select("user_id, full_name, primary_language")
          .in("user_id", userIds)
      ]);

      // Combine profiles, preferring female_profiles data
      const profilesMap = new Map<string, { full_name: string | null; primary_language: string | null }>();
      
      // Add from profiles table first
      (profilesRes.data || []).forEach(p => {
        if (p.full_name) {
          profilesMap.set(p.user_id, { full_name: p.full_name, primary_language: p.primary_language });
        }
      });
      
      // Override with female_profiles data (preferred)
      (femaleProfilesRes.data || []).forEach(p => {
        if (p.full_name) {
          profilesMap.set(p.user_id, { full_name: p.full_name, primary_language: p.primary_language });
        }
      });

      // Get scheduled shifts for all team members
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: schedules } = await supabase
        .from("scheduled_shifts")
        .select("*")
        .in("user_id", userIds)
        .gte("scheduled_date", todayStr)
        .order("scheduled_date", { ascending: true })
        .limit(100);

      // Get shift templates
      const { data: templates } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("is_active", true);

      // Map team shifts with shift codes
      const teamShiftsList: TeamShift[] = (schedules || []).map(sched => {
        const profileData = profilesMap.get(sched.user_id);
        const assign = teamAssignments.find(a => a.user_id === sched.user_id);
        
        // Determine shift code based on start time
        let shiftCode = "A";
        let shiftName = "Morning";
        const startHour = parseInt(sched.start_time.split(":")[0]);
        
        if (startHour >= 0 && startHour < 9) {
          shiftCode = "C";
          shiftName = "Night";
        } else if (startHour >= 9 && startHour < 15) {
          shiftCode = "A";
          shiftName = "Morning";
        } else {
          shiftCode = "B";
          shiftName = "Evening";
        }

        // Check if template exists for more accurate code
        if (assign?.shift_template_id && templates) {
          const template = templates.find(t => t.id === assign.shift_template_id);
          if (template) {
            shiftCode = template.shift_code || shiftCode;
            shiftName = template.name || shiftName;
          }
        }

        return {
          id: sched.id,
          user_id: sched.user_id,
          full_name: profileData?.full_name || "Team Member",
          primary_language: profileData?.primary_language || null,
          shift_code: shiftCode,
          shift_name: shiftName,
          scheduled_date: sched.scheduled_date,
          start_time: sched.start_time,
          end_time: sched.end_time,
          status: sched.status,
          week_off_days: assign?.week_off_days || []
        };
      });

      setTeamShifts(teamShiftsList);
    } catch (error) {
      console.error("Error fetching team shifts:", error);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchTeamShifts();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Real-time subscriptions for shift data
  useMultipleRealtimeSubscriptions(
    ["shifts", "scheduled_shifts", "absence_records", "women_shift_assignments"],
    fetchAllData
  );

  useEffect(() => {
    if (activeShift) {
      updateElapsedTime();
      timerRef.current = setInterval(updateElapsedTime, 1000);
      animateEarnings(activeShift.earnings + activeShift.bonus_earnings);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime("00:00:00");
      setElapsedMinutes(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeShift]);

  const startShift = async () => {
    setStartingShift(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("shifts")
        .insert({ user_id: user.id, status: "active" })
        .select()
        .single();

      if (error) throw error;

      setActiveShift(data);
      const suggestedEnd = new Date();
      suggestedEnd.setHours(suggestedEnd.getHours() + DEFAULT_SHIFT_HOURS);
      
      toast.success(`Shift started! Suggested duration: ${DEFAULT_SHIFT_HOURS} hours`);
      fetchAllData();
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("Failed to start shift");
    } finally {
      setStartingShift(false);
    }
  };

  const endShift = async () => {
    if (!activeShift) return;
    setEndingShift(true);
    try {
      const { error } = await supabase
        .from("shifts")
        .update({ status: "completed", end_time: new Date().toISOString() })
        .eq("id", activeShift.id);

      if (error) throw error;

      const totalEarnings = activeShift.earnings + activeShift.bonus_earnings;
      const hoursWorked = elapsedMinutes / 60;
      
      toast.success(`Shift ended! You worked ${hoursWorked.toFixed(1)} hours and earned ₹${totalEarnings.toFixed(2)}`);
      setActiveShift(null);
      fetchAllData();
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Failed to end shift");
    } finally {
      setEndingShift(false);
    }
  };

  const bookShift = async () => {
    setBookingShift(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hours = parseInt(selectedBookHours);
      // Use current local time as start - booking for TODAY only
      const now = new Date();
      const startHour = now.getHours();
      const startMinute = now.getMinutes();
      const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}:00`;
      
      // Calculate end time (start + hours)
      const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
      const endHour = endDate.getHours();
      const endMinute = endDate.getMinutes();
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;

      const { error } = await supabase.from("scheduled_shifts").insert({
        user_id: user.id,
        scheduled_date: format(now, "yyyy-MM-dd"), // Today's date only
        start_time: startTime,
        end_time: endTime,
        timezone: userTimezone,
        ai_suggested: false,
        suggested_reason: `Booked ${hours}h from ${format(now, "h:mm a")}`,
        status: "confirmed"
      });

      if (error) throw error;

      toast.success(`Shift booked for today (${hours} hours from ${format(now, "h:mm a")})`);
      setBookDialogOpen(false);
      fetchAllData();
    } catch (error) {
      console.error("Error booking shift:", error);
      toast.error("Failed to book shift");
    } finally {
      setBookingShift(false);
    }
  };

  const applyLeave = async () => {
    if (!selectedLeaveDate) {
      toast.error("Please select a date");
      return;
    }

    setApplyingLeave(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // AI auto-approves leave
      const { error } = await supabase.from("absence_records").insert({
        user_id: user.id,
        absence_date: format(selectedLeaveDate, "yyyy-MM-dd"),
        reason: leaveReason || "Personal leave",
        leave_type: leaveType,
        ai_detected: false,
        approved: true // Auto-approved by AI
      });

      if (error) throw error;

      // Cancel any scheduled shift for that date
      await supabase
        .from("scheduled_shifts")
        .update({ status: "cancelled" })
        .eq("user_id", user.id)
        .eq("scheduled_date", format(selectedLeaveDate, "yyyy-MM-dd"));

      toast.success(
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-green-500" />
          <span>Leave auto-approved by AI for {format(selectedLeaveDate, "MMM dd")}</span>
        </div>
      );
      setLeaveDialogOpen(false);
      setSelectedLeaveDate(undefined);
      setLeaveReason("");
      fetchAllData();
    } catch (error) {
      console.error("Error applying leave:", error);
      toast.error("Failed to apply leave");
    } finally {
      setApplyingLeave(false);
    }
  };

  const generateAISchedule = async () => {
    setGeneratingSchedule(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke("shift-scheduler", {
        body: { userId: user.id, timezone: userTimezone, action: "ai_auto_schedule" }
      });

      if (error) throw error;

      toast.success(data.message || "AI schedule generated with week offs!");
      fetchAllData();
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate AI schedule");
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const cancelScheduledShift = async (shiftId: string) => {
    try {
      await supabase
        .from("scheduled_shifts")
        .update({ status: "cancelled" })
        .eq("id", shiftId);

      toast.success("Shift cancelled");
      fetchAllData();
    } catch (error) {
      console.error("Error cancelling shift:", error);
      toast.error("Failed to cancel shift");
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "In progress";
    const minutes = differenceInMinutes(new Date(end), new Date(start));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getShiftProgress = () => {
    const targetMinutes = DEFAULT_SHIFT_HOURS * 60;
    return Math.min((elapsedMinutes / targetMinutes) * 100, 100);
  };

  const getShiftStatus = () => {
    const targetMinutes = DEFAULT_SHIFT_HOURS * 60;
    if (elapsedMinutes < targetMinutes * 0.5) return { label: "Just Started", color: "text-blue-500", icon: Zap };
    if (elapsedMinutes < targetMinutes) return { label: "In Progress", color: "text-yellow-500", icon: Target };
    if (elapsedMinutes < targetMinutes * 1.5) return { label: "Target Reached!", color: "text-green-500", icon: CheckCircle2 };
    return { label: "Extended Shift", color: "text-purple-500", icon: Sparkles };
  };

  const isWeekOffDay = (date: Date) => {
    return weekOffs.some(w => w.dayIndex === date.getDay());
  };

  const isLeaveDay = (date: Date) => {
    return absences.some(a => isSameDay(new Date(a.absence_date), date));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const shiftStatus = activeShift ? getShiftStatus() : null;
  const ShiftStatusIcon = shiftStatus?.icon || Clock;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <NavigationHeader
            title="Shift Management"
            showBack={true}
            showHome={true}
            showForward={false}
            homePath="/women-dashboard"
            rightContent={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">{userTimezone}</span>
                <Badge variant={activeShift ? "default" : "secondary"} className={activeShift ? "bg-green-500" : ""}>
                  {activeShift ? "On Shift" : "Off Duty"}
                </Badge>
              </div>
            }
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Active Shift Card */}
        <Card className={cn(
          "relative overflow-hidden transition-all duration-500",
          activeShift ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" : "bg-gradient-to-br from-muted to-muted/50"
        )}>
          {activeShift && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
          )}
          
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                {activeShift ? "Active Shift" : "Start Your Shift"}
              </span>
              {activeShift && (
                <span className="text-3xl font-mono font-bold text-green-500">{elapsedTime}</span>
              )}
            </CardTitle>
            <CardDescription>
              {activeShift 
                ? `Started ${formatDistanceToNow(new Date(activeShift.start_time), { addSuffix: true })}`
                : `AI suggests ${DEFAULT_SHIFT_HOURS}-hour shifts. Work more or less as you prefer!`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeShift ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <ShiftStatusIcon className={cn("h-4 w-4", shiftStatus?.color)} />
                      <span className={shiftStatus?.color}>{shiftStatus?.label}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m / {DEFAULT_SHIFT_HOURS}h
                    </span>
                  </div>
                  <Progress value={getShiftProgress()} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{activeShift.total_messages}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{activeShift.total_chats}</p>
                    <p className="text-xs text-muted-foreground">Chats</p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <IndianRupee className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-bold text-green-500">{animatedEarnings.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Earned</p>
                  </div>
                </div>

                <Button onClick={endShift} disabled={endingShift} variant="destructive" className="w-full h-12">
                  {endingShift ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Square className="h-5 w-5 mr-2" />}
                  End Shift
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button onClick={startShift} disabled={startingShift} variant="aurora" className="w-full h-14 text-lg">
                  {startingShift ? <Loader2 className="h-6 w-6 mr-2 animate-spin" /> : <Play className="h-6 w-6 mr-2" />}
                  Start Shift Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="auroraOutline" className="h-auto py-4 flex-col gap-2">
                <CalendarPlus className="h-5 w-5 text-primary" />
                <span className="text-xs">Book Hours</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5" />
                  Book Today's Shift
                </DialogTitle>
                <DialogDescription>Book your work hours for today</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{format(new Date(), "EEEE")}</p>
                  <p className="text-lg text-muted-foreground">{format(new Date(), "MMMM dd, yyyy")}</p>
                  <p className="text-sm text-primary mt-2">Starting from {format(new Date(), "h:mm a")}</p>
                </div>
                <div className="space-y-2">
                  <Label>Hours to Work</Label>
                  <Select value={selectedBookHours} onValueChange={setSelectedBookHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                        <SelectItem key={h} value={h.toString()}>{h} hours</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Shift will end at approximately {format(new Date(Date.now() + parseInt(selectedBookHours) * 60 * 60 * 1000), "h:mm a")}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookDialogOpen(false)}>Cancel</Button>
                <Button onClick={bookShift} disabled={bookingShift}>
                  {bookingShift ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Book {selectedBookHours}h Shift
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <CalendarOff className="h-5 w-5 text-orange-500" />
                <span className="text-xs">Apply Leave</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarOff className="h-5 w-5" />
                  Apply for Leave
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-green-500" />
                  Leave is auto-approved by AI
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedLeaveDate}
                    onSelect={setSelectedLeaveDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border mx-auto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="planned">Planned Leave</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Enter reason..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
                <Button onClick={applyLeave} disabled={applyingLeave || !selectedLeaveDate}>
                  {applyingLeave ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
                  Auto-Approve
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={generateAISchedule}
            disabled={generatingSchedule}
          >
            {generatingSchedule ? (
              <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-purple-500" />
            )}
            <span className="text-xs">AI Schedule</span>
          </Button>
        </div>

        {/* Week Offs Card */}
        {weekOffs.length > 0 && (
          <Card className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border-rose-500/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-rose-500" />
                  <div>
                    <p className="font-medium text-sm">AI Week Off (24/7 Schedule)</p>
                    <p className="text-xs text-muted-foreground">Optional rest day - you can still work</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {weekOffs.map(w => (
                    <Badge key={w.dayIndex} variant="secondary" className="bg-rose-500/20 text-rose-600">
                      {w.dayName.slice(0, 3)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="team" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs sm:text-sm">
              <CalendarIcon className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">My</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">$</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <Clock className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Log</span>
            </TabsTrigger>
          </TabsList>

          {/* Team Shifts Tab */}
          <TabsContent value="team" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team Shifts
                    {userLanguage && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {userLanguage}
                      </Badge>
                    )}
                  </span>
                  <Button variant="ghost" size="sm" onClick={fetchTeamShifts} disabled={loadingTeam}>
                    <RefreshCw className={cn("h-4 w-4", loadingTeam && "animate-spin")} />
                  </Button>
                </CardTitle>
                <CardDescription>
                  All women in your language group with shifts A, B, C
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : teamShifts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No team shifts found</p>
                    <p className="text-sm">Team members will appear when shifts are scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Group by date */}
                    {Object.entries(
                      teamShifts.reduce((acc, shift) => {
                        const date = shift.scheduled_date;
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(shift);
                        return acc;
                      }, {} as Record<string, TeamShift[]>)
                    ).slice(0, 7).map(([date, shifts]) => (
                      <div key={date} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {format(new Date(date), "EEE, MMM dd")}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {shifts.length} {shifts.length === 1 ? "person" : "people"}
                          </Badge>
                        </div>
                        <div className="divide-y divide-border">
                          {shifts.map((shift) => {
                            const shiftColors: Record<string, string> = {
                              A: "bg-amber-500/20 text-amber-600 border-amber-500/30",
                              B: "bg-blue-500/20 text-blue-600 border-blue-500/30",
                              C: "bg-purple-500/20 text-purple-600 border-purple-500/30"
                            };
                            
                            return (
                              <div
                                key={shift.id}
                                className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                      shiftColors[shift.shift_code] || "bg-muted"
                                    )}
                                  >
                                    {shift.shift_code}
                                  </Badge>
                                  <div>
                                    <p className="font-medium text-sm">{shift.full_name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                      {shift.primary_language && (
                                        <span className="ml-2 text-primary">• {shift.primary_language}</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">{shift.shift_name}</p>
                                  {shift.week_off_days.includes(new Date(date).getDay()) && (
                                    <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-500 border-rose-500/20 mt-1">
                                      Week Off
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shift Legend */}
            <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">A</Badge>
                    <span className="text-sm">Morning (6AM-3PM)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-600 border-blue-500/30">B</Badge>
                    <span className="text-sm">Evening (3PM-12AM)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-600 border-purple-500/30">C</Badge>
                    <span className="text-sm">Night (12AM-9AM)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Upcoming Shifts
                  </span>
                  <Button variant="ghost" size="sm" onClick={fetchAllData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledShifts.filter(s => s.status !== "cancelled").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No upcoming shifts</p>
                    <p className="text-sm">Book hours or generate AI schedule</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledShifts.filter(s => s.status !== "cancelled").map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px]">
                            <p className="text-lg font-bold">{format(new Date(shift.scheduled_date), "dd")}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(shift.scheduled_date), "EEE")}</p>
                          </div>
                          <div>
                            <p className="font-medium">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {shift.ai_suggested ? (
                                <>
                                  <Sparkles className="h-3 w-3" />
                                  AI scheduled
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  User booked
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelScheduledShift(shift.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leaves */}
            {absences.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarOff className="h-5 w-5 text-orange-500" />
                    Applied Leaves
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {absences.slice(0, 5).map((absence) => (
                      <div key={absence.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{format(new Date(absence.absence_date), "MMM dd, yyyy")}</p>
                          <p className="text-xs text-muted-foreground capitalize">{absence.leave_type} leave</p>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Bot className="h-3 w-3 mr-1" />
                          Auto-approved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Today</p>
                      <p className="text-2xl font-bold">₹{summary.today.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Week</p>
                      <p className="text-2xl font-bold">₹{summary.thisWeek.toFixed(2)}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold">₹{summary.thisMonth.toFixed(2)}</p>
                    </div>
                    <Gift className="h-8 w-8 text-orange-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg/Hour</p>
                      <p className="text-2xl font-bold">₹{summary.avgPerHour.toFixed(2)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{summary.totalShifts}</p>
                    <p className="text-sm text-muted-foreground">Total Shifts</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{summary.totalHours}h</p>
                    <p className="text-sm text-muted-foreground">Hours Worked</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Shifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shifts.filter(s => s.status === "completed").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No completed shifts yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Chats</TableHead>
                        <TableHead className="text-right">Earned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.filter(s => s.status === "completed").slice(0, 10).map((shift) => {
                        const duration = shift.end_time 
                          ? differenceInHours(new Date(shift.end_time), new Date(shift.start_time))
                          : 0;
                        const isFullShift = duration >= DEFAULT_SHIFT_HOURS;
                        
                        return (
                          <TableRow key={shift.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{format(new Date(shift.start_time), "MMM dd")}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(shift.start_time), "h:mm a")}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {formatDuration(shift.start_time, shift.end_time)}
                                {isFullShift && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                              </div>
                            </TableCell>
                            <TableCell>{shift.total_chats}</TableCell>
                            <TableCell className="text-right font-medium text-green-500">
                              ₹{(Number(shift.earnings) + Number(shift.bonus_earnings)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShiftManagementScreen;
