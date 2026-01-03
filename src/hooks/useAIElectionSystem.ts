import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AIElectionStatus {
  election: {
    id: string;
    language_code: string;
    election_year: number;
    status: string;
    winner_id: string | null;
    started_at: string | null;
    ended_at: string | null;
    scheduled_at: string | null;
    total_votes: number;
  } | null;
  leader: {
    id: string;
    user_id: string;
    full_name: string;
    photo_url: string | null;
    term_start: string;
    term_end: string;
    status: string;
  } | null;
  candidates: {
    id: string;
    user_id: string;
    full_name: string;
    photo_url: string | null;
    vote_count: number;
    nomination_status: string;
    platform_statement?: string;
  }[];
  hasVoted: boolean;
  totalVotes: number;
  needsNewElection: boolean;
  votingExpired: boolean;
  termYears: number;
  shiftConfig: {
    hours: number;
    buffer: number;
    weekOffInterval: number;
  };
}

export const useAIElectionSystem = (
  languageCode: string,
  currentUserId: string
) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<AIElectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const isLeader = status?.leader?.user_id === currentUserId;
  const hasActiveElection = status?.election?.status === "active";
  const hasVoted = status?.hasVoted || false;
  const votingExpired = status?.votingExpired || false;

  // Load election status
  const loadStatus = useCallback(async () => {
    if (!languageCode) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke("ai-election-manager", {
        body: { 
          action: "get_status", 
          languageCode, 
          userId: currentUserId 
        }
      });

      if (error) throw error;
      
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error("[AIElection] Error loading status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [languageCode, currentUserId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Real-time subscription for vote updates
  useEffect(() => {
    if (!status?.election?.id || status.election.status !== "active") return;

    const channel = supabase
      .channel("ai-election-votes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "election_votes",
          filter: `election_id=eq.${status.election.id}`
        },
        () => loadStatus()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "election_candidates",
          filter: `election_id=eq.${status.election.id}`
        },
        () => loadStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status?.election?.id, status?.election?.status]);

  // Start new election
  const startElection = async (): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-election-manager", {
        body: { 
          action: "start_election", 
          languageCode, 
          userId: currentUserId 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Election Started",
          description: data.message
        });
        loadStatus();
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start election",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Nominate a candidate (self or others)
  const nominateCandidate = async (nomineeId: string, platformStatement?: string, isSelfNomination?: boolean): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-election-manager", {
        body: { 
          action: "nominate_candidate", 
          languageCode, 
          userId: currentUserId,
          nomineeId,
          platformStatement,
          isSelfNomination
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: isSelfNomination ? "You're Running!" : "Candidate Nominated",
          description: data.message
        });
        loadStatus();
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to nominate candidate",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Cast vote
  const castVote = async (candidateId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-election-manager", {
        body: { 
          action: "cast_vote", 
          languageCode, 
          userId: currentUserId,
          candidateId 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Vote Cast",
          description: "Your vote has been recorded anonymously"
        });
        loadStatus();
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cast vote",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // End election (AI manages winner selection)
  const endElection = async (): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-election-manager", {
        body: { 
          action: "end_election", 
          languageCode 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Election Completed",
          description: data.message
        });
        loadStatus();
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to end election",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Leader: Send announcement
  const sendAnnouncement = async (title: string, content: string, priority?: string): Promise<boolean> => {
    if (!isLeader) {
      toast({
        title: "Error",
        description: "Only the community leader can send announcements",
        variant: "destructive"
      });
      return false;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-election-manager", {
        body: { 
          action: "send_announcement", 
          languageCode, 
          userId: currentUserId,
          title,
          content,
          priority: priority || "normal"
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Announcement Sent",
          description: "Your announcement has been sent to the community"
        });
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send announcement",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Leader: Resolve dispute
  const resolveDispute = async (disputeId: string, resolution: string): Promise<boolean> => {
    if (!isLeader) {
      toast({
        title: "Error",
        description: "Only the community leader can resolve disputes",
        variant: "destructive"
      });
      return false;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-election-manager", {
        body: { 
          action: "resolve_dispute", 
          languageCode, 
          userId: currentUserId,
          disputeId,
          resolution
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Dispute Resolved",
          description: "The dispute has been marked as resolved"
        });
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve dispute",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    status,
    isLoading,
    isProcessing,
    isLeader,
    hasActiveElection,
    hasVoted,
    votingExpired,
    loadStatus,
    startElection,
    nominateCandidate,
    castVote,
    endElection,
    sendAnnouncement,
    resolveDispute
  };
};
