import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  Megaphone,
  Calendar,
  Shield
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { useAIElectionSystem } from "@/hooks/useAIElectionSystem";
import { format, formatDistanceToNow } from "date-fns";

interface AIElectionPanelProps {
  currentUserId: string;
  languageCode: string;
  members: {
    userId: string;
    fullName: string;
    photoUrl: string | null;
    isOnline: boolean;
  }[];
}

export const AIElectionPanel = ({
  currentUserId,
  languageCode,
  members
}: AIElectionPanelProps) => {
  const { t } = useTranslation();
  const {
    status,
    isLoading,
    isProcessing,
    isLeader,
    hasActiveElection,
    hasVoted,
    startElection,
    nominateCandidate,
    castVote,
    endElection,
    sendAnnouncement
  } = useAIElectionSystem(languageCode, currentUserId);

  const [showNominateDialog, setShowNominateDialog] = useState(false);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

  if (isLoading || !status) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const { election, leader, candidates, totalVotes, needsNewElection } = status;
  const sortedCandidates = [...candidates].sort((a, b) => b.vote_count - a.vote_count);
  const maxVotes = sortedCandidates.length > 0 
    ? Math.max(...sortedCandidates.map(c => c.vote_count), 1) 
    : 1;

  const handleNominate = async (userId: string) => {
    await nominateCandidate(userId);
    setShowNominateDialog(false);
  };

  const handleVote = async (candidateId: string) => {
    await castVote(candidateId);
    setShowVoteDialog(false);
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) return;
    await sendAnnouncement(announcementTitle, announcementContent);
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setShowAnnouncementDialog(false);
  };

  const eligibleForNomination = members.filter(
    m => !candidates.some(c => c.user_id === m.userId)
  );

  return (
    <div className="space-y-4">
      {/* AI Badge */}
      <div className="flex items-center justify-between">
        <Badge className="bg-gradient-to-r from-primary to-accent text-white">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Managed Elections
        </Badge>
        <Badge variant="outline" className="text-xs">
          {status.termYears} year term
        </Badge>
      </div>

      {/* Current Leader */}
      <Card className={cn(
        "border-2",
        leader ? "border-amber-500/30 bg-amber-500/5" : "border-muted"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            {leader ? (
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={leader.photo_url || ""} />
                  <AvatarFallback>{leader.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{leader.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Term ends: {format(new Date(leader.term_end), "MMM d, yyyy")}
                  </p>
                </div>
                {isLeader && (
                  <Badge className="bg-primary">You</Badge>
                )}
              </div>
            ) : (
              <div className="flex-1">
                <p className="font-medium">No Leader Elected</p>
                <p className="text-sm text-muted-foreground">
                  Start an election to choose a community leader
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leader Responsibilities */}
      {leader && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Leader Responsibilities:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> 9h shifts + 1h change
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Week off every 2 days
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" /> Help new users
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" /> Resolve disputes
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leader Actions */}
      {isLeader && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setShowAnnouncementDialog(true)}
          >
            <Megaphone className="h-4 w-4 mr-1" />
            Announcement
          </Button>
        </div>
      )}

      {/* Election Status */}
      <Card className={cn(
        "border-2",
        hasActiveElection 
          ? "border-green-500/30 bg-green-500/5" 
          : "border-muted"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              {hasActiveElection ? "Election in Progress" : "Elections"}
            </div>
            {hasActiveElection && (
              <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasActiveElection ? (
            <>
              {/* Live Results */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Votes</span>
                  <span>{totalVotes}</span>
                </div>
              </div>

              {/* Candidates */}
              <div className="space-y-2">
                {sortedCandidates.map((candidate, index) => {
                  const percentage = maxVotes > 0 ? (candidate.vote_count / maxVotes) * 100 : 0;
                  const isLeading = index === 0 && candidate.vote_count > 0;
                  
                  return (
                    <div key={candidate.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={candidate.photo_url || ""} />
                            <AvatarFallback className="text-xs">
                              {candidate.full_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{candidate.full_name}</span>
                          {isLeading && (
                            <Badge className="bg-amber-500 text-white text-xs py-0">
                              Leading
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-bold">{candidate.vote_count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>

              {/* Vote Button */}
              {!hasVoted ? (
                <Button 
                  className="w-full" 
                  onClick={() => setShowVoteDialog(true)}
                  disabled={isProcessing || candidates.length === 0}
                >
                  <Vote className="h-4 w-4 mr-2" />
                  Cast Your Vote (Anonymous)
                </Button>
              ) : (
                <Badge variant="successOutline" className="w-full justify-center py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  You have voted
                </Badge>
              )}

              {/* Nominate More */}
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => setShowNominateDialog(true)}
                disabled={isProcessing}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nominate Candidate
              </Button>

              {/* End Election (for testing - in prod AI auto-ends) */}
              {totalVotes > 0 && candidates.length >= 2 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="w-full"
                  onClick={endElection}
                  disabled={isProcessing}
                >
                  End Election & Declare Winner
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {needsNewElection 
                  ? "The leader's term has ended. Start a new election!"
                  : "No active election. Any member can start one."}
              </p>
              <Button 
                className="w-full" 
                onClick={startElection}
                disabled={isProcessing}
              >
                <Play className="h-4 w-4 mr-2" />
                Start New Election
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Nominate Dialog */}
      <Dialog open={showNominateDialog} onOpenChange={setShowNominateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nominate a Candidate</DialogTitle>
            <DialogDescription>
              Select a community member to nominate as a candidate for leader
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {eligibleForNomination.map(member => (
              <button
                key={member.userId}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                onClick={() => handleNominate(member.userId)}
                disabled={isProcessing}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.photoUrl || ""} />
                  <AvatarFallback>{member.fullName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-left flex-1">
                  <p className="font-medium">{member.fullName}</p>
                  {member.isOnline && (
                    <Badge variant="outline" className="text-xs">Online</Badge>
                  )}
                </div>
                <Plus className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
            {eligibleForNomination.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                All members are already candidates
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              Your vote is anonymous. Choose wisely!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {sortedCandidates.map(candidate => (
              <button
                key={candidate.id}
                className="w-full flex items-center gap-3 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleVote(candidate.id)}
                disabled={isProcessing}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={candidate.photo_url || ""} />
                  <AvatarFallback>{candidate.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-left flex-1">
                  <p className="font-semibold">{candidate.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {candidate.vote_count} votes
                  </p>
                </div>
                <Vote className="h-6 w-6 text-primary" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Announcement</DialogTitle>
            <DialogDescription>
              Send a message to all community members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Announcement title..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Your message..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendAnnouncement}
              disabled={!announcementTitle.trim() || !announcementContent.trim() || isProcessing}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIElectionPanel;
