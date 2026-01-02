import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Video, Gift, Clock, Globe, Loader2, X } from 'lucide-react';
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
  caller_name?: string;
  caller_photo?: string;
}

interface PrivateCallInvitationProps {
  invitation: Invitation;
  currentUserId: string;
  onAccept: (invitationId: string, callId: string) => void;
  onDecline: (invitationId: string) => void;
  onClose: () => void;
}

export function PrivateCallInvitation({
  invitation,
  currentUserId,
  onAccept,
  onDecline,
  onClose,
}: PrivateCallInvitationProps) {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [callerProfile, setCallerProfile] = useState<{name: string; photo: string | null}>({ name: 'User', photo: null });

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
    const [giftsRes, walletRes] = await Promise.all([
      supabase
        .from('gifts')
        .select('id, name, emoji, price')
        .eq('is_active', true)
        .gte('price', invitation.min_gift_amount)
        .order('price', { ascending: true }),
      supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', currentUserId)
        .single()
    ]);

    if (giftsRes.data) setGifts(giftsRes.data);
    if (walletRes.data) setWalletBalance(walletRes.data.balance);
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
        onAccept(invitation.id, result.call_id);
      } else {
        toast.error(result.error || 'Failed to send gift');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send gift');
    } finally {
      setIsSendingGift(false);
    }
  };

  const handleDecline = async () => {
    try {
      await supabase
        .from('private_call_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);
      
      onDecline(invitation.id);
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  return (
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

          {/* Gift selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Send a gift to join the call:</p>
            <p className="text-xs text-muted-foreground">
              Your balance: ₹{walletBalance.toFixed(2)}
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
                No gifts available at this price range
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDecline}>
            <X className="h-4 w-4 mr-2" />
            Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
