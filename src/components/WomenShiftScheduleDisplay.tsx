import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  Clock, 
  Users, 
  MessageCircle, 
  Video, 
  Sun, 
  Moon, 
  Sunrise,
  CalendarCheck,
  CalendarX,
  RefreshCw,
  Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

interface ShiftAssignment {
  shift_code: string;
  shift_name: string;
  shift_display: string;
  start_time: string;
  end_time: string;
  local_start_time: string;
  local_end_time: string;
  week_off_days: string[];
  role_type: string;
}

interface ScheduleEntry {
  scheduled_date: string;
  shift_code: string;
  shift_name: string;
  shift_display: string;
  day_of_week: string;
  is_week_off: boolean;
  local_start_time: string;
  local_end_time: string;
  timezone_name: string;
  month_label: string;
  month_name: string;
  is_rotation_day: boolean;
}

interface RotationInfo {
  next_rotation_date: string;
  days_until_rotation: number;
  current_shift: string;
  next_shift: string;
  rotation_rule: string;
}

interface GroupShiftData {
  name: string;
  time: string;
  overlap: string;
  chat_support: WomanInShift[];
  video_support: WomanInShift[];
}

interface WomanInShift {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  country: string | null;
  is_week_off: boolean;
  week_off_days: string[];
  local_start_time: string;
  local_end_time: string;
  timezone_name: string;
}

interface WomenShiftScheduleDisplayProps {
  userId: string;
  compact?: boolean;
}

const SHIFT_ICONS = {
  A: <Sunrise className="h-4 w-4" />,
  B: <Sun className="h-4 w-4" />,
  C: <Moon className="h-4 w-4" />
};

const SHIFT_COLORS = {
  A: "bg-crown/20 text-crown border-crown/30",
  B: "bg-warning/20 text-warning border-warning/30",
  C: "bg-info/20 text-info border-info/30"
};

export default function WomenShiftScheduleDisplay({ userId, compact = false }: WomenShiftScheduleDisplayProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [myAssignment, setMyAssignment] = useState<ShiftAssignment | null>(null);
  const [mySchedules, setMySchedules] = useState<ScheduleEntry[]>([]);
  const [rotationInfo, setRotationInfo] = useState<RotationInfo | null>(null);
  const [groupSchedule, setGroupSchedule] = useState<{
    language: string;
    total_women: number;
    shifts: {
      A: GroupShiftData;
      B: GroupShiftData;
      C: GroupShiftData;
    };
    rotation: {
      next_rotation_date: string;
      days_until_rotation: number;
      rotation_rule: string;
    };
  } | null>(null);
  const [profileInfo, setProfileInfo] = useState<{
    full_name: string;
    country: string;
    language: string;
    timezone_offset: number;
  } | null>(null);

  useEffect(() => {
    if (userId) {
      loadScheduleData();
    }
  }, [userId]);

  const loadScheduleData = async () => {
    setIsLoading(true);
    try {
      // Get my schedule
      const { data: myData, error: myError } = await supabase.functions.invoke('shift-auto-scheduler', {
        body: { action: 'get_my_schedule', userId }
      });

      if (myError) throw myError;

      if (myData?.success) {
        setMyAssignment(myData.assignment);
        setMySchedules(myData.schedules || []);
        setProfileInfo(myData.profile);
        setRotationInfo(myData.rotation);
      } else if (myData?.assignment === undefined) {
        await assignInitialShift();
      }

      // Get language group schedule
      const { data: groupData, error: groupError } = await supabase.functions.invoke('shift-auto-scheduler', {
        body: { action: 'get_language_group_schedule', userId }
      });

      if (!groupError && groupData?.success) {
        setGroupSchedule(groupData);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignInitialShift = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shift-auto-scheduler', {
        body: { action: 'assign_initial_shift', userId }
      });

      if (error) throw error;

      if (data?.success) {
        setMyAssignment(data.assignment);
        toast({
          title: "Shift Assigned",
          description: `You've been assigned to ${data.assignment.shift_name}`,
        });
        // Reload full data
        loadScheduleData();
      }
    } catch (error) {
      console.error('Error assigning shift:', error);
    }
  };

  const handleOptInWork = async (date: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shift-auto-scheduler', {
        body: { action: 'opt_in_work_on_off_day', userId, data: { date } }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Work Scheduled",
          description: data.message,
        });
        loadScheduleData();
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to schedule work",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error opting in:', error);
      toast({
        title: "Error",
        description: "Failed to schedule work on off day",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            My Shift Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myAssignment ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={SHIFT_COLORS[myAssignment.shift_code as keyof typeof SHIFT_COLORS]}>
                  {SHIFT_ICONS[myAssignment.shift_code as keyof typeof SHIFT_ICONS]}
                  <span className="ml-1">{myAssignment.shift_name}</span>
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {myAssignment.role_type === 'chat' ? (
                    <><MessageCircle className="h-3 w-3 mr-1" /> Chat Support</>
                  ) : (
                    <><Video className="h-3 w-3 mr-1" /> Video Support</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{myAssignment.local_start_time} - {myAssignment.local_end_time}</span>
                <Globe className="h-3 w-3 ml-2" />
                <span>{profileInfo?.country || 'IST'}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarX className="h-3 w-3" />
                <span>Off: {myAssignment.week_off_days.join(', ')}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm mb-2">No shift assigned yet</p>
              <Button size="sm" onClick={assignInitialShift}>
                <RefreshCw className="h-3 w-3 mr-1" /> Get Assigned
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Shift Schedule
          </div>
          <Button variant="ghost" size="sm" onClick={loadScheduleData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="my-schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="team-schedule">Team Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="my-schedule" className="mt-4 space-y-4">
            {myAssignment ? (
              <>
                {/* Current Assignment Card */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${SHIFT_COLORS[myAssignment.shift_code as keyof typeof SHIFT_COLORS]}`}>
                        {SHIFT_ICONS[myAssignment.shift_code as keyof typeof SHIFT_ICONS]}
                      </div>
                      <div>
                        <h3 className="font-semibold">{myAssignment.shift_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {myAssignment.shift_display || `${myAssignment.local_start_time} - ${myAssignment.local_end_time}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {myAssignment.role_type === 'chat' ? (
                        <><MessageCircle className="h-3 w-3 mr-1" /> Chat</>
                      ) : (
                        <><Video className="h-3 w-3 mr-1" /> Video</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>{profileInfo?.country || 'India'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{profileInfo?.language}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CalendarX className="h-3 w-3" />
                      <span>Off: {myAssignment.week_off_days.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Rotation Notice */}
                {rotationInfo && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-2">
                      <RefreshCw className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-700">Next Rotation: {format(new Date(rotationInfo.next_rotation_date), 'MMM d, yyyy')}</p>
                        <p className="text-amber-600/80">
                          {rotationInfo.days_until_rotation} days away • Your shift: {rotationInfo.current_shift} → {rotationInfo.next_shift}
                        </p>
                        <p className="text-xs text-amber-600/60 mt-1">Rule: {rotationInfo.rotation_rule}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upcoming Schedule - Grouped by Month */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" />
                    Schedule (This Month & Next)
                  </h4>
                  <ScrollArea className="h-72">
                    <div className="space-y-4">
                      {/* Group schedules by month */}
                      {['This Month', 'Next Month'].map((monthLabel) => {
                        const monthSchedules = mySchedules.filter(s => s.month_label === monthLabel);
                        if (monthSchedules.length === 0) return null;
                        
                        return (
                          <div key={monthLabel}>
                            <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 mb-2 border-b border-border/50">
                              <Badge variant="outline" className="text-xs">
                                {monthSchedules[0]?.month_name || monthLabel}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {monthSchedules.map((schedule, index) => {
                                const scheduleDate = new Date(schedule.scheduled_date);
                                const isToday = isSameDay(scheduleDate, new Date());
                                
                                return (
                                  <div 
                                    key={index}
                                    className={`p-3 rounded-lg border ${
                                      schedule.is_rotation_day 
                                        ? 'bg-amber-500/10 border-amber-500/30'
                                        : isToday 
                                          ? 'bg-primary/10 border-primary/30' 
                                          : schedule.is_week_off 
                                            ? 'bg-muted/50 border-border/30' 
                                            : 'bg-card border-border/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="text-center min-w-[50px]">
                                          <div className="text-lg font-bold">
                                            {format(scheduleDate, 'd')}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {format(scheduleDate, 'MMM')}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="font-medium flex items-center gap-2">
                                            {schedule.day_of_week}
                                            {isToday && <Badge variant="default" className="text-xs">Today</Badge>}
                                            {schedule.is_rotation_day && (
                                              <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-700 border-amber-500/30">
                                                <RefreshCw className="h-2 w-2 mr-1" />
                                                Rotation Day
                                              </Badge>
                                            )}
                                          </div>
                                          {schedule.is_week_off ? (
                                            <span className="text-sm text-muted-foreground">Week Off</span>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className={`text-xs ${SHIFT_COLORS[schedule.shift_code as keyof typeof SHIFT_COLORS]}`}>
                                                {schedule.shift_code}
                                              </Badge>
                                              <span className="text-sm text-muted-foreground">
                                                {schedule.shift_display || `${schedule.local_start_time} - ${schedule.local_end_time}`}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {schedule.is_week_off && (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleOptInWork(schedule.scheduled_date)}
                                        >
                                          Work This Day
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Shift Assigned</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven't been assigned to a shift yet. Click below to get auto-assigned based on your language group.
                </p>
                <Button onClick={assignInitialShift}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Auto-Assign Shift
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="team-schedule" className="mt-4">
            {groupSchedule ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">{groupSchedule.language} Team</span>
                  </div>
                  <Badge variant="outline">{groupSchedule.total_women} members</Badge>
                </div>

                {/* Shift Timing Summary */}
                <div className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Shift Timings (9 hours each, 1 hour overlap)
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className={`p-2 rounded ${SHIFT_COLORS.A}`}>
                      <div className="font-medium">A: Morning</div>
                      <div>7 AM - 4 PM</div>
                    </div>
                    <div className={`p-2 rounded ${SHIFT_COLORS.B}`}>
                      <div className="font-medium">B: Evening</div>
                      <div>3 PM - 12 AM</div>
                    </div>
                    <div className={`p-2 rounded ${SHIFT_COLORS.C}`}>
                      <div className="font-medium">C: Night</div>
                      <div>11 PM - 8 AM</div>
                    </div>
                  </div>
                </div>

                {(['A', 'B', 'C'] as const).map((shiftCode) => {
                  const shift = groupSchedule.shifts[shiftCode];
                  const totalInShift = shift.chat_support.length + shift.video_support.length;
                  
                  return (
                    <div key={shiftCode} className="border rounded-lg overflow-hidden">
                      <div className={`p-3 ${SHIFT_COLORS[shiftCode]} border-b`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {SHIFT_ICONS[shiftCode]}
                            <span className="font-medium">{shift.name}</span>
                          </div>
                          <span className="text-sm">{shift.time}</span>
                        </div>
                        {shift.overlap && (
                          <p className="text-xs mt-1 opacity-75">{shift.overlap}</p>
                        )}
                      </div>
                      
                      {totalInShift > 0 ? (
                        <div className="p-3 grid grid-cols-2 gap-4">
                          {/* Chat Support */}
                          <div>
                            <div className="flex items-center gap-1 mb-2 text-sm text-muted-foreground">
                              <MessageCircle className="h-3 w-3" />
                              <span>Chat ({shift.chat_support.length})</span>
                            </div>
                            <div className="space-y-2">
                              {shift.chat_support.map((woman) => (
                                <div 
                                  key={woman.user_id}
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    woman.is_week_off ? 'bg-muted/50 opacity-60' : 'bg-card'
                                  }`}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={woman.photo_url || ''} />
                                    <AvatarFallback className="text-xs">
                                      {woman.full_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{woman.full_name}</p>
                                    {woman.is_week_off && (
                                      <p className="text-xs text-muted-foreground">Off today</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Video Support */}
                          <div>
                            <div className="flex items-center gap-1 mb-2 text-sm text-muted-foreground">
                              <Video className="h-3 w-3" />
                              <span>Video ({shift.video_support.length})</span>
                            </div>
                            <div className="space-y-2">
                              {shift.video_support.map((woman) => (
                                <div 
                                  key={woman.user_id}
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    woman.is_week_off ? 'bg-muted/50 opacity-60' : 'bg-card'
                                  }`}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={woman.photo_url || ''} />
                                    <AvatarFallback className="text-xs">
                                      {woman.full_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{woman.full_name}</p>
                                    {woman.is_week_off && (
                                      <p className="text-xs text-muted-foreground">Off today</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No team members in this shift
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Monthly Rotation Notice with Countdown */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <RefreshCw className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700">Monthly Rotation on 28th</p>
                      <p className="text-amber-600/80">
                        {groupSchedule.rotation?.days_until_rotation} days until next rotation
                      </p>
                      <p className="text-xs text-amber-600/60 mt-1">
                        {groupSchedule.rotation?.rotation_rule}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team schedule available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
