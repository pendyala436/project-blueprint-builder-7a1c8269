import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Video, Gift, Clock, Globe, Loader2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

interface Invitation {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: string;
  min_gift_amount: number;
  caller_language: string | null;
  created_at: string;
  expires_at: string;
  callerName?: string;
  callerPhoto?: string | null;
}

interface PrivateCallInvitationProps {
  invitation: Invitation;
  currentUserId: string;
  onAccept: (invitationId: string, callId: string) => void;
  onDecline: (invitationId: string) => void;
  onClose: () => void;
  inline?: boolean;
}

// Allowed gift prices for 1-to-1 private calls
const PRIVATE_CALL_PRICES = [200, 300, 400, 600, 800, 1000];

export function PrivateCallInvitation({
  invitation,
  currentUserId,
  onAccept,
  onDecline,
  onClose,
  inline = false,
}: PrivateCallInvitationProps) {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [callerProfile, setCallerProfile] = useState<{name: string; photo: string | null}>({ name: 'User', photo: null });
  const [showGiftDialog, setShowGiftDialog] = useState(false);

  useEffect(() => {
    fetchGiftsAndBalance();
    fetchCallerProfile();
  }, [invitation]);

  const fetchCallerProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, photo_url')
      .eq('user_id', invitation.caller_id)
      .single();
    
    if (data) {
      setCallerProfile({
        name: data.full_name || 'User',
        photo: data.photo_url,
      });
    }
  };

  const fetchGiftsAndBalance = async () => {
    // Filter gifts to allowed prices that meet minimum requirement
    const allowedPrices = PRIVATE_CALL_PRICES.filter(p => p >= invitation.min_gift_amount);
    
    const [giftsRes, walletRes] = await Promise.all([
      supabase
        .from('gifts')
        .select('id, name, emoji, price')
        .eq('is_active', true)
        .in('price', allowedPrices)
        .order('price', { ascending: true }),
      supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', currentUserId)
        .maybeSingle()
    ]);

    if (giftsRes.data) setGifts(giftsRes.data);
    if (walletRes.data) setWalletBalance(walletRes.data.balance || 0);
  };

  const handleSendGift = async (gift: GiftItem) => {
    if (walletBalance < gift.price) {
      toast.error('Insufficient balance. Please recharge your wallet.');
      return;
    }

    setIsSendingGift(true);
    try {
      const { data, error } = await supabase.rpc('process_private_call_gift', {
        p_sender_id: currentUserId,
        p_receiver_id: invitation.caller_id,
        p_gift_id: gift.id,
        p_invitation_id: invitation.id,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        call_id?: string;
        gift_name?: string;
        gift_emoji?: string;
      };

      if (result.success && result.call_id) {
        toast.success(`Gift sent! You have 30 minutes of private video call.`, {
          description: `${result.gift_emoji} ${result.gift_name} - 50% to her, 50% to admin`,
        });
        setShowGiftDialog(false);
        onAccept(invitation.id, result.call_id);
      } else {
        toast.error(result.error || 'Failed to send gift');
      }
    } catch (error: any) {
      console.error('Error sending gift:', error);
      toast.error(error.message || 'Failed to send gift');
    } finally {
      setIsSendingGift(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const { error } = await supabase
        .from('private_call_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);
      
      if (error) throw error;
      
      toast.success('Invitation declined');
      onDecline(invitation.id);
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    } finally {
      setIsDeclining(false);
    }
  };

  const handleAcceptClick = async () => {
    // Always fetch fresh data first
    await fetchGiftsAndBalance();
    setShowGiftDialog(true);
  };

  // Inline mode - render as buttons for embedding in sections
  if (inline) {
    return (
      <>
        <div className="flex gap-2 w-full">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1"
            onClick={handleAcceptClick}
            disabled={isSendingGift}
          >
            {isSendingGift ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="h-3 w-3" />
                Accept (₹{invitation.min_gift_amount}+)
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            onClick={handleDecline}
            disabled={isDeclining}
          >
            {isDeclining ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <X className="h-3 w-3" />
                Reject
              </>
            )}
          </Button>
        </div>

        {/* Gift selection dialog */}
        <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Select Gift to Accept Call
              </DialogTitle>
              <DialogDescription>
                Send a gift to join the 30-minute private video call with {callerProfile.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Your balance: <span className="font-semibold text-foreground">₹{walletBalance.toFixed(0)}</span>
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {gifts.map((gift) => (
                  <Button
                    key={gift.id}
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    disabled={isSendingGift || walletBalance < gift.price}
                    onClick={() => handleSendGift(gift)}
                  >
                    {isSendingGift ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <span className="text-2xl">{gift.emoji}</span>
                        <span className="text-xs font-normal">{gift.name}</span>
                        <span className="text-xs font-semibold text-primary">₹{gift.price}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
              
              {gifts.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No gifts available. Please try again.
                </p>
              )}
              
              {walletBalance < invitation.min_gift_amount && (
                <p className="text-center text-destructive text-xs">
                  Insufficient balance. Please recharge your wallet.
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGiftDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Dialog mode - full dialog for standalone use
  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Private Video Call Invitation
            </DialogTitle>
            <DialogDescription>
              {callerProfile.name} is inviting you to a 1-on-1 private video call
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Caller info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarImage src={callerProfile.photo || undefined} />
                <AvatarFallback className="text-xl">{callerProfile.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{callerProfile.name}</p>
                {invitation.caller_language && (
                  <Badge variant="outline" className="gap-1 mt-1">
                    <Globe className="h-3 w-3" />
                    {invitation.caller_language}
                  </Badge>
                )}
              </div>
            </div>

            {/* Info badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                30 minutes access
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Gift className="h-3 w-3" />
                Min ₹{invitation.min_gift_amount} gift required
              </Badge>
            </div>

            {/* Balance info */}
            <div className="text-sm text-muted-foreground">
              Your balance: <span className="font-semibold text-foreground">₹{walletBalance.toFixed(0)}</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={handleDecline} 
              disabled={isDeclining}
              className="w-full sm:w-auto"
            >
              {isDeclining ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button 
              onClick={handleAcceptClick}
              disabled={isSendingGift}
              className="w-full sm:w-auto"
            >
              {isSendingGift ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Accept (₹{invitation.min_gift_amount}+)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gift selection dialog */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Select Gift to Accept Call
            </DialogTitle>
            <DialogDescription>
              Send a gift to join the 30-minute private video call with {callerProfile.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Your balance: <span className="font-semibold text-foreground">₹{walletBalance.toFixed(0)}</span>
            </p>
            
            <ScrollArea className="h-48">
              <div className="grid grid-cols-2 gap-2 pr-2">
                {gifts.map((gift) => (
                  <Button
                    key={gift.id}
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    disabled={isSendingGift || walletBalance < gift.price}
                    onClick={() => handleSendGift(gift)}
                  >
                    {isSendingGift ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <span className="text-2xl">{gift.emoji}</span>
                        <span className="text-xs font-normal">{gift.name}</span>
                        <span className="text-xs font-semibold text-primary">₹{gift.price}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            
            {gifts.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                No gifts available. Please try again.
              </p>
            )}
            
            {walletBalance < invitation.min_gift_amount && (
              <p className="text-center text-destructive text-xs">
                Insufficient balance. Please recharge your wallet.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGiftDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
