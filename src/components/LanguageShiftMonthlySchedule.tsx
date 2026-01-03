import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Calendar, 
  Clock, 
  Users, 
  MessageCircle, 
  Video, 
  Sun, 
  Moon, 
  Sunrise,
  RefreshCw,
  Globe,
  ChevronDown,
  ChevronRight,
  CalendarDays
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

interface LanguageShiftMonthlyScheduleProps {
  userId: string;
  language?: string;
}

const SHIFT_ICONS = {
  A: <Sunrise className="h-4 w-4" />,
  B: <Sun className="h-4 w-4" />,
  C: <Moon className="h-4 w-4" />
};

const SHIFT_COLORS = {
  A: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  B: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  C: "bg-indigo-500/20 text-indigo-700 border-indigo-500/30"
};

export default function LanguageShiftMonthlySchedule({ userId, language }: LanguageShiftMonthlyScheduleProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [expandedWomen, setExpandedWomen] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState<'current' | 'next'>('current');

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

  const toggleWomanExpand = (userId: string) => {
    setExpandedWomen(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!scheduleData) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
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

  const renderDayCell = (day: WomanDaySchedule) => {
    const isToday = new Date().toISOString().split('T')[0] === day.date;
    
    return (
      <div
        key={day.date}
        className={`p-1 text-center text-xs rounded ${
          day.is_rotation_day 
            ? 'bg-amber-500/20 border border-amber-500/30'
            : day.is_week_off 
              ? 'bg-muted/50 text-muted-foreground' 
              : isToday 
                ? 'bg-primary/20 border border-primary/30'
                : 'bg-card'
        }`}
        title={`${day.date}: ${day.is_week_off ? 'Week Off' : `${day.local_start_time} - ${day.local_end_time}`}`}
      >
        <div className="font-medium">{day.day}</div>
        <div className="text-[10px]">{day.day_name}</div>
        {day.is_week_off ? (
          <div className="text-[9px] text-muted-foreground">OFF</div>
        ) : (
          <Badge variant="outline" className={`text-[8px] px-0.5 py-0 ${SHIFT_COLORS[day.shift_code as keyof typeof SHIFT_COLORS]}`}>
            {day.shift_code}
          </Badge>
        )}
      </div>
    );
  };

  const renderWomanSchedule = (woman: WomanSchedule) => {
    const isExpanded = expandedWomen.has(woman.user_id);
    const monthData = selectedMonth === 'current' ? woman.current_month : woman.next_month;

    return (
      <Collapsible
        key={woman.user_id}
        open={isExpanded}
        onOpenChange={() => toggleWomanExpand(woman.user_id)}
      >
        <div className="border rounded-lg overflow-hidden mb-2">
          <CollapsibleTrigger className="w-full">
            <div className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={woman.photo_url || ''} />
                  <AvatarFallback className="text-xs">
                    {woman.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="font-medium text-sm">{woman.full_name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <span>{woman.country}</span>
                    <Badge variant="outline" className={`text-[10px] ${SHIFT_COLORS[woman.current_shift.code as keyof typeof SHIFT_COLORS]}`}>
                      {SHIFT_ICONS[woman.current_shift.code as keyof typeof SHIFT_ICONS]}
                      <span className="ml-1">{woman.current_shift.code}</span>
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {woman.role_type === 'chat' ? <MessageCircle className="h-2 w-2 mr-0.5" /> : <Video className="h-2 w-2 mr-0.5" />}
                      {woman.role_type}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-xs text-muted-foreground hidden sm:block">
                  <div>{woman.current_shift.local_start_time} - {woman.current_shift.local_end_time}</div>
                  <div>Off: {woman.week_off_days.map(d => d.substring(0, 3)).join(', ')}</div>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-3 pt-0 border-t">
              {/* Shift Info */}
              <div className="mb-3 p-2 rounded bg-muted/30 text-xs">
                <div className="flex flex-wrap gap-2">
                  <span className="font-medium">{woman.current_shift.name}</span>
                  <span>•</span>
                  <span>{woman.current_shift.display}</span>
                  <span>•</span>
                  <span>Local: {woman.current_shift.local_start_time} - {woman.current_shift.local_end_time}</span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  Weekly Off: {woman.week_off_days.join(', ')}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="text-xs font-medium mb-2">{monthData.name}</div>
              <div className="grid grid-cols-7 gap-1">
                {monthData.days.map(renderDayCell)}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {scheduleData.language} Team Schedule
          </div>
          <Button variant="ghost" size="sm" onClick={loadSchedule}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-secondary/20 border border-border/50 text-center">
            <div className="text-2xl font-bold">{scheduleData.total_women}</div>
            <div className="text-xs text-muted-foreground">Total Women</div>
          </div>
          <div className={`p-3 rounded-lg ${SHIFT_COLORS.A} text-center`}>
            <div className="text-2xl font-bold">{scheduleData.shifts.A.women_count}</div>
            <div className="text-xs">Shift A (7AM-4PM)</div>
          </div>
          <div className={`p-3 rounded-lg ${SHIFT_COLORS.B} text-center`}>
            <div className="text-2xl font-bold">{scheduleData.shifts.B.women_count}</div>
            <div className="text-xs">Shift B (3PM-12AM)</div>
          </div>
          <div className={`p-3 rounded-lg ${SHIFT_COLORS.C} text-center`}>
            <div className="text-2xl font-bold">{scheduleData.shifts.C.women_count}</div>
            <div className="text-xs">Shift C (11PM-8AM)</div>
          </div>
        </div>

        {/* Rotation Notice */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-700">
              Next Rotation: {scheduleData.rotation.days_until} days
            </span>
            <span className="text-amber-600/80">({scheduleData.rotation.rule})</span>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex gap-2">
          <Button
            variant={selectedMonth === 'current' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonth('current')}
          >
            {scheduleData.current_month.name} ({scheduleData.current_month.days_remaining} days left)
          </Button>
          <Button
            variant={selectedMonth === 'next' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonth('next')}
          >
            {scheduleData.next_month.name}
          </Button>
        </div>

        {/* All Women Calendar */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {scheduleData.all_women.length > 0 ? (
              scheduleData.all_women.map(renderWomanSchedule)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No women in the system
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
