import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Clock, 
  Play, 
  Square, 
  IndianRupee,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar,
  Timer,
  Gift,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  CalendarDays,
  UserCheck,
  AlertCircle,
  RefreshCw,
  MapPin
} from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes, addDays } from "date-fns";
import { cn } from "@/lib/utils";

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
  timezone: string;
  status: string;
  ai_suggested: boolean;
  suggested_reason: string | null;
}

interface Attendance {
  id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  auto_marked: boolean;
}

interface AbsenceRecord {
  id: string;
  absence_date: string;
  reason: string | null;
  leave_type: string;
  approved: boolean;
  ai_detected: boolean;
}

interface ShiftTemplate {
  id: string;
  name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  work_hours: number;
  break_hours: number;
}

interface ShiftAssignment {
  id: string;
  user_id: string;
  week_off_days: number[];
  is_active: boolean;
  shift_template: ShiftTemplate | null;
  language_group: { id: string; name: string } | null;
}

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ShiftManagementScreen = () => {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scheduledShifts, setScheduledShifts] = useState<ScheduledShift[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [shiftAssignment, setShiftAssignment] = useState<ShiftAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingShift, setStartingShift] = useState(false);
  const [endingShift, setEndingShift] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [selectedTimezone, setSelectedTimezone] = useState("Asia/Kolkata");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState("casual");
  const [leaveDate, setLeaveDate] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [summary, setSummary] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalShifts: 0,
    totalHours: 0,
    avgPerHour: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    fetchAllData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeShift) {
      updateElapsedTime();
      timerRef.current = setInterval(updateElapsedTime, 1000);
      animateEarnings(activeShift.earnings + activeShift.bonus_earnings);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime("00:00:00");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeShift]);

  const updateElapsedTime = () => {
    if (!activeShift) return;
    const start = new Date(activeShift.start_time);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
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

      // Fetch all data in parallel
      const [
        activeShiftRes,
        shiftsRes,
        scheduledRes,
        attendanceRes,
        absencesRes,
        assignmentRes
      ] = await Promise.all([
        supabase.from("shifts").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
        supabase.from("shifts").select("*").eq("user_id", user.id).order("start_time", { ascending: false }).limit(10),
        supabase.from("scheduled_shifts").select("*").eq("user_id", user.id).gte("scheduled_date", new Date().toISOString().split("T")[0]).order("scheduled_date", { ascending: true }).limit(14),
        supabase.from("attendance").select("*").eq("user_id", user.id).order("attendance_date", { ascending: false }).limit(30),
        supabase.from("absence_records").select("*").eq("user_id", user.id).order("absence_date", { ascending: false }).limit(10),
        supabase.from("women_shift_assignments").select(`
          *,
          shift_template:shift_templates(*),
          language_group:language_groups(id, name)
        `).eq("user_id", user.id).eq("is_active", true).maybeSingle()
      ]);

      if (activeShiftRes.data) setActiveShift(activeShiftRes.data);
      setShifts(shiftsRes.data || []);
      setScheduledShifts(scheduledRes.data || []);
      setAttendance(attendanceRes.data || []);
      setAbsences(absencesRes.data || []);
      if (assignmentRes.data) setShiftAssignment(assignmentRes.data as ShiftAssignment);

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
      const presentCount = (attendanceRes.data || []).filter(a => a.status === "present" || a.status === "late").length;
      const totalAttendance = (attendanceRes.data || []).filter(a => a.status !== "pending").length;

      setSummary({
        today: todayEarnings,
        thisWeek: weekEarnings,
        thisMonth: monthEarnings,
        totalShifts: allShifts.length,
        totalHours: Math.round(totalHours * 10) / 10,
        avgPerHour: totalHours > 0 ? Math.round((totalEarnings / totalHours) * 100) / 100 : 0,
        attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateAISchedule = async () => {
    setGeneratingSchedule(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke("shift-scheduler", {
        body: { userId: user.id, timezone: selectedTimezone, action: "generate_schedule" }
      });

      if (error) throw error;

      toast.success(data.message || "Schedule generated!");
      fetchAllData();
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate schedule");
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const markAttendance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.functions.invoke("shift-scheduler", {
        body: { userId: user.id, action: "mark_attendance" }
      });

      toast.success("Attendance updated");
      fetchAllData();
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to update attendance");
    }
  };

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
      toast.success("Shift started! 🎉");
      
      // Auto mark attendance
      markAttendance();
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
      toast.success(`Shift ended! You earned ₹${totalEarnings.toFixed(2)} 💰`);
      setActiveShift(null);
      markAttendance();
      fetchAllData();
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Failed to end shift");
    } finally {
      setEndingShift(false);
    }
  };

  const confirmScheduledShift = async (shiftId: string) => {
    try {
      await supabase
        .from("scheduled_shifts")
        .update({ status: "confirmed" })
        .eq("id", shiftId);

      toast.success("Shift confirmed!");
      fetchAllData();
    } catch (error) {
      console.error("Error confirming shift:", error);
      toast.error("Failed to confirm shift");
    }
  };

  const applyLeave = async () => {
    if (!leaveDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("absence_records").insert({
        user_id: user.id,
        absence_date: leaveDate,
        reason: leaveReason,
        leave_type: leaveType,
        ai_detected: false
      });

      // Cancel scheduled shift for that date
      await supabase
        .from("scheduled_shifts")
        .update({ status: "cancelled" })
        .eq("user_id", user.id)
        .eq("scheduled_date", leaveDate);

      toast.success("Leave applied successfully");
      setLeaveDialogOpen(false);
      setLeaveReason("");
      setLeaveDate("");
      fetchAllData();
    } catch (error) {
      console.error("Error applying leave:", error);
      toast.error("Failed to apply leave");
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "In progress";
    const minutes = differenceInMinutes(new Date(end), new Date(start));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      present: { variant: "default", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      late: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      absent: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3 mr-1" /> },
      scheduled: { variant: "outline", icon: <Calendar className="h-3 w-3 mr-1" /> },
      confirmed: { variant: "default", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    };
    const config = variants[status] || { variant: "secondary" as const, icon: null };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shift Management
            </h1>
          </div>
          <Badge variant={activeShift ? "default" : "secondary"}>
            {activeShift ? "On Shift" : "Off Duty"}
          </Badge>
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
                Current Shift
              </span>
              {activeShift && (
                <span className="text-3xl font-mono font-bold text-green-500">{elapsedTime}</span>
              )}
            </CardTitle>
            <CardDescription>
              {activeShift 
                ? `Started ${formatDistanceToNow(new Date(activeShift.start_time), { addSuffix: true })}`
                : "Start a shift to begin tracking earnings"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeShift ? (
              <div className="space-y-4">
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
              <Button onClick={startShift} disabled={startingShift} className="w-full h-14 text-lg bg-green-500 hover:bg-green-600">
                {startingShift ? <Loader2 className="h-6 w-6 mr-2 animate-spin" /> : <Play className="h-6 w-6 mr-2" />}
                Start Shift
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Assigned Shift Info */}
        {shiftAssignment?.shift_template && (
          <Card className="bg-gradient-to-r from-primary/10 via-violet-500/10 to-rose-500/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Your Assigned Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-lg font-bold text-primary">
                    {shiftAssignment.shift_template.shift_code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shiftAssignment.shift_template.name.replace("Shift ", "").replace(" –", "")}
                  </p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-sm font-bold">
                    {shiftAssignment.shift_template.start_time.slice(0, 5)} - {shiftAssignment.shift_template.end_time.slice(0, 5)}
                  </p>
                  <p className="text-xs text-muted-foreground">Timing</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-sm font-bold">
                    {shiftAssignment.shift_template.work_hours}h + {shiftAssignment.shift_template.break_hours}h
                  </p>
                  <p className="text-xs text-muted-foreground">Work + Break</p>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <p className="text-sm font-bold text-rose-500">
                    {shiftAssignment.week_off_days.map(d => DAYS_OF_WEEK[d]?.slice(0, 3)).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">Week Off</p>
                </div>
              </div>
              {shiftAssignment.language_group && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {shiftAssignment.language_group.name} Group
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs for different sections */}
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="schedule" className="text-xs">
              <CalendarDays className="h-4 w-4 mr-1" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs">
              <UserCheck className="h-4 w-4 mr-1" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs">
              <TrendingUp className="h-4 w-4 mr-1" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            {/* AI Schedule Generator */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Shift Scheduler
                </CardTitle>
                <CardDescription>Let AI schedule your shifts based on your patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Timezone
                    </Label>
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={generateAISchedule} disabled={generatingSchedule}>
                    {generatingSchedule ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Generate Schedule
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Apply Leave
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apply for Leave</DialogTitle>
                        <DialogDescription>Mark a day as leave or absence</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <input
                            type="date"
                            value={leaveDate}
                            onChange={(e) => setLeaveDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full p-2 rounded-md border border-input bg-background"
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
                            placeholder="Enter reason for leave..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={applyLeave}>Submit</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" onClick={() => fetchAllData()} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Scheduled Shifts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Shifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledShifts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No scheduled shifts</p>
                    <p className="text-sm">Generate a schedule using AI</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledShifts.map((shift, index) => (
                      <div
                        key={shift.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-fade-in",
                          shift.status === "confirmed" && "border-l-4 border-green-500"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold">{format(new Date(shift.scheduled_date), "dd")}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(shift.scheduled_date), "EEE")}</p>
                          </div>
                          <div>
                            <p className="font-medium">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</p>
                            {shift.ai_suggested && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                {shift.suggested_reason?.slice(0, 40)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(shift.status)}
                          {shift.status === "scheduled" && (
                            <Button size="sm" variant="outline" onClick={() => confirmScheduledShift(shift.id)}>
                              Confirm
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-500">{summary.attendanceRate}%</p>
                    <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{absences.length}</p>
                    <p className="text-sm text-muted-foreground">Absences</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Recent Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No attendance records</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.slice(0, 10).map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{format(new Date(record.attendance_date), "MMM dd")}</TableCell>
                          <TableCell>{record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : "-"}</TableCell>
                          <TableCell>{record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : "-"}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4">
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
                    <Calendar className="h-8 w-8 text-green-500 opacity-50" />
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

            <div className="flex gap-4">
              <Card className="flex-1">
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold">{summary.totalShifts}</p>
                  <p className="text-sm text-muted-foreground">Total Shifts</p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold">{summary.totalHours}</p>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Shifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shifts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No shifts yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Chats</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell>{format(new Date(shift.start_time), "MMM dd, HH:mm")}</TableCell>
                          <TableCell>{formatDuration(shift.start_time, shift.end_time)}</TableCell>
                          <TableCell>{shift.total_chats}</TableCell>
                          <TableCell className="text-green-500 font-semibold">
                            ₹{(Number(shift.earnings) + Number(shift.bonus_earnings)).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={shift.status === "active" ? "default" : "secondary"}>
                              {shift.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
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
