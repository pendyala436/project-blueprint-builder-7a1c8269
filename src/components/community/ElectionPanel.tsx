import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  Vote, 
  Crown, 
  Gavel,
  CheckCircle,
  Clock,
  Trophy,
  Users,
  Plus,
  UserPlus,
  Play,
  Square,
  AlertTriangle,
  Calendar,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { 
  Election, 
  Candidate, 
  ElectionOfficer, 
  CommunityLeader, 
  VoterRegistration,
  MemberWithSeniority,
  OfficerNomination
} from "@/hooks/useElectionSystem";

interface ElectionPanelProps {
  currentUserId: string;
  currentElection: Election | null;
  candidates: Candidate[];
  voterRegistry: VoterRegistration[];
  currentLeader: CommunityLeader | null;
  electionOfficer: ElectionOfficer | null;
  officerNominations: OfficerNomination[];
  hasVoted: boolean;
  isRegisteredVoter: boolean;
  isOfficer: boolean;
  hasNominated: boolean;
  currentYear: number;
  members: MemberWithSeniority[];
  liveVoteCounts: Record<string, number>;
  totalVotesCast: number;
  votingProgress: { voted: number; total: number; percentage: number };
  onCreateElection: (scheduledAt?: string) => Promise<boolean>;
  onScheduleElection: (scheduledAt: string) => Promise<boolean>;
  onAddCandidate: (userId: string) => Promise<boolean>;
  onRegisterAllVoters: (userIds: string[]) => Promise<boolean>;
  onRegisterPresentVoters: (members: MemberWithSeniority[]) => Promise<boolean>;
  onStartElection: () => Promise<boolean>;
  onCastVote: (candidateId: string) => Promise<boolean>;
  onEndElection: () => Promise<{ success: boolean; isTie: boolean; tiedCandidates?: Candidate[] }>;
  onFinalizeElection: (winnerId: string) => Promise<{ success: boolean; isTie: boolean }>;
  onReassignOfficer: (members: MemberWithSeniority[]) => Promise<boolean>;
  onNominateSelf: () => Promise<boolean>;
  onVoteOnNomination: (nominationId: string, approve: boolean) => Promise<boolean>;
  onConfirmOfficer: (nomination: OfficerNomination) => Promise<boolean>;
}

export const ElectionPanel = ({
  currentUserId,
  currentElection,
  candidates,
  voterRegistry,
  currentLeader,
  electionOfficer,
  officerNominations,
  hasVoted,
  isRegisteredVoter,
  isOfficer,
  hasNominated,
  currentYear,
  members,
  liveVoteCounts,
  totalVotesCast,
  votingProgress,
  onCreateElection,
  onScheduleElection,
  onAddCandidate,
  onRegisterAllVoters,
  onRegisterPresentVoters,
  onStartElection,
  onCastVote,
  onEndElection,
  onFinalizeElection,
  onReassignOfficer,
  onNominateSelf,
  onVoteOnNomination,
  onConfirmOfficer
}: ElectionPanelProps) => {
  const { t } = useTranslation();
  const [showAddCandidatesDialog, setShowAddCandidatesDialog] = useState(false);
  const [showTiebreakerDialog, setShowTiebreakerDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [tiedCandidates, setTiedCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  const registeredVoterIds = voterRegistry.map(v => v.user_id);
  const candidateUserIds = candidates.map(c => c.user_id);
  const eligibleForCandidate = members.filter(m => !candidateUserIds.includes(m.userId));
  const onlineMembers = members.filter(m => m.isOnline);

  // Sort candidates by vote count for display
  const sortedCandidates = [...candidates].sort((a, b) => 
    (liveVoteCounts[b.id] || b.vote_count) - (liveVoteCounts[a.id] || a.vote_count)
  );

  const maxVotes = sortedCandidates.length > 0 
    ? Math.max(...sortedCandidates.map(c => liveVoteCounts[c.id] || c.vote_count), 1) 
    : 1;

  const handleCreateElection = async () => {
    setIsProcessing(true);
    await onCreateElection();
    setIsProcessing(false);
  };

  const handleScheduleElection = async () => {
    if (!scheduledDateTime) return;
    setIsProcessing(true);
    const success = currentElection 
      ? await onScheduleElection(scheduledDateTime)
      : await onCreateElection(scheduledDateTime);
    if (success) {
      setShowScheduleDialog(false);
      setScheduledDateTime("");
    }
    setIsProcessing(false);
  };

  const handleAddCandidates = async () => {
    setIsProcessing(true);
    for (const userId of selectedCandidates) {
      await onAddCandidate(userId);
    }
    setSelectedCandidates([]);
    setShowAddCandidatesDialog(false);
    setIsProcessing(false);
  };

  const handleRegisterAllVoters = async () => {
    setIsProcessing(true);
    const unregisteredIds = members
      .filter(m => !registeredVoterIds.includes(m.userId))
      .map(m => m.userId);
    await onRegisterAllVoters(unregisteredIds);
    setIsProcessing(false);
  };

  const handleRegisterPresentVoters = async () => {
    setIsProcessing(true);
    await onRegisterPresentVoters(members);
    setIsProcessing(false);
  };

  const handleStartElection = async () => {
    setIsProcessing(true);
    await onStartElection();
    setIsProcessing(false);
  };

  const handleEndElection = async () => {
    setIsProcessing(true);
    const result = await onEndElection();
    if (result.isTie && result.tiedCandidates) {
      setTiedCandidates(result.tiedCandidates);
      setShowTiebreakerDialog(true);
    }
    setIsProcessing(false);
  };

  const handleTiebreakerVote = async (candidateUserId: string) => {
    setIsProcessing(true);
    await onFinalizeElection(candidateUserId);
    setShowTiebreakerDialog(false);
    setTiedCandidates([]);
    setIsProcessing(false);
  };

  const handleReassignOfficer = async () => {
    setIsProcessing(true);
    await onReassignOfficer(members);
    setIsProcessing(false);
  };

  const toggleCandidateSelection = (userId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Election Status Header */}
      <div className={cn(
        "p-4 rounded-lg border relative overflow-hidden",
        currentElection?.status === "active" 
          ? "bg-success/10 border-success/30" 
          : currentElection?.status === "pending"
            ? "bg-pending/10 border-pending/30"
            : currentElection?.status === "completed"
              ? "bg-info/10 border-info/30"
              : "bg-muted border-border"
      )}>
        {/* Live indicator for active elections */}
        {currentElection?.status === "active" && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-online opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-online"></span>
            </span>
            <span className="text-xs font-medium text-online">LIVE</span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          {currentElection?.status === "active" ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : currentElection?.status === "pending" ? (
            <Clock className="w-5 h-5 text-warning" />
          ) : currentElection?.status === "completed" ? (
            <Trophy className="w-5 h-5 text-info" />
          ) : (
            <Vote className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="font-medium">
            {currentElection?.status === "active" 
              ? t('electionInProgress', 'Election in Progress') 
              : currentElection?.status === "pending"
                ? t('electionPending', 'Election Pending')
                : currentElection?.status === "completed"
                  ? t('electionCompleted', 'Election Completed')
                  : t('noElection', `No Election for ${currentYear}`)}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {currentElection?.status === "active" 
            ? t('castYourVote', 'Cast your vote for the next community leader')
            : currentElection?.status === "pending"
              ? `${candidates.length} ${t('candidatesRegistered', 'candidates registered')}, ${voterRegistry.length} ${t('votersRegistered', 'voters registered')}`
              : currentElection?.status === "completed"
                ? t('electionFinished', 'This election has been completed')
                : t('waitForElection', 'The Election Commissioner will create a new election')}
        </p>

        {/* Scheduled time display */}
        {currentElection?.scheduled_at && currentElection.status === "pending" && (
          <div className="mt-2 flex items-center gap-2 text-sm text-warning">
            <Calendar className="w-4 h-4" />
            <span>Scheduled: {new Date(currentElection.scheduled_at).toLocaleString()}</span>
          </div>
        )}
        
        {/* Voting status badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {currentElection?.status === "active" && (
            <>
              {isRegisteredVoter ? (
                <Badge variant="successOutline">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('registeredVoter', 'Registered Voter')}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('notRegistered', 'Not Registered')}
                </Badge>
              )}
              {hasVoted && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('youHaveVoted', 'You have voted')}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Live Results Dashboard (Active Elections) */}
      {currentElection?.status === "active" && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-success" />
              {t('liveResults', 'Live Results')}
              <Badge variant="outline" className="ml-auto bg-success/20 text-success border-success/30">
                <TrendingUp className="w-3 h-3 mr-1" />
                {totalVotesCast} votes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Voting progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Voting Progress</span>
                <span>{votingProgress.voted}/{votingProgress.total} ({votingProgress.percentage}%)</span>
              </div>
              <Progress value={votingProgress.percentage} className="h-2" />
            </div>

            {/* Live vote bars */}
            <div className="space-y-2">
              {sortedCandidates.map((candidate, index) => {
                const voteCount = liveVoteCounts[candidate.id] || candidate.vote_count;
                const percentage = maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0;
                const isLeading = index === 0 && voteCount > 0;
                
                return (
                  <div key={candidate.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={candidate.photo_url || ""} />
                          <AvatarFallback className="text-xs">{candidate.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{candidate.full_name}</span>
                        {isLeading && (
                          <Badge className="bg-crown text-crown-foreground text-xs py-0">
                            Leading
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold">{voteCount}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isLeading ? "bg-crown" : "bg-primary/60"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vote button for registered voters */}
            {!hasVoted && isRegisteredVoter && (
              <Button 
                className="w-full mt-2" 
                onClick={() => setShowResultsDialog(true)}
              >
                <Vote className="w-4 h-4 mr-2" />
                Cast Your Vote
              </Button>
            )}
          </CardContent>
        </Card>
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
                <AvatarImage src={currentLeader.photo_url || ""} />
                <AvatarFallback>{currentLeader.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{currentLeader.full_name}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('noLeaderYet', 'No leader yet')}</p>
          )}
        </div>

        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Gavel className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium">{t('electionCommissioner', 'Commissioner')}</span>
          </div>
          {electionOfficer ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={electionOfficer.photo_url || ""} />
                <AvatarFallback>{electionOfficer.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{electionOfficer.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  {electionOfficer.auto_assigned ? "Auto-assigned" : "Elected"}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {officerNominations.length > 0 
                  ? `${officerNominations.length} nomination(s) pending`
                  : "No commissioner yet"}
              </p>
              {!hasNominated && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    setIsProcessing(true);
                    await onNominateSelf();
                    setIsProcessing(false);
                  }}
                  disabled={isProcessing}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Nominate Yourself
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Officer Nominations (when no officer) */}
      {!electionOfficer && officerNominations.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gavel className="w-4 h-4 text-accent" />
              Commissioner Nominations
              <Badge variant="outline" className="ml-auto">
                {officerNominations.length} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Vote to approve a commissioner. The first nominee with majority approval will be confirmed.
            </p>
            {officerNominations.map((nomination) => {
              const totalVotes = nomination.approvals_count + nomination.rejections_count;
              const approvalRate = totalVotes > 0 
                ? Math.round((nomination.approvals_count / totalVotes) * 100) 
                : 0;
              const needsMoreVotes = totalVotes < Math.ceil(members.length / 2);
              const hasEnoughApproval = nomination.approvals_count > members.length / 2;

              return (
                <div key={nomination.id} className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={nomination.nominee_photo || ""} />
                        <AvatarFallback>{nomination.nominee_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm font-medium block">{nomination.nominee_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {nomination.approvals_count} approvals, {nomination.rejections_count} rejections
                        </span>
                      </div>
                    </div>
                    {hasEnoughApproval && (
                      <Button
                        size="sm"
                        className="bg-accent hover:bg-accent/90"
                        onClick={async () => {
                          setIsProcessing(true);
                          await onConfirmOfficer(nomination);
                          setIsProcessing(false);
                        }}
                        disabled={isProcessing}
                      >
                        Confirm
                      </Button>
                    )}
                  </div>

                  {/* Approval bar */}
                  <div className="space-y-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-success transition-all"
                        style={{ width: `${approvalRate}%` }}
                      />
                      <div 
                        className="h-full bg-destructive transition-all"
                        style={{ width: `${100 - approvalRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{approvalRate}% approval</span>
                      <span>{totalVotes}/{members.length} voted</span>
                    </div>
                  </div>

                  {/* Vote buttons */}
                  {!nomination.has_user_voted && nomination.nominee_id !== currentUserId && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-success border-success/30 hover:bg-success/10"
                        onClick={async () => {
                          setIsProcessing(true);
                          await onVoteOnNomination(nomination.id, true);
                          setIsProcessing(false);
                        }}
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          setIsProcessing(true);
                          await onVoteOnNomination(nomination.id, false);
                          setIsProcessing(false);
                        }}
                        disabled={isProcessing}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {nomination.has_user_voted && (
                    <Badge variant="outline" className={cn(
                      "w-full justify-center",
                      nomination.user_vote_type === "approve" 
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    )}>
                      You {nomination.user_vote_type === "approve" ? "approved" : "rejected"} this nomination
                    </Badge>
                  )}

                  {nomination.nominee_id === currentUserId && (
                    <Badge variant="outline" className="w-full justify-center bg-accent/10 text-accent border-accent/30">
                      This is your nomination
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Online Members Count */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 text-sm">
          <Wifi className="w-4 h-4 text-online" />
          <span>{onlineMembers.length} members online</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{members.length} total</span>
        </div>
      </div>

      {/* Candidates List (Non-active elections) */}
      {candidates.length > 0 && currentElection?.status !== "active" && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            {t('candidates', 'Candidates')} ({candidates.length})
          </h4>
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {candidates.map(candidate => (
                <Card key={candidate.id} className={cn(
                  "p-3",
                  currentElection?.winner_id === candidate.user_id && "border-crown/50 bg-crown/10"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={candidate.photo_url || ""} />
                        <AvatarFallback>{candidate.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{candidate.full_name}</span>
                          {currentElection?.winner_id === candidate.user_id && (
                            <Badge className="bg-crown text-crown-foreground">
                              <Crown className="w-3 h-3 mr-1" />
                              {t('winner', 'Winner')}
                            </Badge>
                          )}
                        </div>
                        {currentElection?.status === "completed" && (
                          <span className="text-xs text-muted-foreground">
                            {candidate.vote_count} {t('votes', 'votes')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Election Commissioner Controls */}
      {isOfficer && (
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Gavel className="w-4 h-4 text-accent" />
            {t('commissionerControls', 'Commissioner Controls')}
          </h4>
          
          {!currentElection && (
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={handleCreateElection}
                disabled={isProcessing}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createElection', `Create ${currentYear} Election`)}
              </Button>
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => setShowScheduleDialog(true)}
                disabled={isProcessing}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('scheduleElection', 'Schedule Election')}
              </Button>
            </div>
          )}

          {currentElection?.status === "pending" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowAddCandidatesDialog(true)}
                  disabled={isProcessing}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  {t('addCandidates', 'Add Candidates')}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowScheduleDialog(true)}
                  disabled={isProcessing}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  {t('schedule', 'Schedule')}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleRegisterAllVoters}
                  disabled={isProcessing || voterRegistry.length === members.length}
                >
                  <Users className="w-4 h-4 mr-1" />
                  All ({members.length})
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleRegisterPresentVoters}
                  disabled={isProcessing || onlineMembers.length === 0}
                >
                  <Wifi className="w-4 h-4 mr-1" />
                  Online ({onlineMembers.length})
                </Button>
              </div>

              <Button 
                className="w-full" 
                onClick={handleStartElection}
                disabled={isProcessing || candidates.length < 2 || voterRegistry.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                {t('startElection', 'Start Election')}
              </Button>
              
              {candidates.length < 2 && (
                <p className="text-xs text-amber-600 text-center">
                  {t('needTwoCandidates', 'Need at least 2 candidates to start')}
                </p>
              )}
            </div>
          )}

          {currentElection?.status === "active" && (
            <Button 
              className="w-full" 
              variant="destructive"
              onClick={handleEndElection}
              disabled={isProcessing}
            >
              <Square className="w-4 h-4 mr-2" />
              {t('endElection', 'End Election & Announce Results')}
            </Button>
          )}

          {/* Reassign officer option */}
          {!currentElection && (
            <Button 
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleReassignOfficer}
              disabled={isProcessing}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reassign Commissioner (Most Senior)
            </Button>
          )}
        </div>
      )}

      {/* Schedule Election Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule Election
            </DialogTitle>
            <DialogDescription>
              Set the date and time when voting will begin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Election Date & Time</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleElection} 
              disabled={!scheduledDateTime || isProcessing}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Candidates Dialog */}
      <Dialog open={showAddCandidatesDialog} onOpenChange={setShowAddCandidatesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addCandidates', 'Add Candidates')}</DialogTitle>
            <DialogDescription>
              {t('selectCandidatesDesc', 'Select members to add as candidates')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {eligibleForCandidate.map(member => (
                <div 
                  key={member.userId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{member.fullName}</span>
                      {member.isOnline ? (
                        <Wifi className="w-3 h-3 text-green-500" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.seniority} days seniority</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCandidatesDialog(false)}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleAddCandidates} 
              disabled={selectedCandidates.length === 0 || isProcessing}
            >
              {t('addSelected', `Add ${selectedCandidates.length} Candidates`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voting Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-primary" />
              Cast Your Vote
            </DialogTitle>
            <DialogDescription>
              Select one candidate to vote for. You can only vote once.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {sortedCandidates.map(candidate => (
                <Card 
                  key={candidate.id}
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={async () => {
                    const success = await onCastVote(candidate.id);
                    if (success) {
                      setShowResultsDialog(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={candidate.photo_url || ""} />
                      <AvatarFallback>{candidate.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="font-medium">{candidate.full_name}</span>
                      {candidate.platform_statement && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {candidate.platform_statement}
                        </p>
                      )}
                    </div>
                    <Vote className="w-5 h-5 text-primary" />
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Tiebreaker Dialog */}
      <Dialog open={showTiebreakerDialog} onOpenChange={setShowTiebreakerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('tiebreaker', 'Tiebreaker Required')}
            </DialogTitle>
            <DialogDescription>
              {t('tiebreakerDesc', 'There is a tie! As the Election Commissioner, you must cast the deciding vote.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {tiedCandidates.map(candidate => (
              <Card 
                key={candidate.id}
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleTiebreakerVote(candidate.user_id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={candidate.photo_url || ""} />
                    <AvatarFallback>{candidate.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="font-medium">{candidate.full_name}</span>
                    <p className="text-xs text-muted-foreground">
                      {candidate.vote_count} votes
                    </p>
                  </div>
                  <Gavel className="w-5 h-5 text-purple-500" />
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElectionPanel;
