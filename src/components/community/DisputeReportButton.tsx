import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";

interface DisputeReportButtonProps {
  currentUserId: string;
  motherTongue: string;
  members: Array<{
    userId: string;
    fullName: string;
  }>;
}

export const DisputeReportButton = ({
  currentUserId,
  motherTongue,
  members
}: DisputeReportButtonProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispute, setDispute] = useState({
    type: "general",
    reportedUserId: "",
    title: "",
    description: ""
  });

  const handleSubmit = async () => {
    if (!dispute.title.trim()) {
      toast({
        title: t('error', 'Error'),
        description: t('titleRequired', 'Title is required'),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("community_disputes")
        .insert({
          language_code: motherTongue,
          reporter_id: currentUserId,
          reported_user_id: dispute.reportedUserId || null,
          dispute_type: dispute.type,
          title: dispute.title,
          description: dispute.description || null
        });

      if (error) throw error;

      toast({
        title: t('reportSubmitted', 'Report Submitted'),
        description: t('leaderWillReview', 'The community leader will review your report')
      });

      setIsOpen(false);
      setDispute({ type: "general", reportedUserId: "", title: "", description: "" });
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('submitFailed', 'Failed to submit report'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-amber-600">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {t('reportIssue', 'Report Issue')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reportDispute', 'Report a Dispute')}</DialogTitle>
          <DialogDescription>
            {t('disputeDesc', 'Submit an issue for the community leader to review')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('issueType', 'Issue Type')}</Label>
            <Select 
              value={dispute.type} 
              onValueChange={(v) => setDispute(prev => ({ ...prev, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t('general', 'General Issue')}</SelectItem>
                <SelectItem value="conflict">{t('conflict', 'Conflict with Member')}</SelectItem>
                <SelectItem value="scheduling">{t('scheduling', 'Scheduling Issue')}</SelectItem>
                <SelectItem value="behavior">{t('behavior', 'Inappropriate Behavior')}</SelectItem>
                <SelectItem value="technical">{t('technical', 'Technical Problem')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dispute.type === "conflict" || dispute.type === "behavior" ? (
            <div>
              <Label>{t('involvedMember', 'Involved Member')} ({t('optional', 'optional')})</Label>
              <Select 
                value={dispute.reportedUserId} 
                onValueChange={(v) => setDispute(prev => ({ ...prev, reportedUserId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectMember', 'Select member')} />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.userId !== currentUserId)
                    .map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <Label>{t('title', 'Title')}</Label>
            <Input 
              value={dispute.title}
              onChange={(e) => setDispute(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('disputeTitle', 'Brief title for your issue')}
            />
          </div>

          <div>
            <Label>{t('description', 'Description')} ({t('optional', 'optional')})</Label>
            <Textarea 
              value={dispute.description}
              onChange={(e) => setDispute(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('disputeDetails', 'Provide more details about the issue...')}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('submitting', 'Submitting...') : t('submit', 'Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeReportButton;
