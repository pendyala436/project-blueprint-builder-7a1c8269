import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Crown, 
  Vote, 
  MessageCircle, 
  Calendar, 
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
  Clock,
  Shield,
  Gavel,
  X,
  Plus,
  UserPlus,
  CalendarClock,
  Trophy
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
  isCandidate: boolean;
  voteCount: number;
  isOnline: boolean;
  joinedAt: string;
  seniority: number; // days since joining
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

interface ElectionData {
  active: boolean;
  scheduledAt?: string;
  startedAt?: string;
  endsAt?: string;
  candidates: string[];
  officerVote?: string; // Officer's tiebreaker vote
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
  const [electionData, setElectionData] = useState<ElectionData>({ active: false, candidates: [] });
  const [hasVoted, setHasVoted] = useState(false);
  const [currentLeader, setCurrentLeader] = useState<CommunityMember | null>(null);
  const [electionOfficer, setElectionOfficer] = useState<CommunityMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Election creation dialog
  const [showCreateElectionDialog, setShowCreateElectionDialog] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Tiebreaker dialog
  const [showTiebreakerDialog, setShowTiebreakerDialog] = useState(false);
  const [tiedCandidates, setTiedCandidates] = useState<CommunityMember[]>([]);

  const isElectionOfficer = electionOfficer?.userId === currentUserId;
  const isCandidate = electionData.candidates.includes(currentUserId);

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
        .select("user_id, language_name, created_at")
        .eq("language_name", motherTongue);

      if (languageUsers && languageUsers.length > 0) {
        const userIds = languageUsers.map(u => u.user_id);
        const joinDates = new Map(languageUsers.map(u => [u.user_id, u.created_at]));

        // Get female profiles only
        const { data: femaleProfiles } = await supabase
          .from("female_profiles")
          .select("user_id, full_name, photo_url, created_at")
          .in("user_id", userIds);

        // Get online status
        const { data: onlineStatus } = await supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", userIds);

        const onlineMap = new Map(onlineStatus?.map(s => [s.user_id, s.is_online]) || []);

        // Get community leadership data
        const { data: leadershipData } = await supabase
          .from("app_settings")
          .select("setting_key, setting_value")
          .eq("category", "language_community")
          .in("setting_key", [
            `leader_${motherTongue}`,
            `election_officer_${motherTongue}`,
            `election_data_${motherTongue}`,
            `votes_${motherTongue}`
          ]);

        const settings = new Map(leadershipData?.map(s => [s.setting_key, s.setting_value]) || []);
        const leaderId = (settings.get(`leader_${motherTongue}`) as any)?.userId;
        const officerId = (settings.get(`election_officer_${motherTongue}`) as any)?.userId;
        const election = (settings.get(`election_data_${motherTongue}`) as any) || { active: false, candidates: [] };
        const votes = (settings.get(`votes_${motherTongue}`) as any) || {};

        setElectionData(election);
        setHasVoted(votes[currentUserId] ? true : false);

        // Calculate seniority (days since profile creation)
        const now = new Date();
        const calculateSeniority = (createdAt: string) => {
          const created = new Date(createdAt);
          return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        };

        // Build members list with seniority
        const membersList: CommunityMember[] = (femaleProfiles || []).map(p => ({
          userId: p.user_id,
          fullName: p.full_name || "Unknown",
          photoUrl: p.photo_url,
          isLeader: p.user_id === leaderId,
          isElectionOfficer: p.user_id === officerId,
          isCandidate: election.candidates?.includes(p.user_id) || false,
          voteCount: Object.values(votes).filter(v => v === p.user_id).length,
          isOnline: onlineMap.get(p.user_id) || false,
          joinedAt: joinDates.get(p.user_id) || p.created_at,
          seniority: calculateSeniority(joinDates.get(p.user_id) || p.created_at)
        }));

        // Sort by seniority (most senior first = longest time on app)
        membersList.sort((a, b) => b.seniority - a.seniority);

        // Auto-assign election officer if none exists
        // Election Officer = the member with the longest time on the app (most seniority)
        if (!officerId && membersList.length > 0) {
          // The most senior member becomes the Election Officer (Commissioner)
          const mostSeniorMember = membersList[0]; // Already sorted by seniority
          await autoAssignElectionOfficer(mostSeniorMember.userId);
        }

        // Re-sort: leader first, then election officer, then by seniority
        membersList.sort((a, b) => {
          if (a.isLeader) return -1;
          if (b.isLeader) return 1;
          if (a.isElectionOfficer) return -1;
          if (b.isElectionOfficer) return 1;
          return b.seniority - a.seniority;
        });

        setMembers(membersList);
        setCurrentLeader(membersList.find(m => m.isLeader) || null);
        setElectionOfficer(membersList.find(m => m.isElectionOfficer) || null);
      }

      // Load community messages
      await loadMessages();

    } catch (error) {
      console.error("Error loading community data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
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
  };

  const autoAssignElectionOfficer = async (userId: string) => {
    try {
      await supabase
        .from("app_settings")
        .upsert({
          setting_key: `election_officer_${motherTongue}`,
          category: "language_community",
          setting_type: "json",
          setting_value: { 
            userId, 
            assignedAt: new Date().toISOString(),
            autoAssigned: true 
          } as any,
          is_public: false
        }, { onConflict: "setting_key" });
    } catch (error) {
      console.error("Error auto-assigning election officer:", error);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`language-community-${motherTongue}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_messages' },
        () => loadMessages()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
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
      }
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('messageSendFailed', 'Failed to send message'),
        variant: "destructive"
      });
    }
  };

  const createElection = async () => {
    if (!isElectionOfficer) return;
    
    if (selectedCandidates.length < 2) {
      toast({
        title: t('error', 'Error'),
        description: t('needTwoCandidates', 'You need at least 2 candidates for an election'),
        variant: "destructive"
      });
      return;
    }

    try {
      const electionInfo: ElectionData = {
        active: false,
        candidates: selectedCandidates,
        scheduledAt: scheduledDate && scheduledTime 
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : undefined
      };

      await supabase
        .from("app_settings")
        .upsert({
          setting_key: `election_data_${motherTongue}`,
          category: "language_community",
          setting_type: "json",
          setting_value: electionInfo as any,
          is_public: false
        }, { onConflict: "setting_key" });

      // Clear previous votes
      await supabase
        .from("app_settings")
        .upsert({
          setting_key: `votes_${motherTongue}`,
          category: "language_community",
          setting_type: "json",
          setting_value: {} as any,
          is_public: false
        }, { onConflict: "setting_key" });

      setShowCreateElectionDialog(false);
      setSelectedCandidates([]);
      setScheduledDate("");
      setScheduledTime("");
      
      toast({
        title: t('electionCreated', 'Election Created'),
        description: scheduledDate 
          ? t('electionScheduled', 'Election has been scheduled')
          : t('electionReady', 'Election is ready to start')
      });
      
      loadCommunityData();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('createElectionFailed', 'Failed to create election'),
        variant: "destructive"
      });
    }
  };

  const startElection = async () => {
    if (!isElectionOfficer) return;

    if (electionData.candidates.length < 2) {
      setShowCreateElectionDialog(true);
      return;
    }

    try {
      await supabase
        .from("app_settings")
        .upsert({
          setting_key: `election_data_${motherTongue}`,
          category: "language_community",
          setting_type: "json",
          setting_value: { 
            ...electionData, 
            active: true, 
            startedAt: new Date().toISOString() 
          } as any,
          is_public: false
        }, { onConflict: "setting_key" });

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

  const castVote = async (candidateId: string) => {
    if (hasVoted) {
      toast({
        title: t('alreadyVoted', 'Already Voted'),
        description: t('oneVoteOnly', 'You can only vote once per election'),
        variant: "destructive"
      });
      return;
    }

    if (!electionData.candidates.includes(candidateId)) {
      toast({
        title: t('invalidCandidate', 'Invalid Candidate'),
        description: t('notACandidate', 'This person is not a candidate'),
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: currentVotes } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", `votes_${motherTongue}`)
        .maybeSingle();

      const votes = (currentVotes?.setting_value as any) || {};
      votes[currentUserId] = candidateId;

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

  const endElection = async () => {
    if (!isElectionOfficer) return;

    try {
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

      // Find max votes
      const maxVotes = Math.max(...Object.values(voteCounts), 0);
      const topCandidates = Object.entries(voteCounts)
        .filter(([_, count]) => count === maxVotes)
        .map(([id]) => id);

      // Check for tie
      if (topCandidates.length > 1) {
        // Tie! Election officer needs to cast deciding vote
        const tied = members.filter(m => topCandidates.includes(m.userId));
        setTiedCandidates(tied);
        setShowTiebreakerDialog(true);
        return;
      }

      // Single winner
      const winnerId = topCandidates[0];
      await finalizeElection(winnerId);
      
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('electionEndFailed', 'Failed to end election'),
        variant: "destructive"
      });
    }
  };

  const castTiebreakerVote = async (winnerId: string) => {
    await finalizeElection(winnerId);
    setShowTiebreakerDialog(false);
    setTiedCandidates([]);
  };

  const finalizeElection = async (winnerId: string) => {
    try {
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
            setting_key: `election_data_${motherTongue}`,
            category: "language_community",
            setting_type: "json",
            setting_value: { active: false, candidates: [] } as any,
            is_public: false
          }
        ], { onConflict: "setting_key" });

      toast({
        title: t('electionEnded', 'Election Ended'),
        description: t('newLeaderElected', 'A new community leader has been elected!')
      });
      loadCommunityData();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('finalizeFailed', 'Failed to finalize election'),
        variant: "destructive"
      });
    }
  };

  const toggleCandidateSelection = (userId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const MemberCard = ({ member, showVoteButton = true }: { member: CommunityMember; showVoteButton?: boolean }) => (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      member.isLeader ? "bg-amber-500/10 border-amber-500/30" :
      member.isElectionOfficer ? "bg-purple-500/10 border-purple-500/30" :
      member.isCandidate ? "bg-primary/10 border-primary/30" :
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
        <div className="flex items-center gap-2 flex-wrap">
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
          {member.isCandidate && !member.isLeader && (
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
              <Vote className="w-3 h-3 mr-1" /> {t('candidate', 'Candidate')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{member.seniority} {t('days', 'days')}</span>
          {electionData.active && member.isCandidate && member.voteCount > 0 && (
            <span>• {member.voteCount} {t('votes', 'votes')}</span>
          )}
        </div>
      </div>
      {showVoteButton && electionData.active && !hasVoted && member.isCandidate && member.userId !== currentUserId && (
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

  const CandidateSelector = ({ member }: { member: CommunityMember }) => (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
      selectedCandidates.includes(member.userId) 
        ? "bg-primary/10 border-primary/50" 
        : "bg-card border-border hover:bg-accent/50"
    )}
    onClick={() => toggleCandidateSelection(member.userId)}
    >
      <Checkbox 
        checked={selectedCandidates.includes(member.userId)}
        onCheckedChange={() => toggleCandidateSelection(member.userId)}
      />
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.photoUrl || ""} />
        <AvatarFallback>{member.fullName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm truncate">{member.fullName}</span>
        <p className="text-xs text-muted-foreground">{member.seniority} {t('daysSeniority', 'days seniority')}</p>
      </div>
      {member.isOnline && (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
          {t('online', 'Online')}
        </Badge>
      )}
    </div>
  );

  return (
    <>
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
                      electionData.active 
                        ? "bg-green-500/10 border-green-500/30" 
                        : electionData.scheduledAt
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-muted border-border"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        {electionData.active ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : electionData.scheduledAt ? (
                          <CalendarClock className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="font-medium">
                          {electionData.active 
                            ? t('electionInProgress', 'Election in Progress') 
                            : electionData.scheduledAt
                              ? t('electionScheduled', 'Election Scheduled')
                              : t('noActiveElection', 'No Active Election')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {electionData.active 
                          ? t('castYourVote', 'Cast your vote for the next community leader')
                          : electionData.scheduledAt
                            ? `${t('scheduledFor', 'Scheduled for')} ${new Date(electionData.scheduledAt).toLocaleString()}`
                            : t('waitForElection', 'Wait for the election officer to start a new election')}
                      </p>
                      {hasVoted && electionData.active && (
                        <Badge className="mt-2 bg-primary/20 text-primary">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('youHaveVoted', 'You have voted')}
                        </Badge>
                      )}
                    </div>

                    {/* Candidates List */}
                    {electionData.candidates.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-primary" />
                          {t('candidates', 'Candidates')} ({electionData.candidates.length})
                        </h4>
                        {members
                          .filter(m => electionData.candidates.includes(m.userId))
                          .map(member => (
                            <MemberCard key={member.userId} member={member} />
                          ))
                        }
                      </div>
                    )}

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
                            <div>
                              <span className="text-sm truncate block">{electionOfficer.fullName}</span>
                              <span className="text-xs text-muted-foreground">{t('autoAssigned', 'Auto-assigned')}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t('assigningOfficer', 'Assigning officer...')}</p>
                        )}
                      </div>
                    </div>

                    {/* Election Controls (for election officer only) */}
                    {isElectionOfficer && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          {!electionData.active && (
                            <Button 
                              className="flex-1" 
                              onClick={() => setShowCreateElectionDialog(true)}
                              variant="outline"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {t('createElection', 'Create Election')}
                            </Button>
                          )}
                          {electionData.candidates.length >= 2 && !electionData.active && (
                            <Button 
                              className="flex-1" 
                              onClick={startElection}
                              variant="aurora"
                            >
                              <Vote className="w-4 h-4 mr-2" />
                              {t('startElection', 'Start Election')}
                            </Button>
                          )}
                          {electionData.active && (
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

      {/* Create Election Dialog */}
      <Dialog open={showCreateElectionDialog} onOpenChange={setShowCreateElectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              {t('createElection', 'Create Election')}
            </DialogTitle>
            <DialogDescription>
              {t('selectCandidatesDesc', 'Select candidates and optionally schedule the election')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Candidate Selection */}
            <div className="space-y-2">
              <Label>{t('selectCandidates', 'Select Candidates')} ({selectedCandidates.length} {t('selected', 'selected')})</Label>
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-2">
                  {members.map(member => (
                    <CandidateSelector key={member.userId} member={member} />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Schedule (Optional) */}
            <div className="space-y-2">
              <Label>{t('scheduleOptional', 'Schedule (Optional)')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateElectionDialog(false)}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button onClick={createElection} disabled={selectedCandidates.length < 2}>
              <Plus className="w-4 h-4 mr-2" />
              {t('create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tiebreaker Dialog */}
      <Dialog open={showTiebreakerDialog} onOpenChange={setShowTiebreakerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Trophy className="w-5 h-5" />
              {t('tiebreaker', 'Tiebreaker Required')}
            </DialogTitle>
            <DialogDescription>
              {t('tiebreakerDesc', 'There is a tie! As the election officer, your vote will decide the winner.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {tiedCandidates.map(member => (
              <div 
                key={member.userId}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => castTiebreakerVote(member.userId)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.photoUrl || ""} />
                  <AvatarFallback>{member.fullName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <span className="font-medium">{member.fullName}</span>
                  <p className="text-xs text-muted-foreground">{member.voteCount} {t('votes', 'votes')}</p>
                </div>
                <Button size="sm">
                  <Crown className="w-4 h-4 mr-1" />
                  {t('selectWinner', 'Select')}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LanguageCommunityPanel;
