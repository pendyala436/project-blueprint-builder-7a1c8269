import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Users,
  Timer,
  RefreshCw,
  Zap,
  Home
} from "lucide-react";

interface Shift {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  total_chats: number;
  total_messages: number;
  earnings: number;
  created_at: string;
}

interface ComplianceStats {
  totalShifts: number;
  completedShifts: number;
  activeShifts: number;
  averageHours: number;
  complianceRate: number;
  totalEarnings: number;
}

const ShiftComplianceScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [stats, setStats] = useState<ComplianceStats>({
    totalShifts: 0,
    completedShifts: 0,
    activeShifts: 0,
    averageHours: 0,
    complianceRate: 0,
    totalEarnings: 0,
  });
  const [startingShift, setStartingShift] = useState(false);
  const [endingShift, setEndingShift] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (activeShift) {
        updateElapsedTime(activeShift.start_time);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const updateElapsedTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setElapsedTime(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load shifts
      const { data: shiftsData, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false })
        .limit(50);

      if (error) throw error;
      setShifts(shiftsData || []);

      // Find active shift
      const active = shiftsData?.find(s => s.status === "active");
      setActiveShift(active || null);
      if (active) {
        updateElapsedTime(active.start_time);
      }

      // Calculate stats
      const completed = shiftsData?.filter(s => s.status === "completed") || [];
      const totalHours = completed.reduce((sum, s) => {
        if (s.end_time) {
          return sum + differenceInHours(new Date(s.end_time), new Date(s.start_time));
        }
        return sum;
      }, 0);

      const totalEarnings = shiftsData?.reduce((sum, s) => sum + (s.earnings || 0), 0) || 0;

      // Calculate compliance (shifts >= 8 hours)
      const compliantShifts = completed.filter(s => {
        if (s.end_time) {
          return differenceInHours(new Date(s.end_time), new Date(s.start_time)) >= 8;
        }
        return false;
      });

      setStats({
        totalShifts: shiftsData?.length || 0,
        completedShifts: completed.length,
        activeShifts: shiftsData?.filter(s => s.status === "active").length || 0,
        averageHours: completed.length > 0 ? totalHours / completed.length : 0,
        complianceRate: completed.length > 0 ? (compliantShifts.length / completed.length) * 100 : 100,
        totalEarnings,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load shift data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startShift = async () => {
    setStartingShift(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("shifts")
        .insert({
          user_id: user.id,
          status: "active",
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveShift(data);
      setShifts(prev => [data, ...prev]);
      
      toast({
        title: "Shift Started",
        description: "Your shift has begun. Good luck!",
      });
    } catch (error) {
      console.error("Error starting shift:", error);
      toast({
        title: "Error",
        description: "Failed to start shift",
        variant: "destructive",
      });
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
          end_time: new Date().toISOString(),
        })
        .eq("id", activeShift.id);

      if (error) throw error;

      toast({
        title: "Shift Ended",
        description: `You worked for ${elapsedTime}`,
      });

      setActiveShift(null);
      loadData();
    } catch (error) {
      console.error("Error ending shift:", error);
      toast({
        title: "Error",
        description: "Failed to end shift",
        variant: "destructive",
      });
    } finally {
      setEndingShift(false);
    }
  };

  const getComplianceStatus = (shift: Shift) => {
    if (shift.status === "active") return "active";
    if (!shift.end_time) return "incomplete";
    
    const hours = differenceInHours(new Date(shift.end_time), new Date(shift.start_time));
    if (hours >= 8) return "compliant";
    if (hours >= 6) return "partial";
    return "non-compliant";
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 animate-in fade-in">
            <CheckCircle className="h-3 w-3" />
            Compliant
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Partial
          </Badge>
        );
      case "non-compliant":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
            <XCircle className="h-3 w-3" />
            Non-Compliant
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Active
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Incomplete
          </Badge>
        );
    }
  };

  const getShiftDuration = (shift: Shift) => {
    const end = shift.end_time ? new Date(shift.end_time) : new Date();
    const minutes = differenceInMinutes(end, new Date(shift.start_time));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/women-dashboard")}>
                <Home className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Shift Compliance
                </h1>
                <p className="text-sm text-muted-foreground">Monitor your shift engagement</p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Active Shift Card */}
        <Card className={`overflow-hidden transition-all duration-500 ${activeShift ? 'ring-2 ring-primary shadow-lg shadow-primary/10' : ''}`}>
          <CardContent className="p-6">
            {activeShift ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Shift In Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        Started {format(new Date(activeShift.start_time), "h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-primary animate-pulse">
                      {elapsedTime}
                    </div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{activeShift.total_chats}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" /> Chats
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{activeShift.total_messages}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Messages
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500">₹{activeShift.earnings.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Earned
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={endShift} 
                  disabled={endingShift}
                  variant="destructive"
                  className="w-full h-12 gap-2"
                >
                  {endingShift ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {endingShift ? "Ending Shift..." : "End Shift"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Active Shift</h3>
                <p className="text-sm text-muted-foreground mb-6">Start a shift to begin tracking your work hours</p>
                <Button 
                  onClick={startShift} 
                  disabled={startingShift}
                  className="gap-2 h-12 px-8"
                >
                  {startingShift ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {startingShift ? "Starting..." : "Start Shift"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.totalShifts}</div>
            <div className="text-sm text-muted-foreground">Total Shifts</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.averageHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Avg Duration</div>
          </Card>
          <Card className="p-4">
            <div className={`text-2xl font-bold ${stats.complianceRate >= 80 ? 'text-emerald-500' : stats.complianceRate >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
              {stats.complianceRate.toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Compliance Rate</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-emerald-500">₹{stats.totalEarnings.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">Total Earnings</div>
          </Card>
        </div>

        {/* Compliance Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              Weekly Compliance Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">40 hours / week target</span>
                <span className="font-medium">{Math.min(stats.averageHours * stats.completedShifts, 40).toFixed(1)}h completed</span>
              </div>
              <Progress 
                value={Math.min((stats.averageHours * stats.completedShifts / 40) * 100, 100)} 
                className="h-3"
              />
              <p className="text-xs text-muted-foreground">
                {stats.complianceRate >= 80 
                  ? "✨ Great job! You're meeting compliance targets" 
                  : "Keep going to meet your weekly target"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shifts History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shift History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Chats</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift, index) => {
                    const complianceStatus = getComplianceStatus(shift);
                    return (
                      <TableRow 
                        key={shift.id}
                        className={`animate-in fade-in slide-in-from-left-2 ${
                          complianceStatus === "active" ? "bg-primary/5" : ""
                        }`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(new Date(shift.start_time), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(shift.start_time), "h:mm a")}
                          {shift.end_time && (
                            <span> - {format(new Date(shift.end_time), "h:mm a")}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {getShiftDuration(shift)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {shift.total_chats}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-emerald-500">
                          ₹{shift.earnings.toFixed(0)}
                        </TableCell>
                        <TableCell>
                          {getComplianceBadge(complianceStatus)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {shifts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No shifts recorded yet</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShiftComplianceScreen;