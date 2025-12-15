import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertTriangle
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { Election, Candidate, ElectionOfficer, CommunityLeader, VoterRegistration } from "@/hooks/useElectionSystem";

interface ElectionPanelProps {
  currentUserId: string;
  currentElection: Election | null;
  candidates: Candidate[];
  voterRegistry: VoterRegistration[];
  currentLeader: CommunityLeader | null;
  electionOfficer: ElectionOfficer | null;
  hasVoted: boolean;
  isRegisteredVoter: boolean;
  isOfficer: boolean;
  currentYear: number;
  members: Array<{ userId: string; fullName: string; photoUrl: string | null; seniority: number }>;
  onCreateElection: () => Promise<boolean>;
  onAddCandidate: (userId: string) => Promise<boolean>;
  onRegisterAllVoters: (userIds: string[]) => Promise<boolean>;
  onStartElection: () => Promise<boolean>;
  onCastVote: (candidateId: string) => Promise<boolean>;
  onEndElection: () => Promise<{ success: boolean; isTie: boolean; tiedCandidates?: Candidate[] }>;
  onFinalizeElection: (winnerId: string) => Promise<{ success: boolean; isTie: boolean }>;
}

export const ElectionPanel = ({
  currentUserId,
  currentElection,
  candidates,
  voterRegistry,
  currentLeader,
  electionOfficer,
  hasVoted,
  isRegisteredVoter,
  isOfficer,
  currentYear,
  members,
  onCreateElection,
  onAddCandidate,
  onRegisterAllVoters,
  onStartElection,
  onCastVote,
  onEndElection,
  onFinalizeElection
}: ElectionPanelProps) => {
  const { t } = useTranslation();
  const [showAddCandidatesDialog, setShowAddCandidatesDialog] = useState(false);
  const [showTiebreakerDialog, setShowTiebreakerDialog] = useState(false);
  const [tiedCandidates, setTiedCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const registeredVoterIds = voterRegistry.map(v => v.user_id);
  const candidateUserIds = candidates.map(c => c.user_id);
  const eligibleForCandidate = members.filter(m => !candidateUserIds.includes(m.userId));

  const handleCreateElection = async () => {
    setIsProcessing(true);
    await onCreateElection();
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

  const toggleCandidateSelection = (userId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Election Status */}
      <div className={cn(
        "p-4 rounded-lg border",
        currentElection?.status === "active" 
          ? "bg-green-500/10 border-green-500/30" 
          : currentElection?.status === "pending"
            ? "bg-amber-500/10 border-amber-500/30"
            : currentElection?.status === "completed"
              ? "bg-blue-500/10 border-blue-500/30"
              : "bg-muted border-border"
      )}>
        <div className="flex items-center gap-2 mb-2">
          {currentElection?.status === "active" ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : currentElection?.status === "pending" ? (
            <Clock className="w-5 h-5 text-amber-500" />
          ) : currentElection?.status === "completed" ? (
            <Trophy className="w-5 h-5 text-blue-500" />
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
        
        {/* Voting status badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {currentElection?.status === "active" && (
            <>
              {isRegisteredVoter ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
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
            <span className="text-xs font-medium">{t('electionCommissioner', 'Election Commissioner')}</span>
          </div>
          {electionOfficer ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={electionOfficer.photo_url || ""} />
                <AvatarFallback>{electionOfficer.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm truncate block">{electionOfficer.full_name}</span>
                {electionOfficer.auto_assigned && (
                  <span className="text-xs text-muted-foreground">{t('autoAssigned', 'Auto-assigned')}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('assigningOfficer', 'Assigning officer...')}</p>
          )}
        </div>
      </div>

      {/* Candidates List */}
      {candidates.length > 0 && (
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
                  currentElection?.winner_id === candidate.user_id && "border-amber-500/50 bg-amber-500/10"
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
                            <Badge className="bg-amber-500 text-white">
                              <Crown className="w-3 h-3 mr-1" />
                              {t('winner', 'Winner')}
                            </Badge>
                          )}
                        </div>
                        {currentElection?.status !== "pending" && (
                          <span className="text-xs text-muted-foreground">
                            {candidate.vote_count} {t('votes', 'votes')}
                          </span>
                        )}
                      </div>
                    </div>
                    {currentElection?.status === "active" && !hasVoted && isRegisteredVoter && candidate.user_id !== currentUserId && (
                      <Button
                        size="sm"
                        onClick={() => onCastVote(candidate.id)}
                      >
                        <Vote className="w-4 h-4 mr-1" />
                        {t('vote', 'Vote')}
                      </Button>
                    )}
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
            <Gavel className="w-4 h-4 text-purple-500" />
            {t('commissionerControls', 'Commissioner Controls')}
          </h4>
          
          {!currentElection && (
            <Button 
              className="w-full" 
              onClick={handleCreateElection}
              disabled={isProcessing}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('createElection', `Create ${currentYear} Election`)}
            </Button>
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
                  onClick={handleRegisterAllVoters}
                  disabled={isProcessing || voterRegistry.length === members.length}
                >
                  <Users className="w-4 h-4 mr-1" />
                  {t('registerVoters', 'Register All')}
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
              {t('endElection', 'End Election & Count Votes')}
            </Button>
          )}
        </div>
      )}

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
                    <span className="font-medium text-sm">{member.fullName}</span>
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
                  <div>
                    <span className="font-medium">{candidate.full_name}</span>
                    <p className="text-sm text-muted-foreground">{candidate.vote_count} votes</p>
                  </div>
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
