import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  RefreshCw, 
  Cpu, 
  HardDrive, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "sonner";

interface SystemMetric {
  id: string;
  cpu_usage: number;
  memory_usage: number;
  active_connections: number;
  response_time: number;
  disk_usage: number | null;
  network_in: number | null;
  network_out: number | null;
  error_rate: number | null;
  recorded_at: string;
}

interface SystemAlert {
  id: string;
  alert_type: string;
  metric_name: string;
  threshold_value: number;
  current_value: number;
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const chartConfig = {
  cpu: { label: "CPU", color: "hsl(var(--chart-1))" },
  memory: { label: "Memory", color: "hsl(var(--chart-2))" },
  connections: { label: "Connections", color: "hsl(var(--chart-3))" },
  responseTime: { label: "Response Time", color: "hsl(var(--chart-4))" },
};

const AdminPerformanceMonitoring = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("1h");
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetric | null>(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    loadData();
    
    // Set up live updates - refetch from database every 10 seconds
    const interval = setInterval(() => {
      if (isLive) {
        loadData(true); // silent refresh
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [timeRange, isLive]);

  const getTimeRangeMinutes = () => {
    switch (timeRange) {
      case "15m": return 15;
      case "1h": return 60;
      case "6h": return 360;
      case "24h": return 1440;
      default: return 60;
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const minutes = getTimeRangeMinutes();
      const startTime = new Date(Date.now() - minutes * 60 * 1000).toISOString();

      // Fetch real metrics from database
      const { data: metricsData, error: metricsError } = await supabase
        .from("system_metrics")
        .select("*")
        .gte("recorded_at", startTime)
        .order("recorded_at", { ascending: true })
        .limit(100);

      if (metricsError) throw metricsError;

      // Fetch real alerts from database
      const { data: alertsData, error: alertsError } = await supabase
        .from("system_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (alertsError) throw alertsError;

      const fetchedMetrics = metricsData || [];
      setMetrics(fetchedMetrics);
      
      // Set current metrics to the latest one
      if (fetchedMetrics.length > 0) {
        setCurrentMetrics(fetchedMetrics[fetchedMetrics.length - 1]);
      } else {
        // No data - show zeros
        setCurrentMetrics({
          id: '',
          cpu_usage: 0,
          memory_usage: 0,
          active_connections: 0,
          response_time: 0,
          disk_usage: 0,
          network_in: 0,
          network_out: 0,
          error_rate: 0,
          recorded_at: new Date().toISOString(),
        });
      }

      setAlerts(alertsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (!silent) {
        toast.error("Failed to load metrics: " + error.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("system_alerts")
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() }
          : a
      ));
      toast.success("Alert resolved");
    } catch (error: any) {
      toast.error("Failed to resolve alert: " + error.message);
    }
  };

  const getGaugeColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "text-destructive";
    if (value >= thresholds.warning) return "text-warning";
    return "text-success";
  };

  const getProgressColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "bg-destructive";
    if (value >= thresholds.warning) return "bg-warning";
    return "bg-success";
  };

  const formatChartData = () => {
    return metrics.map(m => ({
      time: new Date(m.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cpu: m.cpu_usage,
      memory: m.memory_usage,
      connections: m.active_connections,
      responseTime: m.response_time,
    }));
  };

  const GaugeCard = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    thresholds 
  }: { 
    title: string; 
    value: number; 
    unit: string; 
    icon: any;
    thresholds: { warning: number; critical: number };
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${getGaugeColor(value, thresholds)}`} />
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </div>
          <Badge 
            variant={value >= thresholds.critical ? "destructive" : value >= thresholds.warning ? "secondary" : "outline"}
            className="text-xs"
          >
            {value >= thresholds.critical ? "Critical" : value >= thresholds.warning ? "Warning" : "Normal"}
          </Badge>
        </div>
        <div className="space-y-3">
          <div className={`text-3xl font-bold ${getGaugeColor(value, thresholds)} transition-all duration-500`}>
            {value.toFixed(1)}{unit}
          </div>
          <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 ${getProgressColor(value, thresholds)} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
            <div 
              className="absolute inset-y-0 border-l-2 border-dashed border-amber-500 opacity-50"
              style={{ left: `${thresholds.warning}%` }}
            />
            <div 
              className="absolute inset-y-0 border-l-2 border-dashed border-destructive opacity-50"
              style={{ left: `${thresholds.critical}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Performance Monitoring</h1>
                <p className="text-sm text-muted-foreground">Real-time server & app metrics from database</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="gap-2"
              >
                {isLive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {isLive ? "Live" : "Paused"}
              </Button>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">Last 15m</SelectItem>
                  <SelectItem value="1h">Last 1h</SelectItem>
                  <SelectItem value="6h">Last 6h</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => loadData()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Live Indicator */}
        {isLive && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Live updates enabled (refreshes every 10s)
          </div>
        )}

        {/* No Data Message */}
        {metrics.length === 0 && (
          <Card className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Metrics Data</h3>
            <p className="text-muted-foreground">
              No system metrics have been recorded yet. Metrics will appear here once the system starts logging performance data.
            </p>
          </Card>
        )}

        {/* Gauge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GaugeCard
            title="CPU Usage"
            value={currentMetrics?.cpu_usage || 0}
            unit="%"
            icon={Cpu}
            thresholds={{ warning: 70, critical: 85 }}
          />
          <GaugeCard
            title="Memory Usage"
            value={currentMetrics?.memory_usage || 0}
            unit="%"
            icon={HardDrive}
            thresholds={{ warning: 75, critical: 90 }}
          />
          <GaugeCard
            title="Active Connections"
            value={currentMetrics?.active_connections || 0}
            unit=""
            icon={Users}
            thresholds={{ warning: 400, critical: 600 }}
          />
          <GaugeCard
            title="Response Time"
            value={currentMetrics?.response_time || 0}
            unit="ms"
            icon={Clock}
            thresholds={{ warning: 100, critical: 200 }}
          />
        </div>

        {/* Charts */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU & Memory Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  CPU & Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formatChartData()}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        stroke="hsl(var(--chart-1))"
                        fill="url(#cpuGradient)"
                        strokeWidth={2}
                        animationDuration={500}
                      />
                      <Area
                        type="monotone"
                        dataKey="memory"
                        stroke="hsl(var(--chart-2))"
                        fill="url(#memoryGradient)"
                        strokeWidth={2}
                        animationDuration={500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Response Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Response Time (ms)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatChartData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="responseTime"
                        stroke="hsl(var(--chart-4))"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Disk Usage</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {(currentMetrics?.disk_usage || 0).toFixed(1)}%
            </div>
            <Progress value={currentMetrics?.disk_usage || 0} className="mt-2 h-1.5" />
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Network In</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {(currentMetrics?.network_in || 0).toFixed(1)} MB/s
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Network Out</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {(currentMetrics?.network_out || 0).toFixed(1)} MB/s
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Error Rate</div>
            <div className={`text-2xl font-bold mt-1 ${(currentMetrics?.error_rate || 0) > 1 ? 'text-destructive' : 'text-success'}`}>
              {(currentMetrics?.error_rate || 0).toFixed(2)}%
            </div>
          </Card>
        </div>

        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              System Alerts
              {alerts.filter(a => !a.is_resolved).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {alerts.filter(a => !a.is_resolved).length} Active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p>No alerts - All systems operational</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${
                        alert.is_resolved
                          ? 'bg-muted/50 border-muted'
                          : alert.alert_type === 'critical'
                          ? 'bg-destructive/10 border-destructive/30'
                          : 'bg-warning/10 border-warning/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          {alert.is_resolved ? (
                            <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                          ) : alert.alert_type === 'critical' ? (
                            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.created_at).toLocaleString()}
                              {alert.is_resolved && alert.resolved_at && (
                                <span className="ml-2 text-success">
                                  • Resolved {new Date(alert.resolved_at).toLocaleString()}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {!alert.is_resolved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                            className="shrink-0"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPerformanceMonitoring;
