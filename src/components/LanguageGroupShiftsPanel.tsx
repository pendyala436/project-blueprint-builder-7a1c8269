import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, 
  Users, 
  Globe, 
  Calendar, 
  RefreshCw, 
  Sun, 
  Moon,
  Sunrise,
  Sunset,
  CheckCircle2,
  XCircle,
  Coffee
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WomanShift {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  country: string;
  language: string;
  todayShift: {
    startTime: string;
    endTime: string;
    status: string;
  } | null;
  isWeekOff: boolean;
  weekOffDays: string[];
  shiftHours: {
    startHour: number;
    endHour: number;
    duration: number;
  };
}

interface HourlyCoverage {
  hour: number;
  womenOnDuty: string[];
  shiftCodes?: string[];
}

interface ShiftConfig {
  hours: number;
  changeBuffer: number;
  weekOffInterval: number;
  shifts?: {
    A: { name: string; start: number; end: number; code: string; display: string };
    B: { name: string; start: number; end: number; code: string; display: string };
    C: { name: string; start: number; end: number; code: string; display: string };
  };
}

interface LanguageGroupShiftsPanelProps {
  userId: string;
  language?: string;
  compact?: boolean;
}

const LanguageGroupShiftsPanel = ({ userId, language, compact = false }: LanguageGroupShiftsPanelProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [womenShifts, setWomenShifts] = useState<WomanShift[]>([]);
  const [coverage24x7, setCoverage24x7] = useState<HourlyCoverage[]>([]);
  const [targetLanguage, setTargetLanguage] = useState(language || "");
  const [womenCount, setWomenCount] = useState(0);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);

  useEffect(() => {
    if (userId) {
      fetchLanguageGroupShifts();
    }
  }, [userId, language]);

  const fetchLanguageGroupShifts = async () => {
    setIsLoading(true);
    try {
      // Use shift-auto-scheduler for consistency with monthly schedule
      const { data, error } = await supabase.functions.invoke("shift-auto-scheduler", {
        body: { 
          action: "get_language_group_schedule",
          userId, 
          data: { language: language || undefined }
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Transform data from shift-auto-scheduler format
        const womenData = data.women || [];
        const transformedWomen: WomanShift[] = womenData.map((woman: any) => ({
          userId: woman.user_id,
          fullName: woman.full_name || 'Unknown',
          photoUrl: woman.photo_url,
          country: woman.country || 'Unknown',
          language: data.language || language || 'Unknown',
          todayShift: woman.today_on_duty ? {
            startTime: woman.local_start_time || '00:00',
            endTime: woman.local_end_time || '00:00',
            status: 'scheduled'
          } : null,
          isWeekOff: woman.is_week_off_today || false,
          weekOffDays: woman.week_off_days || [],
          shiftHours: {
            startHour: woman.shift_start_hour || 7,
            endHour: woman.shift_end_hour || 16,
            duration: 9
          }
        }));

        setWomenShifts(transformedWomen);
        setTargetLanguage(data.language || language || "");
        setWomenCount(data.total_women || womenData.length);
        
        // Build 24x7 coverage from women's shift data
        const coverage: HourlyCoverage[] = [];
        for (let hour = 0; hour < 24; hour++) {
          const womenOnDuty: string[] = [];
          const shiftCodes: string[] = [];
          
          womenData.forEach((woman: any) => {
            if (woman.is_week_off_today) return;
            
            const shiftStart = woman.shift_start_hour || 0;
            const shiftEnd = woman.shift_end_hour || 0;
            
            // Handle overnight shifts
            let isOnDuty = false;
            if (shiftEnd < shiftStart) {
              // Overnight shift (e.g., 23-8)
              isOnDuty = hour >= shiftStart || hour < shiftEnd;
            } else {
              isOnDuty = hour >= shiftStart && hour < shiftEnd;
            }
            
            if (isOnDuty) {
              womenOnDuty.push(woman.full_name?.split(' ')[0] || 'User');
              if (woman.shift_code && !shiftCodes.includes(woman.shift_code)) {
                shiftCodes.push(woman.shift_code);
              }
            }
          });
          
          coverage.push({ hour, womenOnDuty, shiftCodes });
        }
        
        setCoverage24x7(coverage);
        setShiftConfig({
          hours: 9,
          changeBuffer: 1,
          weekOffInterval: 2,
          shifts: data.shifts || {
            A: { name: 'Shift A (Morning)', start: 7, end: 16, code: 'A', display: '7:00 AM - 4:00 PM' },
            B: { name: 'Shift B (Evening)', start: 15, end: 24, code: 'B', display: '3:00 PM - 12:00 AM' },
            C: { name: 'Shift C (Night)', start: 23, end: 8, code: 'C', display: '11:00 PM - 8:00 AM' }
          }
        });
      }
    } catch (error) {
      console.error("Error fetching language group shifts:", error);
      toast({
        title: "Error",
        description: "Failed to load shift schedule",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getTimeIcon = (hour: number) => {
    if (hour >= 6 && hour < 12) return <Sunrise className="w-3 h-3 text-warning" />;
    if (hour >= 12 && hour < 18) return <Sun className="w-3 h-3 text-crown" />;
    if (hour >= 18 && hour < 21) return <Sunset className="w-3 h-3 text-warning" />;
    return <Moon className="w-3 h-3 text-info" />;
  };

  const getCoverageColor = (count: number, shiftCodes?: string[]) => {
    if (count === 0) return "bg-destructive/20 text-destructive";
    if (count === 1) return "bg-warning/20 text-warning";
    if (count === 2) return "bg-success/20 text-success";
    return "bg-primary/20 text-primary";
  };

  const getShiftBadgeColor = (shiftCode: string) => {
    switch (shiftCode) {
      case 'A': return "bg-info/20 text-info border-info/30";
      case 'B': return "bg-warning/20 text-warning border-warning/30";
      case 'C': return "bg-secondary/20 text-secondary-foreground border-secondary/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getShiftIcon = (shiftCode: string) => {
    switch (shiftCode) {
      case 'A': return <Sunrise className="w-3 h-3 text-info" />;
      case 'B': return <Sunset className="w-3 h-3 text-warning" />;
      case 'C': return <Moon className="w-3 h-3 text-secondary-foreground" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const currentHour = new Date().getHours();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {targetLanguage} Team ({womenCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {womenShifts.slice(0, 5).map(woman => (
              <div key={woman.userId} className="flex items-center gap-1 bg-background/50 rounded-full px-2 py-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={woman.photoUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {woman.fullName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{woman.fullName?.split(" ")[0]}</span>
                {woman.todayShift && !woman.isWeekOff ? (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                ) : woman.isWeekOff ? (
                  <Coffee className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <XCircle className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            ))}
            {womenCount > 5 && (
              <Badge variant="secondary" className="text-xs">+{womenCount - 5} more</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {targetLanguage} Speakers - 24/7 Coverage
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchLanguageGroupShifts}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {womenCount} women covering shifts • AI-managed scheduling
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Women List with Their Shifts */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members & Shifts
          </h4>
          <ScrollArea className="h-64">
            <div className="space-y-2 pr-2">
              {womenShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No women in this language group yet
                </p>
              ) : (
                womenShifts.map(woman => (
                  <div 
                    key={woman.userId} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-background">
                        <AvatarImage src={woman.photoUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {woman.fullName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{woman.fullName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {woman.country}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {woman.isWeekOff ? (
                        <Badge variant="secondary" className="gap-1">
                          <Coffee className="w-3 h-3" />
                          Week Off
                        </Badge>
                      ) : woman.todayShift ? (
                        <div>
                          <Badge variant="default" className="gap-1 bg-success hover:bg-success/80">
                            <Clock className="w-3 h-3" />
                            {woman.todayShift.startTime.slice(0, 5)} - {woman.todayShift.endTime.slice(0, 5)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {woman.shiftHours.duration}h shift
                          </p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No shift today
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Shift Timings Legend */}
        {shiftConfig?.shifts && (
          <div className="mb-4 p-3 rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Shift Timings (9hr shifts with 1hr overlap)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.values(shiftConfig.shifts).map((shift) => (
                <div key={shift.code} className={`flex items-center gap-2 p-2 rounded-md border ${getShiftBadgeColor(shift.code)}`}>
                  {getShiftIcon(shift.code)}
                  <div>
                    <span className="font-medium text-xs">Shift {shift.code}</span>
                    <p className="text-[10px] opacity-80">{shift.display}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 24/7 Coverage Timeline */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Today's 24/7 Coverage
          </h4>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">
            {coverage24x7.map(({ hour, womenOnDuty, shiftCodes }) => (
              <div 
                key={hour}
                className={`
                  relative p-2 rounded-md text-center cursor-default
                  ${getCoverageColor(womenOnDuty.length, shiftCodes)}
                  ${hour === currentHour ? "ring-2 ring-primary ring-offset-1" : ""}
                `}
                title={`${formatTime(hour)}${shiftCodes?.length ? ` [${shiftCodes.join('+')}]` : ''}: ${womenOnDuty.length > 0 ? womenOnDuty.join(", ") : "No coverage"}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  {shiftCodes && shiftCodes.length > 0 ? (
                    <div className="flex gap-0.5">
                      {shiftCodes.map(code => (
                        <span key={code} className="text-[8px] font-bold">{code}</span>
                      ))}
                    </div>
                  ) : (
                    getTimeIcon(hour)
                  )}
                  <span className="text-[10px] font-medium">{hour}</span>
                  <span className="text-[10px]">{womenOnDuty.length}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-destructive/20" />
              <span>No coverage</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500/20" />
              <span>1 woman</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-success/20" />
              <span>2 women</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary/20" />
              <span>3+ women</span>
            </div>
          </div>
        </div>

        {/* Week Off Summary */}
        {womenShifts.some(w => w.weekOffDays.length > 0) && (
          <div className="pt-2 border-t border-border/50">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Coffee className="w-4 h-4" />
              Week Off Pattern
            </h4>
            <p className="text-xs text-muted-foreground">
              AI assigns week offs every 2 days based on registration date. 
              Women can optionally work on their week off.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LanguageGroupShiftsPanel;
