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

interface SystemMetric {
  id: string;
  cpu_usage: number;
  memory_usage: number;
  active_connections: number;
  response_time: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  error_rate: number;
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
    
    // Simulate live updates
    const interval = setInterval(() => {
      if (isLive) {
        generateMockMetrics();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [timeRange, isLive]);

  const generateMockMetrics = () => {
    const newMetric: SystemMetric = {
      id: crypto.randomUUID(),
      cpu_usage: Math.random() * 40 + 30,
      memory_usage: Math.random() * 30 + 50,
      active_connections: Math.floor(Math.random() * 500 + 100),
      response_time: Math.random() * 100 + 50,
      disk_usage: Math.random() * 20 + 60,
      network_in: Math.random() * 100,
      network_out: Math.random() * 80,
      error_rate: Math.random() * 2,
      recorded_at: new Date().toISOString(),
    };

    setCurrentMetrics(newMetric);
    setMetrics(prev => {
      const updated = [...prev, newMetric].slice(-20);
      return updated;
    });

    // Generate alerts if thresholds exceeded
    if (newMetric.cpu_usage > 80) {
      const alert: SystemAlert = {
        id: crypto.randomUUID(),
        alert_type: 'critical',
        metric_name: 'CPU Usage',
        threshold_value: 80,
        current_value: newMetric.cpu_usage,
        message: `CPU usage exceeded 80% (current: ${newMetric.cpu_usage.toFixed(1)}%)`,
        is_resolved: false,
        resolved_at: null,
        created_at: new Date().toISOString(),
      };
      setAlerts(prev => [alert, ...prev].slice(0, 10));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Generate initial mock data
      const mockMetrics: SystemMetric[] = [];
      const now = new Date();
      
      for (let i = 19; i >= 0; i--) {
        mockMetrics.push({
          id: crypto.randomUUID(),
          cpu_usage: Math.random() * 40 + 30,
          memory_usage: Math.random() * 30 + 50,
          active_connections: Math.floor(Math.random() * 500 + 100),
          response_time: Math.random() * 100 + 50,
          disk_usage: Math.random() * 20 + 60,
          network_in: Math.random() * 100,
          network_out: Math.random() * 80,
          error_rate: Math.random() * 2,
          recorded_at: new Date(now.getTime() - i * 60000).toISOString(),
        });
      }

      setMetrics(mockMetrics);
      setCurrentMetrics(mockMetrics[mockMetrics.length - 1]);

      // Mock alerts
      const mockAlerts: SystemAlert[] = [
        {
          id: '1',
          alert_type: 'warning',
          metric_name: 'Memory Usage',
          threshold_value: 75,
          current_value: 78,
          message: 'Memory usage approaching critical threshold',
          is_resolved: false,
          resolved_at: null,
          created_at: new Date(now.getTime() - 5 * 60000).toISOString(),
        },
        {
          id: '2',
          alert_type: 'info',
          metric_name: 'Active Connections',
          threshold_value: 400,
          current_value: 420,
          message: 'Connection count higher than usual',
          is_resolved: true,
          resolved_at: new Date(now.getTime() - 2 * 60000).toISOString(),
          created_at: new Date(now.getTime() - 30 * 60000).toISOString(),
        },
      ];
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() }
        : a
    ));
  };

  const getGaugeColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "text-destructive";
    if (value >= thresholds.warning) return "text-amber-500";
    return "text-emerald-500";
  };

  const getProgressColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "bg-destructive";
    if (value >= thresholds.warning) return "bg-amber-500";
    return "bg-emerald-500";
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
              <Button variant="auroraGhost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Performance Monitoring</h1>
                <p className="text-sm text-muted-foreground">Real-time server & app metrics</p>
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
              <Button variant="outline" size="icon" onClick={loadData}>
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live updates enabled
          </div>
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

        {/* Additional Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Disk Usage</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {currentMetrics?.disk_usage?.toFixed(1) || 0}%
            </div>
            <Progress value={currentMetrics?.disk_usage || 0} className="mt-2 h-1.5" />
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Network In</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {currentMetrics?.network_in?.toFixed(1) || 0} MB/s
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Network Out</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {currentMetrics?.network_out?.toFixed(1) || 0} MB/s
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Error Rate</div>
            <div className={`text-2xl font-bold mt-1 ${(currentMetrics?.error_rate || 0) > 1 ? 'text-destructive' : 'text-emerald-500'}`}>
              {currentMetrics?.error_rate?.toFixed(2) || 0}%
            </div>
          </Card>
        </div>

        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              System Alerts
              {alerts.filter(a => !a.is_resolved).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {alerts.filter(a => !a.is_resolved).length} Active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                  <p>No alerts at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border transition-all ${
                        alert.is_resolved 
                          ? 'bg-muted/50 border-muted opacity-60' 
                          : alert.alert_type === 'critical' 
                            ? 'bg-destructive/10 border-destructive/30' 
                            : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {alert.is_resolved ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                          ) : alert.alert_type === 'critical' ? (
                            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                          )}
                          <div>
                            <div className="font-medium text-foreground">{alert.metric_name}</div>
                            <div className="text-sm text-muted-foreground">{alert.message}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.created_at).toLocaleString()}
                              {alert.is_resolved && alert.resolved_at && (
                                <span className="ml-2">
                                  • Resolved at {new Date(alert.resolved_at).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!alert.is_resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
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