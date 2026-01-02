import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PrivateCallInvitation } from './PrivateCallInvitation';
import { PrivateVideoCallDialog } from './PrivateVideoCallDialog';

interface Invitation {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: string;
  min_gift_amount: number;
  caller_language: string | null;
  created_at: string;
  expires_at: string;
}

interface PrivateCallInvitationListenerProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  userGender: string;
}

export function PrivateCallInvitationListener({
  currentUserId,
  userName,
  userPhoto,
  userGender,
}: PrivateCallInvitationListenerProps) {
  const [pendingInvitation, setPendingInvitation] = useState<Invitation | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    partnerName: string;
    partnerPhoto: string | null;
    partnerLanguage?: string;
  } | null>(null);

  useEffect(() => {
    // Only listen for invitations if user is a man
    if (userGender !== 'male') return;

    // Check for existing pending invitations
    const checkExistingInvitations = async () => {
      const { data } = await supabase
        .from('private_call_invitations')
        .select('*')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setPendingInvitation(data[0]);
      }
    };

    checkExistingInvitations();

    // Subscribe to new invitations
    const channel = supabase
      .channel('private-call-invitations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_call_invitations',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const invitation = payload.new as Invitation;
          if (invitation.status === 'pending') {
            // Get caller's profile
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', invitation.caller_id)
              .single();

            toast.info(`${callerProfile?.full_name || 'Someone'} is inviting you to a private video call!`);
            setPendingInvitation(invitation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userGender]);

  // Listen for active calls (for women who sent invitations)
  useEffect(() => {
    if (userGender !== 'female') return;

    const channel = supabase
      .channel('private-calls-active')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_calls',
          filter: `caller_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const call = payload.new as { id: string; receiver_id: string; status: string };
          if (call.status === 'active') {
            // Get partner's profile
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('full_name, photo_url, primary_language')
              .eq('user_id', call.receiver_id)
              .single();

            toast.success('Your call invitation was accepted!');
            setActiveCall({
              callId: call.id,
              partnerName: partnerProfile?.full_name || 'User',
              partnerPhoto: partnerProfile?.photo_url || null,
              partnerLanguage: partnerProfile?.primary_language || undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userGender]);

  const handleAcceptInvitation = async (invitationId: string, callId: string) => {
    if (!pendingInvitation) return;

    // Get caller's profile
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('full_name, photo_url, primary_language')
      .eq('user_id', pendingInvitation.caller_id)
      .single();

    setPendingInvitation(null);
    setActiveCall({
      callId,
      partnerName: callerProfile?.full_name || 'User',
      partnerPhoto: callerProfile?.photo_url || null,
      partnerLanguage: pendingInvitation.caller_language || callerProfile?.primary_language || undefined,
    });
  };

  const handleDeclineInvitation = () => {
    setPendingInvitation(null);
  };

  const handleCloseCall = () => {
    setActiveCall(null);
  };

  return (
    <>
      {/* Invitation dialog for men */}
      {pendingInvitation && (
        <PrivateCallInvitation
          invitation={pendingInvitation}
          currentUserId={currentUserId}
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
          onClose={() => setPendingInvitation(null)}
        />
      )}

      {/* Active call dialog */}
      {activeCall && (
        <PrivateVideoCallDialog
          callId={activeCall.callId}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          partnerName={activeCall.partnerName}
          partnerPhoto={activeCall.partnerPhoto}
          partnerLanguage={activeCall.partnerLanguage}
          onClose={handleCloseCall}
        />
      )}
    </>
  );
}
