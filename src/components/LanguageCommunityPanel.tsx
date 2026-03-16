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
  MessageCircle, 
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
  Clock,
  Shield,
  User,
  LayoutDashboard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { LeaderDashboard } from "@/components/community/LeaderDashboard";
import { DisputeReportButton } from "@/components/community/DisputeReportButton";

interface CommunityMember {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  isLeader: boolean;
  isOnline: boolean;
  joinedAt: string;
  seniority: number;
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
  const [currentLeader, setCurrentLeader] = useState<CommunityMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showLeaderDashboard, setShowLeaderDashboard] = useState(false);

  const isLeader = currentLeader?.userId === currentUserId;

  useEffect(() => {
    if (isOpen && motherTongue) {
      loadCommunityData();
      subscribeToUpdates();
    }
  }, [isOpen, motherTongue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadCommunityData = async () => {
    setIsLoading(true);
    console.log("[LanguageCommunity] Loading data for language:", motherTongue);
    try {
      const { data: femaleProfilesWithLanguage, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, created_at, primary_language, preferred_language")
        .or(`primary_language.eq.${motherTongue},preferred_language.eq.${motherTongue}`)
        .eq("gender", "female");

      console.log("[LanguageCommunity] Female profiles query result:", femaleProfilesWithLanguage?.length, profilesError);

      const { data: languageUsers } = await supabase
        .from("user_languages")
        .select("user_id, language_name, created_at")
        .eq("language_name", motherTongue);

      console.log("[LanguageCommunity] Language users:", languageUsers?.length);

      const profileUserIds = femaleProfilesWithLanguage?.map(p => p.user_id) || [];
      const languageUserIds = languageUsers?.map(u => u.user_id) || [];
      const allUserIds = [...new Set([...profileUserIds, ...languageUserIds])];
      
      console.log("[LanguageCommunity] Combined user IDs:", allUserIds.length);

      if (allUserIds.length > 0) {
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, created_at, gender")
          .in("user_id", allUserIds)
          .eq("gender", "female");

        console.log("[LanguageCommunity] All female profiles:", allProfiles?.length);

        const { data: femaleSpecificProfiles } = await supabase
          .from("female_profiles")
          .select("user_id, full_name, photo_url, created_at")
          .in("user_id", allUserIds);

        const femaleProfileMap = new Map(femaleSpecificProfiles?.map(p => [p.user_id, p]) || []);
        const joinDates = new Map(languageUsers?.map(u => [u.user_id, u.created_at]) || []);

        const { data: onlineStatus } = await supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", allUserIds);

        const onlineMap = new Map(onlineStatus?.map(s => [s.user_id, s.is_online]) || []);

        const { data: leadershipData } = await supabase
          .from("app_settings")
          .select("setting_key, setting_value")
          .eq("category", "language_community")
          .in("setting_key", [
            `leader_${motherTongue}`,
            `votes_${motherTongue}`
          ]);

        console.log("[LanguageCommunity] Leadership data:", leadershipData);

        const settings = new Map(leadershipData?.map(s => [s.setting_key, s.setting_value]) || []);
        const leaderId = (settings.get(`leader_${motherTongue}`) as any)?.userId;

        const now = new Date();
        const calculateSeniority = (createdAt: string) => {
          const created = new Date(createdAt);
          return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        };

        const femaleUserIds = allProfiles?.map(p => p.user_id) || [];
        const allProfileMap = new Map(allProfiles?.map(p => [p.user_id, p]) || []);
        const membersList: CommunityMember[] = femaleUserIds.map(userId => {
          const femaleProfile = femaleProfileMap.get(userId);
          const profileData = allProfileMap.get(userId);
          
          return {
            userId,
            fullName: femaleProfile?.full_name || profileData?.full_name || "Unknown User",
            photoUrl: femaleProfile?.photo_url || profileData?.photo_url || null,
            isLeader: userId === leaderId,
            isOnline: onlineMap.get(userId) || false,
            joinedAt: joinDates.get(userId) || profileData?.created_at || new Date().toISOString(),
            seniority: calculateSeniority(joinDates.get(userId) || profileData?.created_at || new Date().toISOString())
          };
        });

        console.log("[LanguageCommunity] Members list:", membersList.length, membersList.map(m => m.fullName));

        membersList.sort((a, b) => b.seniority - a.seniority);
        membersList.sort((a, b) => {
          if (a.isLeader) return -1;
          if (b.isLeader) return 1;
          return b.seniority - a.seniority;
        });

        setMembers(membersList);
        setCurrentLeader(membersList.find(m => m.isLeader) || null);
      } else {
        console.log("[LanguageCommunity] No members found for language:", motherTongue);
        setMembers([]);
      }

      await loadMessages();
    } catch (error) {
      console.error("[LanguageCommunity] Error loading community data:", error);
      toast.error("Community unavailable", { description: "Unable to load community data. Please refresh the page." });
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

      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        
        const { data: femaleSenderProfiles } = await supabase
          .from("female_profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", senderIds);

        const { data: mainSenderProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", senderIds);

        const femaleSenderMap = new Map(femaleSenderProfiles?.map(p => [p.user_id, p]) || []);
        const mainSenderMap = new Map(mainSenderProfiles?.map(p => [p.user_id, p]) || []);

        setMessages(messagesData.map(m => {
          const femaleProfile = femaleSenderMap.get(m.sender_id);
          const mainProfile = mainSenderMap.get(m.sender_id);
          return {
            id: m.id,
            senderId: m.sender_id,
            senderName: femaleProfile?.full_name || mainProfile?.full_name || "Unknown User",
            senderPhoto: femaleProfile?.photo_url || mainProfile?.photo_url || null,
            message: m.message,
            createdAt: m.created_at,
            isAnnouncement: m.message.startsWith("[ANNOUNCEMENT]")
          };
        }));
      }
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
        { event: '*', schema: 'public', table: 'user_status' },
        () => loadCommunityData()
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

  const MemberCard = ({ member }: { member: CommunityMember }) => (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.photoUrl || ""} />
          <AvatarFallback className="text-xs">{member.fullName[0]}</AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium truncate">{member.fullName}</p>
          {member.isLeader && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">{member.seniority}d seniority</p>
      </div>
      <Badge variant={member.isOnline ? "default" : "secondary"} className="text-xs shrink-0">
        {member.isOnline ? "Online" : "Offline"}
      </Badge>
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
                    <Badge variant="warningOutline">
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
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="chat" className="text-xs">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {t('chat', 'Chat')}
                  </TabsTrigger>
                  <TabsTrigger value="members" className="text-xs">
                    <Users className="w-4 h-4 mr-1" />
                    {t('members', 'Members')}
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

              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Leader Dashboard Modal */}
      {showLeaderDashboard && isLeader && (
        <LeaderDashboard
          currentUserId={currentUserId}
          motherTongue={motherTongue}
          members={members}
          onClose={() => setShowLeaderDashboard(false)}
        />
      )}
    </>
  );
};

export default LanguageCommunityPanel;
