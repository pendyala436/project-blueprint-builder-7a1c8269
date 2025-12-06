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
  AlertTriangle,
  Target,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours } from "date-fns";
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

const DEFAULT_SHIFT_HOURS = 9;

const ShiftManagementScreen = () => {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingShift, setStartingShift] = useState(false);
  const [endingShift, setEndingShift] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [summary, setSummary] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalShifts: 0,
    totalHours: 0,
    avgPerHour: 0
  });

  // Get user's local timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
      setElapsedMinutes(0);
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

      // Fetch all data in parallel
      const [activeShiftRes, shiftsRes] = await Promise.all([
        supabase.from("shifts").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
        supabase.from("shifts").select("*").eq("user_id", user.id).order("start_time", { ascending: false }).limit(30)
      ]);

      if (activeShiftRes.data) setActiveShift(activeShiftRes.data);
      setShifts(shiftsRes.data || []);

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
      
      // Calculate suggested end time (9 hours from now)
      const suggestedEnd = new Date();
      suggestedEnd.setHours(suggestedEnd.getHours() + DEFAULT_SHIFT_HOURS);
      
      toast.success(`Shift started! Suggested duration: ${DEFAULT_SHIFT_HOURS} hours (until ${format(suggestedEnd, "h:mm a")})`);
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

  const shiftStatus = activeShift ? getShiftStatus() : null;
  const ShiftStatusIcon = shiftStatus?.icon || Clock;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Shift Management
              </h1>
              <p className="text-xs text-muted-foreground">{userTimezone}</p>
            </div>
          </div>
          <Badge variant={activeShift ? "default" : "secondary"} className={activeShift ? "bg-green-500" : ""}>
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
                {activeShift ? "Active Shift" : "Start Your Shift"}
              </span>
              {activeShift && (
                <span className="text-3xl font-mono font-bold text-green-500">{elapsedTime}</span>
              )}
            </CardTitle>
            <CardDescription>
              {activeShift 
                ? `Started ${formatDistanceToNow(new Date(activeShift.start_time), { addSuffix: true })} at ${format(new Date(activeShift.start_time), "h:mm a")}`
                : `AI suggests ${DEFAULT_SHIFT_HOURS}-hour shifts. Work more or less as you prefer!`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeShift ? (
              <div className="space-y-4">
                {/* Progress toward 9-hour target */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <ShiftStatusIcon className={cn("h-4 w-4", shiftStatus?.color)} />
                      <span className={shiftStatus?.color}>{shiftStatus?.label}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m / {DEFAULT_SHIFT_HOURS}h target
                    </span>
                  </div>
                  <Progress value={getShiftProgress()} className="h-2" />
                  {elapsedMinutes >= DEFAULT_SHIFT_HOURS * 60 && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Great job! You've completed your target. End when ready or continue earning!
                    </p>
                  )}
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

                {elapsedMinutes < 30 && (
                  <p className="text-xs text-center text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Ending early? You can work as long as you want - no minimum required!
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Flexible Working Hours</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start whenever you're ready. AI suggests {DEFAULT_SHIFT_HOURS}-hour shifts, but you decide your schedule!
                  </p>
                </div>
                <Button onClick={startShift} disabled={startingShift} className="w-full h-14 text-lg bg-green-500 hover:bg-green-600">
                  {startingShift ? <Loader2 className="h-6 w-6 mr-2 animate-spin" /> : <Play className="h-6 w-6 mr-2" />}
                  Start Shift
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">AI-Powered Flexible Scheduling</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on your login time, AI recommends a {DEFAULT_SHIFT_HOURS}-hour shift in your local timezone ({userTimezone}). 
                  You can work longer for extra earnings or end early if needed. Your choice!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Earnings and History */}
        <Tabs defaultValue="earnings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earnings" className="text-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              <Clock className="h-4 w-4 mr-2" />
              Shift History
            </TabsTrigger>
          </TabsList>

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
                    <p className="text-sm">Start your first shift to see history</p>
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
                      {shifts.filter(s => s.status === "completed").slice(0, 15).map((shift) => {
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
