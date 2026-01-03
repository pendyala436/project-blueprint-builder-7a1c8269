import { useState } from "react";
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
  Sparkles,
  Megaphone,
  Calendar,
  Shield,
  UserPlus,
  FileText,
  Timer,
  AlertCircle,
  Award
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { useAIElectionSystem } from "@/hooks/useAIElectionSystem";
import { format, formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";

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
  const [showSelfNominateDialog, setShowSelfNominateDialog] = useState(false);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [showCandidateDetailsDialog, setShowCandidateDetailsDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [platformStatement, setPlatformStatement] = useState("");

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

  // Calculate voting period remaining
  const votingEndsAt = election?.scheduled_at ? new Date(election.scheduled_at) : null;
  const daysRemaining = votingEndsAt ? differenceInDays(votingEndsAt, new Date()) : 0;
  const hoursRemaining = votingEndsAt ? differenceInHours(votingEndsAt, new Date()) % 24 : 0;

  // Check if current user is already a candidate
  const isCurrentUserCandidate = candidates.some(c => c.user_id === currentUserId);

  const handleNominate = async (userId: string, statement?: string) => {
    await nominateCandidate(userId, statement);
    setShowNominateDialog(false);
  };

  const handleSelfNominate = async () => {
    if (!platformStatement.trim()) return;
    await nominateCandidate(currentUserId, platformStatement, true);
    setPlatformStatement("");
    setShowSelfNominateDialog(false);
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

  const viewCandidateDetails = (candidate: any) => {
    setSelectedCandidate(candidate);
    setShowCandidateDetailsDialog(true);
  };

  const eligibleForNomination = members.filter(
    m => !candidates.some(c => c.user_id === m.userId)
  );

  return (
    <div className="space-y-4">
      {/* AI Badge */}
      <div className="flex items-center justify-between">
        <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Managed Elections
        </Badge>
        <Badge variant="outline" className="text-xs">
          {status.termYears} year term
        </Badge>
      </div>

      {/* Voting Period Timer */}
      {hasActiveElection && votingEndsAt && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-info" />
                <span className="text-sm font-medium">Voting Period</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-info/10 border-info/30 text-info">
                  {daysRemaining > 0 ? `${daysRemaining}d ${hoursRemaining}h left` : `${hoursRemaining}h left`}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ends: {format(votingEndsAt, "MMM d, yyyy 'at' h:mm a")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Leader */}
      <Card className={cn(
        "border-2",
        leader ? "border-crown/30 bg-crown/5" : "border-muted"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-crown/20">
              <Crown className="h-5 w-5 text-crown" />
            </div>
            {leader ? (
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10 border-2 border-crown/50">
                  <AvatarImage src={leader.photo_url || ""} />
                  <AvatarFallback className="bg-crown/20">{leader.full_name?.[0]}</AvatarFallback>
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
                <Clock className="h-3 w-3" /> Coordinate shifts
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Schedule management
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" /> Assist new users
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
          ? "border-success/30 bg-success/5" 
          : "border-muted"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              {hasActiveElection ? "Election in Progress" : "Elections"}
            </div>
            {hasActiveElection && (
              <Badge className="bg-live text-live-foreground animate-pulse">LIVE</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasActiveElection ? (
            <>
              {/* Stats Row */}
              <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{candidates.length} Candidates</span>
                </div>
                <div className="flex items-center gap-1">
                  <Vote className="h-4 w-4 text-muted-foreground" />
                  <span>{totalVotes} Votes</span>
                </div>
              </div>

              {/* Candidates List */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Candidates (click to view statement):</p>
                {sortedCandidates.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No candidates yet. Be the first to run!</p>
                  </div>
                ) : (
                  sortedCandidates.map((candidate, index) => {
                    const percentage = maxVotes > 0 ? (candidate.vote_count / maxVotes) * 100 : 0;
                    const isLeading = index === 0 && candidate.vote_count > 0;
                    
                    return (
                      <div 
                        key={candidate.id} 
                        className="space-y-1 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => viewCandidateDetails(candidate)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={candidate.photo_url || ""} />
                                <AvatarFallback className="text-xs">
                                  {candidate.full_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              {isLeading && (
                                <Award className="h-4 w-4 text-crown absolute -top-1 -right-1" />
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-medium">{candidate.full_name}</span>
                              {candidate.user_id === currentUserId && (
                                <Badge variant="outline" className="ml-2 text-xs py-0">You</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isLeading && (
                              <Badge className="bg-crown text-crown-foreground text-xs py-0">
                                Leading
                              </Badge>
                            )}
                            <span className="text-sm font-bold">{candidate.vote_count}</span>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
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
                  <Badge variant="outline" className="w-full justify-center py-2 bg-success/10 border-success/30 text-success">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    You have voted
                  </Badge>
                )}

                {/* Self Nominate */}
                {!isCurrentUserCandidate && (
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => setShowSelfNominateDialog(true)}
                    disabled={isProcessing}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Run for Leader
                  </Button>
                )}

                {/* Nominate Others */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => setShowNominateDialog(true)}
                  disabled={isProcessing}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nominate Someone Else
                </Button>

                {/* End Election (for testing - in prod AI auto-ends) */}
                {totalVotes > 0 && candidates.length >= 1 && (
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
              </div>
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
                Start New Election (7-day voting)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Self Nominate Dialog */}
      <Dialog open={showSelfNominateDialog} onOpenChange={setShowSelfNominateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Run for Community Leader
            </DialogTitle>
            <DialogDescription>
              Write a statement explaining why you want to be the leader and what you'll do for the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Platform Statement</label>
              <Textarea
                value={platformStatement}
                onChange={(e) => setPlatformStatement(e.target.value)}
                placeholder="I want to serve as leader because... My goals for our community are..."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This statement will be visible to all voters
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-2">Requirements:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Must have been active in the last 30 days</li>
                <li>• 1 year term if elected</li>
                <li>• Responsible for shifts, helping users, and resolving disputes</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelfNominateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSelfNominate}
              disabled={!platformStatement.trim() || isProcessing}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Submit Nomination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nominate Others Dialog */}
      <Dialog open={showNominateDialog} onOpenChange={setShowNominateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nominate a Candidate</DialogTitle>
            <DialogDescription>
              Select a community member to nominate as a candidate for leader. They must have been active in the last 30 days.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-2 pr-2">
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
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              Your vote is anonymous and secure. Read candidate statements before voting!
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-2">
              {sortedCandidates.map(candidate => (
                <div
                  key={candidate.id}
                  className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={candidate.photo_url || ""} />
                      <AvatarFallback>{candidate.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{candidate.full_name}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {candidate.vote_count} votes
                      </p>
                      {candidate.platform_statement && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          "{candidate.platform_statement}"
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-3"
                    onClick={() => handleVote(candidate.id)}
                    disabled={isProcessing}
                  >
                    <Vote className="h-4 w-4 mr-2" />
                    Vote for {candidate.full_name?.split(" ")[0]}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Candidate Details Dialog */}
      <Dialog open={showCandidateDetailsDialog} onOpenChange={setShowCandidateDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidate Profile</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCandidate.photo_url || ""} />
                  <AvatarFallback className="text-lg">
                    {selectedCandidate.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{selectedCandidate.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCandidate.vote_count} votes received
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Platform Statement
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">
                    {selectedCandidate.platform_statement || "No statement provided."}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCandidateDetailsDialog(false)}>
              Close
            </Button>
            {!hasVoted && selectedCandidate && (
              <Button onClick={() => {
                handleVote(selectedCandidate.id);
                setShowCandidateDetailsDialog(false);
              }}>
                <Vote className="h-4 w-4 mr-2" />
                Vote for This Candidate
              </Button>
            )}
          </DialogFooter>
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
