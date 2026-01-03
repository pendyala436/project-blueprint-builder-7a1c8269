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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Trophy,
  LayoutDashboard,
  Paperclip,
  Camera,
  Image,
  Video,
  FileText,
  Mic,
  MicOff,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { LeaderDashboard } from "@/components/community/LeaderDashboard";
import { DisputeReportButton } from "@/components/community/DisputeReportButton";
import { HoldToRecordButton } from "@/components/HoldToRecordButton";

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
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
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
  
  // Officer nominations
  const [officerNominations, setOfficerNominations] = useState<{
    id: string;
    nomineeId: string;
    nomineeName: string;
    nomineePhoto: string | null;
    approvals: number;
    rejections: number;
    hasVoted: boolean;
    userVote: string | null;
  }[]>([]);
  const [hasNominated, setHasNominated] = useState(false);
  
  // Election creation dialog
  const [showCreateElectionDialog, setShowCreateElectionDialog] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Tiebreaker dialog
  const [showTiebreakerDialog, setShowTiebreakerDialog] = useState(false);
  const [tiedCandidates, setTiedCandidates] = useState<CommunityMember[]>([]);
  
  // Leader dashboard
  const [showLeaderDashboard, setShowLeaderDashboard] = useState(false);
  
  // File upload and camera state
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isElectionOfficer = electionOfficer?.userId === currentUserId;
  const isLeader = currentLeader?.userId === currentUserId;
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
    console.log("[LanguageCommunity] Loading data for language:", motherTongue);
    try {
      // Load members who speak the same language (women only)
      // First get from profiles table with female gender filter
      const { data: femaleProfilesWithLanguage, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, created_at, primary_language, preferred_language")
        .or(`primary_language.eq.${motherTongue},preferred_language.eq.${motherTongue}`)
        .eq("gender", "female");

      console.log("[LanguageCommunity] Female profiles query result:", femaleProfilesWithLanguage?.length, profilesError);

      // Also check user_languages table for additional members
      const { data: languageUsers } = await supabase
        .from("user_languages")
        .select("user_id, language_name, created_at")
        .eq("language_name", motherTongue);

      console.log("[LanguageCommunity] Language users:", languageUsers?.length);

      // Combine user IDs from both sources
      const profileUserIds = femaleProfilesWithLanguage?.map(p => p.user_id) || [];
      const languageUserIds = languageUsers?.map(u => u.user_id) || [];
      const allUserIds = [...new Set([...profileUserIds, ...languageUserIds])];
      
      console.log("[LanguageCommunity] Combined user IDs:", allUserIds.length);

      if (allUserIds.length > 0) {
        // Get full profile data for all users (filtering for females only)
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, created_at, gender")
          .in("user_id", allUserIds)
          .eq("gender", "female");

        console.log("[LanguageCommunity] All female profiles:", allProfiles?.length);

        // Also get female_profiles for additional data
        const { data: femaleSpecificProfiles } = await supabase
          .from("female_profiles")
          .select("user_id, full_name, photo_url, created_at")
          .in("user_id", allUserIds);

        // Merge data - prefer female_profiles data, fallback to profiles
        const femaleProfileMap = new Map(femaleSpecificProfiles?.map(p => [p.user_id, p]) || []);
        const profileMap = new Map(allProfiles?.map(p => [p.user_id, p]) || []);

        // Create join dates map from user_languages
        const joinDates = new Map(languageUsers?.map(u => [u.user_id, u.created_at]) || []);

        // Get online status
        const { data: onlineStatus } = await supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", allUserIds);

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

        console.log("[LanguageCommunity] Leadership data:", leadershipData);

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

        // Build members list - only include female profiles
        const femaleUserIds = allProfiles?.map(p => p.user_id) || [];
        const membersList: CommunityMember[] = femaleUserIds.map(userId => {
          const femaleProfile = femaleProfileMap.get(userId);
          const mainProfile = profileMap.get(userId);
          const profile = femaleProfile || mainProfile;
          
          return {
            userId,
            fullName: femaleProfile?.full_name || mainProfile?.full_name || "Unknown User",
            photoUrl: femaleProfile?.photo_url || mainProfile?.photo_url,
            isLeader: userId === leaderId,
            isElectionOfficer: userId === officerId,
            isCandidate: election.candidates?.includes(userId) || false,
            voteCount: Object.values(votes).filter(v => v === userId).length,
            isOnline: onlineMap.get(userId) || false,
            joinedAt: joinDates.get(userId) || profile?.created_at || new Date().toISOString(),
            seniority: calculateSeniority(joinDates.get(userId) || profile?.created_at || new Date().toISOString())
          };
        });

        console.log("[LanguageCommunity] Members list:", membersList.length, membersList.map(m => m.fullName));

        // Sort by seniority (most senior first = longest time on app)
        membersList.sort((a, b) => b.seniority - a.seniority);

        // Load officer nominations first
        const { data: nominationsData } = await supabase
          .from("officer_nominations")
          .select("*")
          .eq("language_code", motherTongue)
          .eq("status", "pending");

        // Check if user has already nominated
        const userNomination = nominationsData?.find(n => n.nominee_id === currentUserId);
        setHasNominated(!!userNomination);

        // Load nomination votes
        let nominationsWithVotes: typeof officerNominations = [];
        if (nominationsData && nominationsData.length > 0) {
          const nomineeIds = nominationsData.map(n => n.nominee_id);
          const { data: nomineeProfiles } = await supabase
            .from("female_profiles")
            .select("user_id, full_name, photo_url")
            .in("user_id", nomineeIds);
          
          const { data: userVotes } = await supabase
            .from("officer_nomination_votes")
            .select("nomination_id, vote_type")
            .eq("voter_id", currentUserId)
            .in("nomination_id", nominationsData.map(n => n.id));

          const profileMap = new Map(nomineeProfiles?.map(p => [p.user_id, p]) || []);
          const voteMap = new Map(userVotes?.map(v => [v.nomination_id, v.vote_type]) || []);

          nominationsWithVotes = nominationsData.map(n => ({
            id: n.id,
            nomineeId: n.nominee_id,
            nomineeName: profileMap.get(n.nominee_id)?.full_name || "Unknown",
            nomineePhoto: profileMap.get(n.nominee_id)?.photo_url || null,
            approvals: n.approvals_count,
            rejections: n.rejections_count,
            hasVoted: voteMap.has(n.id),
            userVote: voteMap.get(n.id) || null
          }));
        }
        setOfficerNominations(nominationsWithVotes);

        // Auto-assign election officer only if none exists AND no pending nominations
        // Election Officer = the member with the longest time on the app (most seniority)
        if (!officerId && membersList.length > 0 && nominationsData?.length === 0) {
          console.log("[LanguageCommunity] Auto-assigning election officer:", membersList[0].fullName);
          const mostSeniorMember = membersList[0];
          await autoAssignElectionOfficer(mostSeniorMember.userId);
          // Mark as officer in local state
          membersList[0].isElectionOfficer = true;
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
      } else {
        console.log("[LanguageCommunity] No members found for language:", motherTongue);
        setMembers([]);
      }

      // Load community messages
      await loadMessages();

    } catch (error) {
      console.error("[LanguageCommunity] Error loading community data:", error);
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
      // Only load messages from the last 2 days
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const { data: messagesData } = await supabase
        .from("group_messages")
        .select("id, sender_id, message, created_at, file_url, file_name, file_type")
        .eq("group_id", groupData.id)
        .gte("created_at", twoDaysAgo.toISOString())
        .order("created_at", { ascending: true })
        .limit(100);

      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        
        // Get from female_profiles first
        const { data: femaleSenderProfiles } = await supabase
          .from("female_profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", senderIds);

        // Also get from main profiles as fallback
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
            message: m.message || '',
            createdAt: m.created_at,
            isAnnouncement: m.message?.startsWith("[ANNOUNCEMENT]") || false,
            fileUrl: m.file_url,
            fileName: m.file_name,
            fileType: m.file_type
          };
        }));
      } else {
        setMessages([]);
      }
    }
  };

  const autoAssignElectionOfficer = async (userId: string) => {
    try {
      console.log("[LanguageCommunity] Assigning election officer:", userId);
      const { error } = await supabase
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
      
      if (error) {
        console.error("[LanguageCommunity] Error assigning election officer:", error);
      } else {
        console.log("[LanguageCommunity] Election officer assigned successfully");
      }
    } catch (error) {
      console.error("[LanguageCommunity] Exception assigning election officer:", error);
    }
  };

  // Self-nominate as officer
  const nominateSelfAsOfficer = async () => {
    if (electionOfficer) {
      toast({
        title: t('error', 'Error'),
        description: t('officerExists', 'There is already an active election officer'),
        variant: "destructive"
      });
      return;
    }

    if (hasNominated) {
      toast({
        title: t('error', 'Error'),
        description: t('alreadyNominated', 'You have already nominated yourself'),
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("officer_nominations")
        .insert({
          language_code: motherTongue,
          nominee_id: currentUserId,
          nominated_by: currentUserId,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: t('nominationSubmitted', 'Nomination Submitted'),
        description: t('nominationPending', 'Your nomination is now open for community approval')
      });

      setHasNominated(true);
      loadCommunityData();
    } catch (error: any) {
      toast({
        title: t('error', 'Error'),
        description: error.message || t('nominationFailed', 'Failed to submit nomination'),
        variant: "destructive"
      });
    }
  };

  // Vote on officer nomination
  const voteOnNomination = async (nominationId: string, approve: boolean) => {
    try {
      const { error: voteError } = await supabase
        .from("officer_nomination_votes")
        .insert({
          nomination_id: nominationId,
          voter_id: currentUserId,
          vote_type: approve ? "approve" : "reject"
        });

      if (voteError) throw voteError;

      // Update nomination counts
      const nomination = officerNominations.find(n => n.id === nominationId);
      if (nomination) {
        await supabase
          .from("officer_nominations")
          .update({
            approvals_count: nomination.approvals + (approve ? 1 : 0),
            rejections_count: nomination.rejections + (approve ? 0 : 1)
          })
          .eq("id", nominationId);
      }

      toast({
        title: approve ? t('approved', 'Approved') : t('rejected', 'Rejected'),
        description: `You have ${approve ? 'approved' : 'rejected'} this nomination`
      });

      loadCommunityData();
    } catch (error: any) {
      toast({
        title: t('error', 'Error'),
        description: error.message || t('voteFailed', 'Failed to vote'),
        variant: "destructive"
      });
    }
  };

  // Confirm officer from nomination
  const confirmOfficerFromNomination = async (nominationId: string, nomineeId: string) => {
    try {
      // Create officer via app_settings
      await autoAssignElectionOfficer(nomineeId);

      // Mark nomination as approved
      await supabase
        .from("officer_nominations")
        .update({ 
          status: "approved",
          resolved_at: new Date().toISOString()
        })
        .eq("id", nominationId);

      toast({
        title: t('officerConfirmed', 'Officer Confirmed!'),
        description: t('newOfficerAssigned', 'New election officer has been assigned')
      });

      loadCommunityData();
    } catch (error: any) {
      toast({
        title: t('error', 'Error'),
        description: error.message || t('confirmFailed', 'Failed to confirm officer'),
        variant: "destructive"
      });
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
        { event: '*', schema: 'public', table: 'officer_nominations' },
        () => loadCommunityData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'officer_nomination_votes' },
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

  const sendMessage = async (messageText?: string, fileData?: { url: string; name: string; type: string }) => {
    const textToSend = messageText || newMessage.trim();
    if (!textToSend && !fileData) return;

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
        const messageData: any = {
          group_id: groupData.id,
          sender_id: currentUserId,
          message: textToSend || (fileData ? `📎 ${fileData.name}` : '')
        };

        if (fileData) {
          messageData.file_url = fileData.url;
          messageData.file_name = fileData.name;
          messageData.file_type = fileData.type;
        }

        await supabase
          .from("group_messages")
          .insert(messageData);

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

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: t('error', 'Error'),
        description: t('fileTooLarge', 'File size must be less than 50MB'),
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setIsAttachOpen(false);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `community_${motherTongue}_${Date.now()}.${fileExt}`;
      const filePath = `community-files/${currentUserId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await sendMessage('', { 
        url: urlData.publicUrl, 
        name: file.name, 
        type: file.type 
      });

      toast({
        title: t('fileUploaded', 'File Uploaded'),
        description: file.name
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: t('uploadFailed', 'Upload Failed'),
        description: error.message || t('tryAgain', 'Please try again'),
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Camera functions for selfie
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: t('cameraError', 'Camera Error'),
        description: t('cameraAccessDenied', 'Could not access camera'),
        variant: "destructive"
      });
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const captureSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      stopCamera();
      setIsUploading(true);

      try {
        const fileName = `selfie_${motherTongue}_${Date.now()}.jpg`;
        const filePath = `community-files/${currentUserId}/${fileName}`;

        const { error } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, blob, { contentType: 'image/jpeg' });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        await sendMessage('', { 
          url: urlData.publicUrl, 
          name: 'Selfie.jpg', 
          type: 'image/jpeg' 
        });

        toast({ title: t('selfieSent', 'Selfie Sent') });
      } catch (error: any) {
        toast({
          title: t('error', 'Error'),
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsUploading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  // Voice message handler
  const handleVoiceSend = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const fileName = `voice_${motherTongue}_${Date.now()}.webm`;
      const filePath = `community-files/${currentUserId}/${fileName}`;

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, audioBlob, { contentType: 'audio/webm' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await sendMessage('🎤 Voice message', { 
        url: urlData.publicUrl, 
        name: 'Voice Message', 
        type: 'audio/webm' 
      });

      toast({ title: t('voiceSent', 'Voice Message Sent') });
    } catch (error: any) {
      toast({
        title: t('error', 'Error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const createElection = async () => {
    console.log("[LanguageCommunity] createElection called, isElectionOfficer:", isElectionOfficer);
    if (!isElectionOfficer) {
      toast({
        title: t('error', 'Error'),
        description: t('onlyOfficerCanCreate', 'Only the Election Officer can create elections'),
        variant: "destructive"
      });
      return;
    }
    
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
    console.log("[LanguageCommunity] startElection called, isElectionOfficer:", isElectionOfficer, "candidates:", electionData.candidates);
    if (!isElectionOfficer) {
      toast({
        title: t('error', 'Error'),
        description: t('onlyOfficerCanStart', 'Only the Election Officer can start elections'),
        variant: "destructive"
      });
      return;
    }

    if (electionData.candidates.length < 2) {
      setShowCreateElectionDialog(true);
      return;
    }

    try {
      const { error } = await supabase
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

      if (error) {
        console.error("[LanguageCommunity] Error starting election:", error);
        throw error;
      }

      console.log("[LanguageCommunity] Election started successfully");
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
    console.log("[LanguageCommunity] castVote called for:", candidateId, "hasVoted:", hasVoted, "isCandidate:", electionData.candidates.includes(candidateId));
    
    if (hasVoted) {
      toast({
        title: t('alreadyVoted', 'Already Voted'),
        description: t('oneVoteOnly', 'You can only vote once per election'),
        variant: "destructive"
      });
      return;
    }

    if (!electionData.active) {
      toast({
        title: t('electionNotActive', 'Election Not Active'),
        description: t('waitForElection', 'Please wait for the election to start'),
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
    console.log("[LanguageCommunity] endElection called, isElectionOfficer:", isElectionOfficer);
    if (!isElectionOfficer) {
      toast({
        title: t('error', 'Error'),
        description: t('onlyOfficerCanEnd', 'Only the Election Officer can end elections'),
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: votesData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", `votes_${motherTongue}`)
        .maybeSingle();

      const votes = (votesData?.setting_value as any) || {};
      console.log("[LanguageCommunity] Current votes:", votes);
      
      const voteCounts: Record<string, number> = {};
      
      Object.values(votes).forEach((candidateId: any) => {
        voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
      });

      console.log("[LanguageCommunity] Vote counts:", voteCounts);

      // Find max votes
      const maxVotes = Math.max(...Object.values(voteCounts), 0);
      const topCandidates = Object.entries(voteCounts)
        .filter(([_, count]) => count === maxVotes)
        .map(([id]) => id);

      console.log("[LanguageCommunity] Max votes:", maxVotes, "Top candidates:", topCandidates);

      // Check for tie
      if (topCandidates.length > 1) {
        // Tie! Election officer needs to cast deciding vote
        const tied = members.filter(m => topCandidates.includes(m.userId));
        setTiedCandidates(tied);
        setShowTiebreakerDialog(true);
        return;
      }

      // Handle case where no one voted
      if (topCandidates.length === 0 || maxVotes === 0) {
        toast({
          title: t('noVotes', 'No Votes'),
          description: t('noVotesCast', 'No votes were cast in this election'),
          variant: "destructive"
        });
        return;
      }

      // Single winner
      const winnerId = topCandidates[0];
      await finalizeElection(winnerId);
      
    } catch (error) {
      console.error("[LanguageCommunity] Error ending election:", error);
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
      member.isLeader ? "bg-warning/10 border-warning/30" :
      member.isElectionOfficer ? "bg-secondary/10 border-secondary/30" :
      member.isCandidate ? "bg-primary/10 border-primary/30" :
      "bg-card border-border hover:bg-accent/50"
    )}>
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.photoUrl || ""} />
          <AvatarFallback>{member.fullName[0]}</AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online rounded-full border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{member.fullName}</span>
          {member.isLeader && (
            <Badge variant="warningOutline" className="text-xs">
              <Crown className="w-3 h-3 mr-1" /> {t('leader', 'Leader')}
            </Badge>
          )}
          {member.isElectionOfficer && (
            <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground border-secondary/30 text-xs">
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
        <Badge variant="online" className="text-xs">
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
                  <div className="flex flex-col h-72">
                    <ScrollArea className="flex-1 pr-2">
                      <div className="space-y-3">
                        {messages.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('noMessages', 'No messages yet')}</p>
                            <p className="text-xs">{t('startConversation', 'Start the conversation!')}</p>
                            <p className="text-xs text-muted-foreground mt-2">{t('chatAutoDeletes', 'Chat history auto-deletes every 2 days')}</p>
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
                                {msg.fileUrl ? (
                                  <div className="space-y-1">
                                    {msg.fileType?.startsWith('image/') ? (
                                      <img src={msg.fileUrl} alt={msg.fileName || 'Image'} className="max-w-full rounded max-h-40 object-cover" />
                                    ) : msg.fileType?.startsWith('video/') ? (
                                      <video src={msg.fileUrl} controls className="max-w-full rounded max-h-40" />
                                    ) : msg.fileType?.startsWith('audio/') ? (
                                      <audio src={msg.fileUrl} controls className="w-full" />
                                    ) : (
                                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
                                        <FileText className="w-4 h-4" />
                                        {msg.fileName || 'Download file'}
                                      </a>
                                    )}
                                    {msg.message && !msg.message.startsWith('📎') && !msg.message.startsWith('🎤') && (
                                      <p className="text-sm">{msg.message}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm">{msg.message.replace("[ANNOUNCEMENT] ", "")}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const type = file.type.startsWith('image/') ? 'image' : 
                                       file.type.startsWith('video/') ? 'video' : 'document';
                          handleFileUpload(e, type);
                        }
                      }}
                    />

                    {/* Hidden canvas for selfie */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Chat Input Area */}
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2">
                        {/* Attachment Popover */}
                        <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
                          <PopoverTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="shrink-0"
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Paperclip className="w-4 h-4" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" side="top">
                            <div className="grid gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="justify-start"
                                onClick={() => {
                                  setIsAttachOpen(false);
                                  startCamera();
                                }}
                              >
                                <Camera className="w-4 h-4 mr-2" />
                                {t('selfie', 'Selfie')}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="justify-start"
                                onClick={() => {
                                  setIsAttachOpen(false);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.accept = 'image/*';
                                    fileInputRef.current.click();
                                  }
                                }}
                              >
                                <Image className="w-4 h-4 mr-2" />
                                {t('photo', 'Photo')}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="justify-start"
                                onClick={() => {
                                  setIsAttachOpen(false);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.accept = 'video/*';
                                    fileInputRef.current.click();
                                  }
                                }}
                              >
                                <Video className="w-4 h-4 mr-2" />
                                {t('video', 'Video')}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="justify-start"
                                onClick={() => {
                                  setIsAttachOpen(false);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp';
                                    fileInputRef.current.click();
                                  }
                                }}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {t('document', 'Document')}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={t('typeMessage', 'Type a message...')}
                          className="flex-1"
                          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                          disabled={isUploading}
                        />

                        {/* Voice Record Button */}
                        <HoldToRecordButton onRecordingComplete={handleVoiceSend} />

                        <Button 
                          size="icon" 
                          onClick={() => sendMessage()}
                          disabled={!newMessage.trim() || isUploading}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {t('chatAutoDeletesNote', 'Messages auto-delete after 2 days')}
                      </p>
                    </div>
                  </div>

                  {/* Camera Modal for Selfie */}
                  {isCameraOpen && (
                    <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t('takeSelfie', 'Take a Selfie')}</DialogTitle>
                        </DialogHeader>
                        <div className="relative aspect-video bg-video rounded-lg overflow-hidden">
                          <video 
                            ref={videoRef}
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover transform scale-x-[-1]" 
                          />
                        </div>
                        <DialogFooter className="gap-2">
                          <Button variant="outline" onClick={stopCamera}>
                            {t('cancel', 'Cancel')}
                          </Button>
                          <Button onClick={captureSelfie}>
                            <Camera className="w-4 h-4 mr-2" />
                            {t('capture', 'Capture')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
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
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              {officerNominations.length > 0 
                                ? `${officerNominations.length} ${t('nominationsPending', 'nomination(s) pending')}`
                                : t('noOfficerYet', 'No officer yet')}
                            </p>
                            {!hasNominated && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={nominateSelfAsOfficer}
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                {t('nominateYourself', 'Nominate Yourself')}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Officer Nominations Section */}
                    {!electionOfficer && officerNominations.length > 0 && (
                      <Card className="border-purple-500/30 bg-purple-500/5">
                        <CardHeader className="pb-2 pt-3 px-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Gavel className="w-4 h-4 text-purple-500" />
                            {t('commissionerNominations', 'Commissioner Nominations')}
                            <Badge variant="outline" className="ml-auto text-xs">
                              {officerNominations.length} {t('pending', 'pending')}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 px-3 pb-3">
                          <p className="text-xs text-muted-foreground">
                            {t('voteToApprove', 'Vote to approve a commissioner. 5 approvals or 1/4 of members confirms the officer.')}
                          </p>
                          {officerNominations.map((nomination) => {
                            const totalVotes = nomination.approvals + nomination.rejections;
                            const approvalRate = totalVotes > 0 
                              ? Math.round((nomination.approvals / totalVotes) * 100) 
                              : 0;
                            // Require 5 approvals or 1/4 of eligible voters (whichever is less)
                            const eligibleVoters = members.filter(m => m.userId !== nomination.nomineeId).length;
                            const requiredApprovals = Math.min(5, Math.ceil(eligibleVoters / 4));
                            const hasEnoughApproval = nomination.approvals >= requiredApprovals;

                            return (
                              <div key={nomination.id} className="p-3 rounded-lg border bg-card space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={nomination.nomineePhoto || ""} />
                                      <AvatarFallback>{nomination.nomineeName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <span className="text-sm font-medium block">{nomination.nomineeName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {nomination.approvals} {t('approvals', 'approvals')}, {nomination.rejections} {t('rejections', 'rejections')}
                                      </span>
                                    </div>
                                  </div>
                                  {hasEnoughApproval && (
                                    <Button
                                      size="sm"
                                      className="bg-purple-500 hover:bg-purple-600"
                                      onClick={() => confirmOfficerFromNomination(nomination.id, nomination.nomineeId)}
                                    >
                                      {t('confirm', 'Confirm')}
                                    </Button>
                                  )}
                                </div>

                                {/* Approval bar */}
                                <div className="space-y-1">
                                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                                    <div 
                                      className="h-full bg-green-500 transition-all"
                                      style={{ width: `${approvalRate}%` }}
                                    />
                                    <div 
                                      className="h-full bg-red-500 transition-all"
                                      style={{ width: `${100 - approvalRate}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{nomination.approvals}/{requiredApprovals} {t('approvalsNeeded', 'approvals needed')}</span>
                                    <span>{totalVotes} {t('voted', 'voted')}</span>
                                  </div>
                                </div>

                                {/* Vote buttons */}
                                {!nomination.hasVoted && nomination.nomineeId !== currentUserId && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-green-600 border-green-500/30 hover:bg-green-500/10"
                                      onClick={() => voteOnNomination(nomination.id, true)}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {t('approve', 'Approve')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-red-600 border-red-500/30 hover:bg-red-500/10"
                                      onClick={() => voteOnNomination(nomination.id, false)}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      {t('reject', 'Reject')}
                                    </Button>
                                  </div>
                                )}

                                {nomination.hasVoted && (
                                  <Badge variant="outline" className={cn(
                                    "w-full justify-center",
                                    nomination.userVote === "approve" 
                                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                                      : "bg-red-500/10 text-red-600 border-red-500/30"
                                  )}>
                                    {t('youVoted', 'You')} {nomination.userVote === "approve" ? t('approved', 'approved') : t('rejected', 'rejected')} {t('thisNomination', 'this nomination')}
                                  </Badge>
                                )}

                                {nomination.nomineeId === currentUserId && (
                                  <Badge variant="outline" className="w-full justify-center bg-purple-500/10 text-purple-600 border-purple-500/30">
                                    {t('yourNomination', 'This is your nomination')}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}

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

                    {/* Leader Dashboard Button */}
                    {isLeader && (
                      <Button 
                        className="w-full" 
                        variant="aurora"
                        onClick={() => setShowLeaderDashboard(true)}
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t('openLeaderDashboard', 'Open Leader Dashboard')}
                      </Button>
                    )}

                    {/* Report Issue Button for non-leaders */}
                    {!isLeader && (
                      <div className="flex justify-center">
                        <DisputeReportButton
                          currentUserId={currentUserId}
                          motherTongue={motherTongue}
                          members={members}
                        />
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

      {/* Leader Dashboard Modal */}
      {showLeaderDashboard && isLeader && (
        <LeaderDashboard
          currentUserId={currentUserId}
          motherTongue={motherTongue}
          members={members}
          onClose={() => setShowLeaderDashboard(false)}
        />
      )}

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
