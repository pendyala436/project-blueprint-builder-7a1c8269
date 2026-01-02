import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Video, Loader2, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GiftOption {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

interface SendPrivateCallButtonProps {
  currentUserId: string;
  currentUserLanguage: string;
  targetUserId: string;
  targetUserName: string;
  targetUserLanguage: string;
  onInvitationSent?: (invitationId: string) => void;
}

export function SendPrivateCallButton({
  currentUserId,
  currentUserLanguage,
  targetUserId,
  targetUserName,
  targetUserLanguage,
  onInvitationSent,
}: SendPrivateCallButtonProps) {
  // Only allow private calls between same-language users
  const isSameLanguage = currentUserLanguage.toLowerCase() === targetUserLanguage.toLowerCase();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [minGiftAmount, setMinGiftAmount] = useState(200); // Higher default for 1-to-1
  const [availableGifts, setAvailableGifts] = useState<GiftOption[]>([]);

  const PRIVATE_CALL_PRICES = [200, 300, 400, 600, 800, 1000];

  const fetchAvailableGifts = async () => {
    const { data } = await supabase
      .from('gifts')
      .select('id, name, emoji, price')
      .eq('is_active', true)
      .in('price', PRIVATE_CALL_PRICES)
      .order('price', { ascending: true });
    
    if (data) {
      setAvailableGifts(data);
    }
  };

  const handleOpenDialog = async () => {
    await fetchAvailableGifts();
    setShowDialog(true);
  };

  const handleSendInvitation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('private_call_invitations')
        .insert({
          caller_id: currentUserId,
          receiver_id: targetUserId,
          min_gift_amount: minGiftAmount,
          caller_language: currentUserLanguage,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Private call invitation sent to ${targetUserName}!`, {
        description: `They need to send a gift of ₹${minGiftAmount}+ to join the call.`,
      });
      
      setShowDialog(false);
      onInvitationSent?.(data.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render button if languages don't match
  if (!isSameLanguage) {
    return null;
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-1 h-7 px-2 text-xs"
        onClick={(e) => { e.stopPropagation(); handleOpenDialog(); }}
      >
        <Video className="h-3 w-3" />
        Call
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Send Private Call Invitation
            </DialogTitle>
            <DialogDescription>
              Invite {targetUserName} to a 1-on-1 private video call. They will need to send you a gift to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-primary" />
                <span className="font-medium">30 minutes access per gift</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                50% of gift goes to you, 50% to admin. Higher prices for exclusive 1-on-1 time!
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum Gift Required</Label>
              <Select value={String(minGiftAmount)} onValueChange={(val) => setMinGiftAmount(Number(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select minimum gift" />
                </SelectTrigger>
                <SelectContent>
                  {availableGifts.map((gift) => (
                    <SelectItem key={gift.id} value={String(gift.price)}>
                      {gift.emoji} {gift.name} - ₹{gift.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set a higher price for exclusive 1-on-1 private calls.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvitation} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
