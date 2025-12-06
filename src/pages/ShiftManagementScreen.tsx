import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  XCircle
} from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
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

interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalShifts: number;
  totalHours: number;
  avgPerHour: number;
}

const ShiftManagementScreen = () => {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalShifts: 0,
    totalHours: 0,
    avgPerHour: 0
  });
  const [loading, setLoading] = useState(true);
  const [startingShift, setStartingShift] = useState(false);
  const [endingShift, setEndingShift] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchShiftData();
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

  const fetchShiftData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch active shift
      const { data: activeData } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (activeData) {
        setActiveShift(activeData);
      }

      // Fetch recent shifts
      const { data: shiftsData } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false })
        .limit(10);

      setShifts(shiftsData || []);

      // Calculate summary
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: allShifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed");

      if (allShifts) {
        let todayEarnings = 0;
        let weekEarnings = 0;
        let monthEarnings = 0;
        let totalHours = 0;

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
      }
    } catch (error) {
      console.error("Error fetching shift data:", error);
      toast.error("Failed to load shift data");
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
        .insert({
          user_id: user.id,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      setActiveShift(data);
      toast.success("Shift started! Good luck! 🎉");
      fetchShiftData();
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
        .update({
          status: "completed",
          end_time: new Date().toISOString()
        })
        .eq("id", activeShift.id);

      if (error) throw error;

      const totalEarnings = activeShift.earnings + activeShift.bonus_earnings;
      toast.success(`Shift ended! You earned ₹${totalEarnings.toFixed(2)} 💰`);
      setActiveShift(null);
      fetchShiftData();
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
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
          activeShift 
            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" 
            : "bg-gradient-to-br from-muted to-muted/50"
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
                <span className="text-3xl font-mono font-bold text-green-500">
                  {elapsedTime}
                </span>
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
                    <p className="text-2xl font-bold text-green-500">
                      {animatedEarnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Earned</p>
                  </div>
                </div>
                
                <Button 
                  onClick={endShift} 
                  disabled={endingShift}
                  variant="destructive"
                  className="w-full h-12"
                >
                  {endingShift ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-5 w-5 mr-2" />
                  )}
                  End Shift
                </Button>
              </div>
            ) : (
              <Button 
                onClick={startShift} 
                disabled={startingShift}
                className="w-full h-14 text-lg bg-green-500 hover:bg-green-600"
              >
                {startingShift ? (
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                ) : (
                  <Play className="h-6 w-6 mr-2" />
                )}
                Start Shift
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Earnings Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">₹{summary.today.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
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
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
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
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <Gift className="h-5 w-5 text-orange-500" />
                </div>
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
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <Clock className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
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

        {/* Shift History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No shifts yet</p>
                <p className="text-sm">Start your first shift to begin earning</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {shifts.map((shift, index) => (
                      <TableRow 
                        key={shift.id}
                        className={cn(
                          "transition-all duration-300 animate-fade-in",
                          shift.status === "active" && "bg-green-500/5"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(new Date(shift.start_time), "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell>
                          {formatDuration(shift.start_time, shift.end_time)}
                        </TableCell>
                        <TableCell>{shift.total_chats}</TableCell>
                        <TableCell className="font-semibold text-green-500">
                          ₹{(Number(shift.earnings) + Number(shift.bonus_earnings)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={shift.status === "active" ? "default" : shift.status === "completed" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {shift.status === "active" && <Play className="h-3 w-3 mr-1" />}
                            {shift.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {shift.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                            {shift.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShiftManagementScreen;
