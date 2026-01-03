import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Vote, 
  Crown, 
  Trophy,
  Users,
  Plus,
  Play,
  CheckCircle,
  Clock,
  UserPlus,
  Timer,
  Award,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";

interface Candidate {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  platform_statement: string | null;
  vote_count: number;
}

interface Leader {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  term_start: string;
  term_end: string;
}

interface LeaderElectionPanelProps {
  currentUserId: string;
  languageCode: string;
}

export default function LeaderElectionPanel({ currentUserId, languageCode }: LeaderElectionPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLeader, setCurrentLeader] = useState<Leader | null>(null);
  const [hasActiveElection, setHasActiveElection] = useState(false);
  const [electionId, setElectionId] = useState<string | null>(null);
  const [electionEnd, setElectionEnd] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasNominated, setHasNominated] = useState(false);
  const [womenCount, setWomenCount] = useState(0);

  const [showNominateDialog, setShowNominateDialog] = useState(false);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [platformStatement, setPlatformStatement] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const MIN_WOMEN_REQUIRED = 50;
  const NOMINATION_DAYS = 5;
  const VOTING_DAYS = 2;
  const TERM_YEARS = 1;

  useEffect(() => {
    loadElectionData();
  }, [languageCode, currentUserId]);

  const loadElectionData = async () => {
    setIsLoading(true);
    try {
      // Get women count for this language
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("gender", "female")
        .eq("primary_language", languageCode);
      
      setWomenCount(count || 0);

      // Get current leader
      const { data: leaderData } = await supabase
        .from("community_leaders")
        .select("*")
        .eq("language_code", languageCode)
        .eq("status", "active")
        .maybeSingle();

      if (leaderData) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, photo_url")
          .eq("user_id", leaderData.user_id)
          .maybeSingle();

        setCurrentLeader({
          user_id: leaderData.user_id,
          full_name: profile?.full_name || "Unknown",
          photo_url: profile?.photo_url || null,
          term_start: leaderData.term_start,
          term_end: leaderData.term_end
        });
      }

      // Get active election
      const { data: electionData } = await supabase
        .from("community_elections")
        .select("*")
        .eq("language_code", languageCode)
        .in("status", ["nomination", "voting"])
        .maybeSingle();

      if (electionData) {
        setHasActiveElection(true);
        setElectionId(electionData.id);
        setElectionEnd(electionData.scheduled_at);

        // Get candidates
        const { data: candidatesData } = await supabase
          .from("election_candidates")
          .select("id, user_id, platform_statement, vote_count")
          .eq("election_id", electionData.id)
          .eq("nomination_status", "approved");

        if (candidatesData) {
          const candidatesWithProfiles = await Promise.all(
            candidatesData.map(async (c) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, photo_url")
                .eq("user_id", c.user_id)
                .maybeSingle();
              return {
                ...c,
                full_name: profile?.full_name || "Unknown",
                photo_url: profile?.photo_url || null
              };
            })
          );
          setCandidates(candidatesWithProfiles);
        }

        // Check if user has voted
        const { data: voteData } = await supabase
          .from("election_votes")
          .select("id")
          .eq("election_id", electionData.id)
          .eq("voter_id", currentUserId)
          .maybeSingle();

        setHasVoted(!!voteData);

        // Check if user has nominated
        const { data: nominationData } = await supabase
          .from("election_candidates")
          .select("id")
          .eq("election_id", electionData.id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        setHasNominated(!!nominationData);
      } else {
        setHasActiveElection(false);
        setElectionId(null);
        setCandidates([]);
      }
    } catch (error) {
      console.error("Error loading election data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startElection = async () => {
    setIsProcessing(true);
    try {
      const nominationEnd = new Date();
      nominationEnd.setDate(nominationEnd.getDate() + NOMINATION_DAYS);
      
      const votingEnd = new Date(nominationEnd);
      votingEnd.setDate(votingEnd.getDate() + VOTING_DAYS);

      const { data, error } = await supabase
        .from("community_elections")
        .insert({
          language_code: languageCode,
          election_year: new Date().getFullYear(),
          election_officer_id: currentUserId,
          status: "nomination",
          scheduled_at: votingEnd.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Election Started!",
        description: `Nomination period ends in ${NOMINATION_DAYS} days. Voting ends in ${NOMINATION_DAYS + VOTING_DAYS} days.`
      });

      loadElectionData();
    } catch (error) {
      console.error("Error starting election:", error);
      toast({
        title: "Error",
        description: "Failed to start election",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const nominateSelf = async () => {
    if (!electionId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("election_candidates")
        .insert({
          election_id: electionId,
          user_id: currentUserId,
          platform_statement: platformStatement,
          nomination_status: "approved"
        });

      if (error) throw error;

      toast({
        title: "Nomination Submitted!",
        description: "You are now a candidate for leader"
      });

      setShowNominateDialog(false);
      setPlatformStatement("");
      loadElectionData();
    } catch (error) {
      console.error("Error nominating:", error);
      toast({
        title: "Error",
        description: "Failed to submit nomination",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const castVote = async () => {
    if (!electionId || !selectedCandidateId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("election_votes")
        .insert({
          election_id: electionId,
          candidate_id: selectedCandidateId,
          voter_id: currentUserId
        });

      if (error) throw error;

      // Increment vote count
      await supabase.rpc("increment_vote_count", { candidate_uuid: selectedCandidateId });

      toast({
        title: "Vote Cast!",
        description: "Your vote has been recorded securely"
      });

      setShowVoteDialog(false);
      setSelectedCandidateId(null);
      loadElectionData();
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to cast vote",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const endElection = async () => {
    if (!electionId || candidates.length === 0) return;
    setIsProcessing(true);
    try {
      // Find winner
      const winner = candidates.reduce((prev, curr) => 
        (curr.vote_count || 0) > (prev.vote_count || 0) ? curr : prev
      );

      // Update election
      await supabase
        .from("community_elections")
        .update({
          status: "completed",
          winner_id: winner.user_id,
          ended_at: new Date().toISOString()
        })
        .eq("id", electionId);

      // Deactivate previous leaders
      await supabase
        .from("community_leaders")
        .update({ status: "completed" })
        .eq("language_code", languageCode)
        .eq("status", "active");

      // Create new leader
      const termEnd = new Date();
      termEnd.setFullYear(termEnd.getFullYear() + TERM_YEARS);

      await supabase
        .from("community_leaders")
        .insert({
          user_id: winner.user_id,
          language_code: languageCode,
          election_id: electionId,
          term_start: new Date().toISOString(),
          term_end: termEnd.toISOString(),
          status: "active"
        });

      toast({
        title: "Election Complete!",
        description: `${winner.full_name} is the new leader for 1 year`
      });

      loadElectionData();
    } catch (error) {
      console.error("Error ending election:", error);
      toast({
        title: "Error",
        description: "Failed to end election",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isCurrentLeader = currentLeader?.user_id === currentUserId;
  const canStartElection = womenCount >= MIN_WOMEN_REQUIRED && !hasActiveElection && !currentLeader;
  const daysRemaining = electionEnd ? differenceInDays(new Date(electionEnd), new Date()) : 0;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Leader Election
          <Badge variant="secondary" className="ml-auto text-xs">
            {languageCode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Leader Section */}
        {currentLeader && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary">
                <AvatarImage src={currentLeader.photo_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Crown className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{currentLeader.full_name}</span>
                  <Crown className="h-4 w-4 text-primary" />
                  {isCurrentLeader && <Badge variant="default" className="text-[10px]">You</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  Term: {format(new Date(currentLeader.term_start), "MMM yyyy")} - {format(new Date(currentLeader.term_end), "MMM yyyy")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Election Status */}
        {hasActiveElection ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {daysRemaining} days remaining
              </Badge>
              <Badge variant="secondary">
                {candidates.length} Candidates
              </Badge>
            </div>

            {/* Candidates */}
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {candidates.map((candidate) => (
                  <div 
                    key={candidate.id}
                    className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={candidate.photo_url || ""} />
                        <AvatarFallback>{candidate.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{candidate.full_name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {candidate.platform_statement || "No platform statement"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{candidate.vote_count || 0}</div>
                        <div className="text-[10px] text-muted-foreground">votes</div>
                      </div>
                    </div>
                  </div>
                ))}
                {candidates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No candidates yet. Be the first!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!hasNominated && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNominateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nominate Self
                </Button>
              )}
              {!hasVoted && candidates.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowVoteDialog(true)}
                >
                  <Vote className="h-4 w-4 mr-1" />
                  Cast Vote
                </Button>
              )}
              {hasVoted && (
                <Badge variant="outline" className="text-primary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Vote Cast
                </Badge>
              )}
              {daysRemaining <= 0 && candidates.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={endElection}
                  disabled={isProcessing}
                >
                  <Trophy className="h-4 w-4 mr-1" />
                  End Election
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Group Status */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Women in Group</span>
                <span className="font-bold">{womenCount} / {MIN_WOMEN_REQUIRED}</span>
              </div>
              <Progress value={(womenCount / MIN_WOMEN_REQUIRED) * 100} className="h-2" />
              {womenCount < MIN_WOMEN_REQUIRED && (
                <p className="text-xs text-muted-foreground mt-2">
                  Need {MIN_WOMEN_REQUIRED - womenCount} more women to start elections
                </p>
              )}
            </div>

            {/* Election Info */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-muted/30">
                <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="font-medium">{NOMINATION_DAYS} days</div>
                <div className="text-muted-foreground">Nomination</div>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <Vote className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="font-medium">{VOTING_DAYS} days</div>
                <div className="text-muted-foreground">Voting</div>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <Award className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="font-medium">{TERM_YEARS} year</div>
                <div className="text-muted-foreground">Term</div>
              </div>
            </div>

            {canStartElection && (
              <Button 
                className="w-full" 
                onClick={startElection}
                disabled={isProcessing}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Election
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Nominate Dialog */}
      <Dialog open={showNominateDialog} onOpenChange={setShowNominateDialog}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Nominate Yourself</DialogTitle>
            <DialogDescription>
              Share your platform statement with the community
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Why should you be the leader? What will you do for the community?"
            value={platformStatement}
            onChange={(e) => setPlatformStatement(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNominateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={nominateSelf} disabled={isProcessing || !platformStatement.trim()}>
              Submit Nomination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              Select a candidate. Your vote is anonymous and secure.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCandidateId === candidate.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={candidate.photo_url || ""} />
                      <AvatarFallback>{candidate.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{candidate.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {candidate.platform_statement || "No platform statement"}
                      </div>
                    </div>
                    {selectedCandidateId === candidate.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={castVote} disabled={isProcessing || !selectedCandidateId}>
              <Vote className="h-4 w-4 mr-2" />
              Confirm Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
