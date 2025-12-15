import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Election {
  id: string;
  language_code: string;
  election_year: number;
  status: string;
  election_officer_id: string;
  winner_id: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  total_votes: number;
  election_results: Record<string, any> | null;
}

export interface Candidate {
  id: string;
  election_id: string;
  user_id: string;
  nomination_status: string;
  platform_statement: string | null;
  vote_count: number;
  nominated_at: string;
  // Joined data
  full_name?: string;
  photo_url?: string;
}

export interface VoterRegistration {
  id: string;
  election_id: string;
  user_id: string;
  registered_by: string;
  is_eligible: boolean;
  registered_at: string;
  full_name?: string;
}

export interface CommunityLeader {
  id: string;
  language_code: string;
  user_id: string;
  term_start: string;
  term_end: string;
  status: string;
  full_name?: string;
  photo_url?: string;
}

export interface ElectionOfficer {
  id: string;
  language_code: string;
  user_id: string;
  is_active: boolean;
  assigned_at: string;
  auto_assigned: boolean;
  full_name?: string;
  photo_url?: string;
  seniority_days?: number;
}

export interface MemberWithSeniority {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  seniority: number;
  createdAt: string;
  isOnline: boolean;
}

export const useElectionSystem = (
  languageCode: string,
  currentUserId: string
) => {
  const { toast } = useToast();
  const [currentElection, setCurrentElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterRegistry, setVoterRegistry] = useState<VoterRegistration[]>([]);
  const [currentLeader, setCurrentLeader] = useState<CommunityLeader | null>(null);
  const [electionOfficer, setElectionOfficer] = useState<ElectionOfficer | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isRegisteredVoter, setIsRegisteredVoter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveVoteCounts, setLiveVoteCounts] = useState<Record<string, number>>({});
  const [totalVotesCast, setTotalVotesCast] = useState(0);

  const currentYear = new Date().getFullYear();
  const isOfficer = electionOfficer?.user_id === currentUserId;
  const isLeader = currentLeader?.user_id === currentUserId;

  // Calculate seniority in days from created_at
  const calculateSeniority = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Load all election data
  const loadElectionData = useCallback(async () => {
    if (!languageCode) return;
    setIsLoading(true);

    try {
      // Load current election for this year
      const { data: electionData } = await supabase
        .from("community_elections")
        .select("*")
        .eq("language_code", languageCode)
        .eq("election_year", currentYear)
        .maybeSingle();

      setCurrentElection(electionData ? {
        ...electionData,
        election_results: electionData.election_results as Record<string, any> | null
      } : null);

      // Load current leader
      const { data: leaderData } = await supabase
        .from("community_leaders")
        .select("*")
        .eq("language_code", languageCode)
        .eq("status", "active")
        .order("term_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (leaderData) {
        const { data: leaderProfile } = await supabase
          .from("profiles")
          .select("full_name, photo_url")
          .eq("user_id", leaderData.user_id)
          .maybeSingle();

        setCurrentLeader({
          ...leaderData,
          full_name: leaderProfile?.full_name || "Unknown",
          photo_url: leaderProfile?.photo_url
        });
      } else {
        setCurrentLeader(null);
      }

      // Load election officer
      const { data: officerData } = await supabase
        .from("election_officers")
        .select("*")
        .eq("language_code", languageCode)
        .eq("is_active", true)
        .maybeSingle();

      if (officerData) {
        const { data: officerProfile } = await supabase
          .from("profiles")
          .select("full_name, photo_url, created_at")
          .eq("user_id", officerData.user_id)
          .maybeSingle();

        setElectionOfficer({
          ...officerData,
          full_name: officerProfile?.full_name || "Unknown",
          photo_url: officerProfile?.photo_url,
          seniority_days: officerProfile?.created_at ? calculateSeniority(officerProfile.created_at) : 0
        });
      } else {
        setElectionOfficer(null);
      }

      // Load candidates if election exists
      if (electionData) {
        const { data: candidatesData } = await supabase
          .from("election_candidates")
          .select("*")
          .eq("election_id", electionData.id)
          .eq("nomination_status", "approved")
          .order("vote_count", { ascending: false });

        if (candidatesData) {
          const userIds = candidatesData.map(c => c.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, photo_url")
            .in("user_id", userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

          const mappedCandidates = candidatesData.map(c => ({
            ...c,
            full_name: profileMap.get(c.user_id)?.full_name || "Unknown",
            photo_url: profileMap.get(c.user_id)?.photo_url
          }));
          
          setCandidates(mappedCandidates);
          
          // Set live vote counts
          const counts: Record<string, number> = {};
          mappedCandidates.forEach(c => {
            counts[c.id] = c.vote_count;
          });
          setLiveVoteCounts(counts);
          setTotalVotesCast(mappedCandidates.reduce((sum, c) => sum + c.vote_count, 0));
        }

        // Load voter registry
        const { data: registryData } = await supabase
          .from("voter_registry")
          .select("*")
          .eq("election_id", electionData.id);

        if (registryData) {
          const userIds = registryData.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

          setVoterRegistry(registryData.map(r => ({
            ...r,
            full_name: profileMap.get(r.user_id) || "Unknown"
          })));

          // Check if current user is registered
          setIsRegisteredVoter(registryData.some(r => r.user_id === currentUserId && r.is_eligible));
        }

        // Check if user has voted
        const { data: voteData } = await supabase
          .from("election_votes")
          .select("id")
          .eq("election_id", electionData.id)
          .eq("voter_id", currentUserId)
          .maybeSingle();

        setHasVoted(!!voteData);
      } else {
        setCandidates([]);
        setVoterRegistry([]);
        setHasVoted(false);
        setIsRegisteredVoter(false);
        setLiveVoteCounts({});
        setTotalVotesCast(0);
      }
    } catch (error) {
      console.error("[ElectionSystem] Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [languageCode, currentYear, currentUserId]);

  useEffect(() => {
    loadElectionData();
  }, [loadElectionData]);

  // Set up real-time subscription for live vote updates
  useEffect(() => {
    if (!currentElection || currentElection.status !== "active") return;

    const channel = supabase
      .channel('election-votes-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'election_votes',
          filter: `election_id=eq.${currentElection.id}`
        },
        (payload) => {
          console.log("[ElectionSystem] New vote received:", payload);
          // Reload to get updated counts
          loadElectionData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'election_candidates',
          filter: `election_id=eq.${currentElection.id}`
        },
        (payload) => {
          const updated = payload.new as any;
          setLiveVoteCounts(prev => ({
            ...prev,
            [updated.id]: updated.vote_count
          }));
          setTotalVotesCast(prev => {
            const oldCount = liveVoteCounts[updated.id] || 0;
            return prev - oldCount + updated.vote_count;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentElection?.id, currentElection?.status]);

  // Auto-assign election officer to most senior member
  const autoAssignOfficer = async (members: MemberWithSeniority[]) => {
    if (electionOfficer || members.length === 0) return;

    // Sort by seniority (most senior first = highest seniority days)
    const sortedMembers = [...members].sort((a, b) => b.seniority - a.seniority);
    
    // First try to find most senior member who is currently online
    const onlineMembers = sortedMembers.filter(m => m.isOnline);
    const selectedMember = onlineMembers.length > 0 ? onlineMembers[0] : sortedMembers[0];

    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from("election_officers")
        .upsert({
          language_code: languageCode,
          user_id: selectedMember.userId,
          is_active: true,
          auto_assigned: true
        }, { onConflict: "language_code,user_id" });

      if (!error) {
        console.log("[ElectionSystem] Auto-assigned officer:", selectedMember.userId, 
          `(${selectedMember.seniority} days seniority, online: ${selectedMember.isOnline})`);
        toast({
          title: "Election Commissioner Assigned",
          description: `${selectedMember.fullName} has been assigned as commissioner (${selectedMember.seniority} days seniority)`
        });
        loadElectionData();
      }
    } catch (error) {
      console.error("[ElectionSystem] Error auto-assigning officer:", error);
    }
  };

  // Reassign officer to most senior available member
  const reassignOfficer = async (members: MemberWithSeniority[]) => {
    if (members.length === 0) return false;

    // Sort by seniority (most senior first)
    const sortedMembers = [...members].sort((a, b) => b.seniority - a.seniority);
    
    // Prefer online members, then fall back to most senior
    const onlineMembers = sortedMembers.filter(m => m.isOnline);
    const selectedMember = onlineMembers.length > 0 ? onlineMembers[0] : sortedMembers[0];

    if (!selectedMember) return false;

    try {
      // Deactivate current officer
      if (electionOfficer) {
        await supabase
          .from("election_officers")
          .update({ is_active: false })
          .eq("id", electionOfficer.id);
      }

      // Assign new officer
      const { error } = await supabase
        .from("election_officers")
        .upsert({
          language_code: languageCode,
          user_id: selectedMember.userId,
          is_active: true,
          auto_assigned: true
        }, { onConflict: "language_code,user_id" });

      if (!error) {
        toast({
          title: "New Commissioner Assigned",
          description: `${selectedMember.fullName} is now the Election Commissioner`
        });
        loadElectionData();
        return true;
      }
      return false;
    } catch (error) {
      console.error("[ElectionSystem] Error reassigning officer:", error);
      return false;
    }
  };

  // Create a new election with optional scheduling
  const createElection = async (scheduledAt?: string): Promise<boolean> => {
    if (!isOfficer) {
      toast({
        title: "Unauthorized",
        description: "Only the Election Commissioner can create elections",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("community_elections")
        .insert({
          language_code: languageCode,
          election_year: currentYear,
          election_officer_id: currentUserId,
          scheduled_at: scheduledAt || null,
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;

      const scheduledMessage = scheduledAt 
        ? ` scheduled for ${new Date(scheduledAt).toLocaleString()}`
        : "";

      toast({
        title: "Election Created",
        description: `Election for ${currentYear} has been created${scheduledMessage}`
      });

      setCurrentElection(data ? {
        ...data,
        election_results: data.election_results as Record<string, any> | null
      } : null);
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create election",
        variant: "destructive"
      });
      return false;
    }
  };

  // Schedule an existing election
  const scheduleElection = async (scheduledAt: string): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    try {
      const { error } = await supabase
        .from("community_elections")
        .update({ scheduled_at: scheduledAt })
        .eq("id", currentElection.id);

      if (error) throw error;

      toast({
        title: "Election Scheduled",
        description: `Voting will begin on ${new Date(scheduledAt).toLocaleString()}`
      });

      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule election",
        variant: "destructive"
      });
      return false;
    }
  };

  // Add candidate to election
  const addCandidate = async (userId: string, platformStatement?: string): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    try {
      const { error } = await supabase
        .from("election_candidates")
        .insert({
          election_id: currentElection.id,
          user_id: userId,
          nomination_status: "approved",
          platform_statement: platformStatement || null
        });

      if (error) throw error;

      toast({
        title: "Candidate Added",
        description: "Candidate has been added to the election"
      });

      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add candidate",
        variant: "destructive"
      });
      return false;
    }
  };

  // Register voter
  const registerVoter = async (userId: string): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    try {
      const { error } = await supabase
        .from("voter_registry")
        .insert({
          election_id: currentElection.id,
          user_id: userId,
          registered_by: currentUserId,
          is_eligible: true
        });

      if (error) throw error;

      toast({
        title: "Voter Registered",
        description: "Voter has been added to the registry"
      });

      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register voter",
        variant: "destructive"
      });
      return false;
    }
  };

  // Register all eligible members as voters
  const registerAllVoters = async (memberIds: string[]): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    try {
      const registrations = memberIds.map(userId => ({
        election_id: currentElection.id,
        user_id: userId,
        registered_by: currentUserId,
        is_eligible: true
      }));

      const { error } = await supabase
        .from("voter_registry")
        .upsert(registrations, { onConflict: "election_id,user_id" });

      if (error) throw error;

      toast({
        title: "Voters Registered",
        description: `${memberIds.length} voters have been registered`
      });

      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register voters",
        variant: "destructive"
      });
      return false;
    }
  };

  // Register only online members as voters
  const registerPresentVoters = async (members: MemberWithSeniority[]): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    const onlineMembers = members.filter(m => m.isOnline);
    if (onlineMembers.length === 0) {
      toast({
        title: "No Online Members",
        description: "No members are currently online to register",
        variant: "destructive"
      });
      return false;
    }

    return registerAllVoters(onlineMembers.map(m => m.userId));
  };

  // Start election
  const startElection = async (): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    if (candidates.length < 2) {
      toast({
        title: "Cannot Start",
        description: "At least 2 candidates are required",
        variant: "destructive"
      });
      return false;
    }

    if (voterRegistry.length === 0) {
      toast({
        title: "Cannot Start",
        description: "No voters have been registered",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("community_elections")
        .update({
          status: "active",
          started_at: new Date().toISOString()
        })
        .eq("id", currentElection.id);

      if (error) throw error;

      toast({
        title: "Election Started!",
        description: "Voting is now open. Results will update in real-time!"
      });

      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start election",
        variant: "destructive"
      });
      return false;
    }
  };

  // Cast vote
  const castVote = async (candidateId: string): Promise<boolean> => {
    if (!currentElection || currentElection.status !== "active") {
      toast({
        title: "Voting Closed",
        description: "This election is not currently accepting votes",
        variant: "destructive"
      });
      return false;
    }

    if (!isRegisteredVoter) {
      toast({
        title: "Not Registered",
        description: "You are not registered to vote in this election",
        variant: "destructive"
      });
      return false;
    }

    if (hasVoted) {
      toast({
        title: "Already Voted",
        description: "You can only vote once per election",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("election_votes")
        .insert({
          election_id: currentElection.id,
          voter_id: currentUserId,
          candidate_id: candidateId,
          is_tiebreaker: false
        });

      if (error) throw error;

      toast({
        title: "Vote Cast!",
        description: "Your vote has been recorded and counted"
      });

      setHasVoted(true);
      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cast vote",
        variant: "destructive"
      });
      return false;
    }
  };

  // Cast tiebreaker vote (officer only)
  const castTiebreakerVote = async (candidateId: string): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    try {
      const { error } = await supabase
        .from("election_votes")
        .insert({
          election_id: currentElection.id,
          voter_id: currentUserId,
          candidate_id: candidateId,
          is_tiebreaker: true
        });

      if (error) throw error;

      toast({
        title: "Tiebreaker Vote Cast",
        description: "Your deciding vote has been recorded"
      });

      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cast tiebreaker",
        variant: "destructive"
      });
      return false;
    }
  };

  // End election and determine winner
  const endElection = async (): Promise<{ success: boolean; isTie: boolean; tiedCandidates?: Candidate[] }> => {
    if (!isOfficer || !currentElection) {
      return { success: false, isTie: false };
    }

    // Get final vote counts
    const sortedCandidates = [...candidates].sort((a, b) => b.vote_count - a.vote_count);
    
    if (sortedCandidates.length === 0) {
      toast({
        title: "Error",
        description: "No candidates in this election",
        variant: "destructive"
      });
      return { success: false, isTie: false };
    }

    const topVotes = sortedCandidates[0].vote_count;
    const topCandidates = sortedCandidates.filter(c => c.vote_count === topVotes);

    // Check for tie
    if (topCandidates.length > 1) {
      return { success: false, isTie: true, tiedCandidates: topCandidates };
    }

    // Single winner - finalize election
    const winner = topCandidates[0];
    return await finalizeElection(winner.user_id);
  };

  // Finalize election with a winner
  const finalizeElection = async (winnerId: string): Promise<{ success: boolean; isTie: boolean }> => {
    if (!isOfficer || !currentElection) {
      return { success: false, isTie: false };
    }

    try {
      // Calculate one year from now
      const termEnd = new Date();
      termEnd.setFullYear(termEnd.getFullYear() + 1);

      // Update election with winner
      await supabase
        .from("community_elections")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
          winner_id: winnerId,
          election_results: {
            candidates: candidates.map(c => ({
              userId: c.user_id,
              fullName: c.full_name,
              voteCount: c.vote_count
            })),
            totalVotes: candidates.reduce((sum, c) => sum + c.vote_count, 0),
            winnerId
          }
        })
        .eq("id", currentElection.id);

      // Deactivate previous leaders
      await supabase
        .from("community_leaders")
        .update({ status: "completed" })
        .eq("language_code", languageCode)
        .eq("status", "active");

      // Create new leader record
      await supabase
        .from("community_leaders")
        .insert({
          language_code: languageCode,
          user_id: winnerId,
          election_id: currentElection.id,
          term_start: new Date().toISOString(),
          term_end: termEnd.toISOString(),
          status: "active"
        });

      toast({
        title: "🎉 Election Completed!",
        description: "A new community leader has been elected!"
      });

      loadElectionData();
      return { success: true, isTie: false };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to finalize election",
        variant: "destructive"
      });
      return { success: false, isTie: false };
    }
  };

  // Remove candidate
  const removeCandidate = async (candidateId: string): Promise<boolean> => {
    if (!isOfficer || !currentElection) return false;

    try {
      const { error } = await supabase
        .from("election_candidates")
        .delete()
        .eq("id", candidateId);

      if (error) throw error;

      toast({
        title: "Candidate Removed",
        description: "Candidate has been removed from the election"
      });

      loadElectionData();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove candidate",
        variant: "destructive"
      });
      return false;
    }
  };

  // Get voting progress
  const getVotingProgress = (): { voted: number; total: number; percentage: number } => {
    const total = voterRegistry.length;
    const voted = totalVotesCast;
    return {
      voted,
      total,
      percentage: total > 0 ? Math.round((voted / total) * 100) : 0
    };
  };

  return {
    // State
    currentElection,
    candidates,
    voterRegistry,
    currentLeader,
    electionOfficer,
    hasVoted,
    isRegisteredVoter,
    isLoading,
    isOfficer,
    isLeader,
    currentYear,
    liveVoteCounts,
    totalVotesCast,
    
    // Actions
    loadElectionData,
    autoAssignOfficer,
    reassignOfficer,
    createElection,
    scheduleElection,
    addCandidate,
    removeCandidate,
    registerVoter,
    registerAllVoters,
    registerPresentVoters,
    startElection,
    castVote,
    castTiebreakerVote,
    endElection,
    finalizeElection,
    getVotingProgress,
    calculateSeniority
  };
};

export default useElectionSystem;
