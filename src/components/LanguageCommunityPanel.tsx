import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Users, 
  Crown, 
  Vote, 
  MessageCircle, 
  Calendar, 
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Gavel,
  Video,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";

interface CommunityMember {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  isLeader: boolean;
  isElectionOfficer: boolean;
  voteCount: number;
  isOnline: boolean;
  joinedAt: string;
}

interface CommunityMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  message: string;
  createdAt: string;
  isAnnouncement: boolean;
}

interface LanguageCommunityPanelProps {
  currentUserId: string;
  motherTongue: string;
  userName: string;
  userPhoto: string | null;
}

export const LanguageCommunityPanel = ({
  currentUserId,
  motherTongue,
  userName,
  userPhoto
}: LanguageCommunityPanelProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isElectionActive, setIsElectionActive] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentLeader, setCurrentLeader] = useState<CommunityMember | null>(null);
  const [electionOfficer, setElectionOfficer] = useState<CommunityMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIssues, setPendingIssues] = useState(0);
  const [upcomingMeeting, setUpcomingMeeting] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load community data
  useEffect(() => {
    if (isOpen && motherTongue) {
      loadCommunityData();
      subscribeToUpdates();
    }
  }, [isOpen, motherTongue]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadCommunityData = async () => {
    setIsLoading(true);
    try {
      // Load members who speak the same language (women only)
      const { data: languageUsers } = await supabase
        .from("user_languages")
        .select("user_id, language_name")
        .eq("language_name", motherTongue);

      if (languageUsers && languageUsers.length > 0) {
        const userIds = languageUsers.map(u => u.user_id);

        // Get female profiles only
        const { data: femaleProfiles } = await supabase
          .from("female_profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", userIds);

        // Get online status
        const { data: onlineStatus } = await supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", userIds);

        const onlineMap = new Map(onlineStatus?.map(s => [s.user_id, s.is_online]) || []);

        // Get community leadership data (using app_settings as storage)
        const { data: leadershipData } = await supabase
          .from("app_settings")
          .select("setting_key, setting_value")
          .eq("category", "language_community")
          .in("setting_key", [
            `leader_${motherTongue}`,
            `election_officer_${motherTongue}`,
            `election_active_${motherTongue}`,
            `votes_${motherTongue}`
          ]);

        const settings = new Map(leadershipData?.map(s => [s.setting_key, s.setting_value]) || []);
        const leaderId = (settings.get(`leader_${motherTongue}`) as any)?.userId;
        const officerId = (settings.get(`election_officer_${motherTongue}`) as any)?.userId;
        const votes = (settings.get(`votes_${motherTongue}`) as any) || {};
        const electionActive = (settings.get(`election_active_${motherTongue}`) as any)?.active || false;

        setIsElectionActive(electionActive);
        setHasVoted(votes[currentUserId] ? true : false);

        // Build members list
        const membersList: CommunityMember[] = (femaleProfiles || []).map(p => ({
          userId: p.user_id,
          fullName: p.full_name || "Unknown",
          photoUrl: p.photo_url,
          isLeader: p.user_id === leaderId,
          isElectionOfficer: p.user_id === officerId,
          voteCount: Object.values(votes).filter(v => v === p.user_id).length,
          isOnline: onlineMap.get(p.user_id) || false,
          joinedAt: new Date().toISOString()
        }));

        // Sort: leader first, then election officer, then by online status
        membersList.sort((a, b) => {
          if (a.isLeader) return -1;
          if (b.isLeader) return 1;
          if (a.isElectionOfficer) return -1;
          if (b.isElectionOfficer) return 1;
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return 0;
        });

        setMembers(membersList);
        setCurrentLeader(membersList.find(m => m.isLeader) || null);
        setElectionOfficer(membersList.find(m => m.isElectionOfficer) || null);
      }

      // Load community messages (using group_messages table with language-based group)
      const { data: groupData } = await supabase
        .from("private_groups")
        .select("id")
        .eq("name", `language_community_${motherTongue}`)
        .maybeSingle();

      if (groupData) {
        const { data: messagesData } = await supabase
          .from("group_messages")
          .select("id, sender_id, message, created_at")
          .eq("group_id", groupData.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (messagesData) {
          // Get sender details
          const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
          const { data: senderProfiles } = await supabase
            .from("female_profiles")
            .select("user_id, full_name, photo_url")
            .in("user_id", senderIds);

          const senderMap = new Map(senderProfiles?.map(p => [p.user_id, p]) || []);

          setMessages(messagesData.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            senderName: senderMap.get(m.sender_id)?.full_name || "Unknown",
            senderPhoto: senderMap.get(m.sender_id)?.photo_url || null,
            message: m.message,
            createdAt: m.created_at,
            isAnnouncement: m.message.startsWith("[ANNOUNCEMENT]")
          })));
        }
      }

    } catch (error) {
      console.error("Error loading community data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`language-community-${motherTongue}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages' },
        () => loadCommunityData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Get or create community group
      let { data: groupData } = await supabase
        .from("private_groups")
        .select("id")
        .eq("name", `language_community_${motherTongue}`)
        .maybeSingle();

      if (!groupData) {
        const { data: newGroup } = await supabase
          .from("private_groups")
          .insert({
            name: `language_community_${motherTongue}`,
            description: `Community group for ${motherTongue} speakers`,
            owner_id: currentUserId,
            access_type: "language",
            is_active: true
          })
          .select("id")
          .single();
        groupData = newGroup;
      }

      if (groupData) {
        await supabase
          .from("group_messages")
          .insert({
            group_id: groupData.id,
            sender_id: currentUserId,
            message: newMessage
          });

        setNewMessage("");
        loadCommunityData();
      }
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('messageSendFailed', 'Failed to send message'),
        variant: "destructive"
      });
    }
  };

  const castVote = async (candidateId: string) => {
    if (hasVoted) {
      toast({
        title: t('alreadyVoted', 'Already Voted'),
        description: t('oneVoteOnly', 'You can only vote once per election'),
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current votes
      const { data: currentVotes } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", `votes_${motherTongue}`)
        .maybeSingle();

      const votes = (currentVotes?.setting_value as any) || {};
      votes[currentUserId] = candidateId;

      // Update votes
      await supabase
        .from("app_settings")
        .upsert({
          setting_key: `votes_${motherTongue}`,
          category: "language_community",
          setting_type: "json",
          setting_value: votes as any,
          is_public: false
        }, { onConflict: "setting_key" });

      setHasVoted(true);
      toast({
        title: t('voteRecorded', 'Vote Recorded'),
        description: t('thankYouVoting', 'Thank you for participating in the election!')
      });
      loadCommunityData();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('voteFailed', 'Failed to record vote'),
        variant: "destructive"
      });
    }
  };

  const startElection = async () => {
    if (!electionOfficer || electionOfficer.userId !== currentUserId) {
      toast({
        title: t('unauthorized', 'Unauthorized'),
        description: t('onlyElectionOfficer', 'Only the election officer can start elections'),
        variant: "destructive"
      });
      return;
    }

    try {
      // Clear previous votes and start new election
      await supabase
        .from("app_settings")
        .upsert([
          {
            setting_key: `election_active_${motherTongue}`,
            category: "language_community",
            setting_type: "json",
            setting_value: { active: true, startedAt: new Date().toISOString() } as any,
            is_public: false
          },
          {
            setting_key: `votes_${motherTongue}`,
            category: "language_community",
            setting_type: "json",
            setting_value: {} as any,
            is_public: false
          }
        ], { onConflict: "setting_key" });

      setIsElectionActive(true);
      setHasVoted(false);
      toast({
        title: t('electionStarted', 'Election Started'),
        description: t('membersCanVote', 'Community members can now vote for their leader')
      });
      loadCommunityData();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('electionStartFailed', 'Failed to start election'),
        variant: "destructive"
      });
    }
  };

  const endElection = async () => {
    if (!electionOfficer || electionOfficer.userId !== currentUserId) return;

    try {
      // Get votes and determine winner
      const { data: votesData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", `votes_${motherTongue}`)
        .maybeSingle();

      const votes = (votesData?.setting_value as any) || {};
      const voteCounts: Record<string, number> = {};
      
      Object.values(votes).forEach((candidateId: any) => {
        voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
      });

      // Find winner
      let winnerId = null;
      let maxVotes = 0;
      Object.entries(voteCounts).forEach(([id, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          winnerId = id;
        }
      });

      // Update leader
      await supabase
        .from("app_settings")
        .upsert([
          {
            setting_key: `leader_${motherTongue}`,
            category: "language_community",
            setting_type: "json",
            setting_value: { userId: winnerId, electedAt: new Date().toISOString() } as any,
            is_public: false
          },
          {
            setting_key: `election_active_${motherTongue}`,
            category: "language_community",
            setting_type: "json",
            setting_value: { active: false } as any,
            is_public: false
          }
        ], { onConflict: "setting_key" });

      setIsElectionActive(false);
      toast({
        title: t('electionEnded', 'Election Ended'),
        description: t('newLeaderElected', 'A new community leader has been elected!')
      });
      loadCommunityData();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('electionEndFailed', 'Failed to end election'),
        variant: "destructive"
      });
    }
  };

  const becomeElectionOfficer = async () => {
    if (electionOfficer) {
      toast({
        title: t('officerExists', 'Officer Exists'),
        description: t('electionOfficerAlreadyAssigned', 'An election officer is already assigned'),
        variant: "destructive"
      });
      return;
    }

    try {
      await supabase
        .from("app_settings")
        .upsert({
          setting_key: `election_officer_${motherTongue}`,
          category: "language_community",
          setting_type: "json",
          setting_value: { userId: currentUserId, assignedAt: new Date().toISOString() } as any,
          is_public: false
        }, { onConflict: "setting_key" });

      toast({
        title: t('success', 'Success'),
        description: t('youAreNowOfficer', 'You are now the election officer for this community')
      });
      loadCommunityData();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('assignmentFailed', 'Failed to assign election officer role'),
        variant: "destructive"
      });
    }
  };

  const MemberCard = ({ member }: { member: CommunityMember }) => (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      member.isLeader ? "bg-amber-500/10 border-amber-500/30" :
      member.isElectionOfficer ? "bg-purple-500/10 border-purple-500/30" :
      "bg-card border-border hover:bg-accent/50"
    )}>
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.photoUrl || ""} />
          <AvatarFallback>{member.fullName[0]}</AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{member.fullName}</span>
          {member.isLeader && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
              <Crown className="w-3 h-3 mr-1" /> {t('leader', 'Leader')}
            </Badge>
          )}
          {member.isElectionOfficer && (
            <Badge variant="outline" className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-xs">
              <Gavel className="w-3 h-3 mr-1" /> {t('officer', 'Officer')}
            </Badge>
          )}
        </div>
        {isElectionActive && member.voteCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {member.voteCount} {t('votes', 'votes')}
          </p>
        )}
      </div>
      {isElectionActive && !hasVoted && member.userId !== currentUserId && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => castVote(member.userId)}
          className="shrink-0"
        >
          <Vote className="w-4 h-4 mr-1" />
          {t('vote', 'Vote')}
        </Button>
      )}
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gradient-aurora border-primary/30 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{motherTongue} {t('community', 'Community')}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {members.length} {t('members', 'members')} • {members.filter(m => m.isOnline).length} {t('online', 'online')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentLeader && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <Crown className="w-3 h-3 mr-1" />
                    {currentLeader.fullName.split(" ")[0]}
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="chat" className="text-xs">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {t('chat', 'Chat')}
                </TabsTrigger>
                <TabsTrigger value="members" className="text-xs">
                  <Users className="w-4 h-4 mr-1" />
                  {t('members', 'Members')}
                </TabsTrigger>
                <TabsTrigger value="election" className="text-xs">
                  <Vote className="w-4 h-4 mr-1" />
                  {t('election', 'Election')}
                </TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat" className="mt-0">
                <div className="flex flex-col h-64">
                  <ScrollArea className="flex-1 pr-2">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{t('noMessages', 'No messages yet')}</p>
                          <p className="text-xs">{t('startConversation', 'Start the conversation!')}</p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div 
                            key={msg.id}
                            className={cn(
                              "flex gap-2",
                              msg.senderId === currentUserId ? "flex-row-reverse" : ""
                            )}
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={msg.senderPhoto || ""} />
                              <AvatarFallback className="text-xs">{msg.senderName[0]}</AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "max-w-[70%] rounded-lg px-3 py-2",
                              msg.isAnnouncement 
                                ? "bg-amber-500/20 border border-amber-500/30" 
                                : msg.senderId === currentUserId 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted"
                            )}>
                              <p className="text-xs font-medium mb-0.5">{msg.senderName}</p>
                              <p className="text-sm">{msg.message.replace("[ANNOUNCEMENT] ", "")}</p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('typeMessage', 'Type a message...')}
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button size="icon" onClick={sendMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="mt-0">
                <ScrollArea className="h-64 pr-2">
                  <div className="space-y-2">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('loading', 'Loading...')}
                      </div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('noMembersYet', 'No members yet')}</p>
                      </div>
                    ) : (
                      members.map((member) => (
                        <MemberCard key={member.userId} member={member} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Election Tab */}
              <TabsContent value="election" className="mt-0">
                <div className="space-y-4">
                  {/* Election Status */}
                  <div className={cn(
                    "p-4 rounded-lg border",
                    isElectionActive 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-muted border-border"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {isElectionActive ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {isElectionActive 
                          ? t('electionInProgress', 'Election in Progress') 
                          : t('noActiveElection', 'No Active Election')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isElectionActive 
                        ? t('castYourVote', 'Cast your vote for the next community leader')
                        : t('waitForElection', 'Wait for the election officer to start a new election')}
                    </p>
                    {hasVoted && isElectionActive && (
                      <Badge className="mt-2 bg-primary/20 text-primary">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('youHaveVoted', 'You have voted')}
                      </Badge>
                    )}
                  </div>

                  {/* Current Leadership */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium">{t('currentLeader', 'Current Leader')}</span>
                      </div>
                      {currentLeader ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={currentLeader.photoUrl || ""} />
                            <AvatarFallback>{currentLeader.fullName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{currentLeader.fullName}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('noLeaderYet', 'No leader yet')}</p>
                      )}
                    </div>

                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Gavel className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium">{t('electionOfficer', 'Election Officer')}</span>
                      </div>
                      {electionOfficer ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={electionOfficer.photoUrl || ""} />
                            <AvatarFallback>{electionOfficer.fullName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{electionOfficer.fullName}</span>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-1"
                          onClick={becomeElectionOfficer}
                        >
                          {t('becomeOfficer', 'Become Officer')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Election Controls (for election officer only) */}
                  {electionOfficer?.userId === currentUserId && (
                    <div className="flex gap-2">
                      {!isElectionActive ? (
                        <Button 
                          className="flex-1" 
                          onClick={startElection}
                          variant="aurora"
                        >
                          <Vote className="w-4 h-4 mr-2" />
                          {t('startElection', 'Start Election')}
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1" 
                          onClick={endElection}
                          variant="destructive"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {t('endElection', 'End Election')}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Leader Responsibilities */}
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      {t('leaderResponsibilities', 'Leader Responsibilities')}
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• {t('scheduleShifts', 'Schedule and coordinate shifts')}</li>
                      <li>• {t('resolveIssues', 'Resolve community issues')}</li>
                      <li>• {t('conductMeetings', 'Conduct internal meetings')}</li>
                      <li>• {t('bringNewMembers', 'Bring new members to the community')}</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default LanguageCommunityPanel;
