import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoCallState {
  isSearching: boolean;
  isRinging: boolean;
  isConnected: boolean;
  callSession: {
    callId: string;
    womanUserId: string;
    womanName: string;
    womanPhoto: string | null;
    ratePerMinute: number;
  } | null;
  error: string | null;
  attemptCount: number;
}

interface UseVideoCallWithFailoverProps {
  currentUserId: string;
  userLanguage: string;
  walletBalance: number;
  maxRetries?: number;
}

interface ChatPricing {
  videoRatePerMinute: number;
  videoWomenEarningRate: number;
}

export const useVideoCallWithFailover = ({
  currentUserId,
  userLanguage,
  walletBalance,
  maxRetries = 5
}: UseVideoCallWithFailoverProps) => {
  const { toast } = useToast();
  const [state, setState] = useState<VideoCallState>({
    isSearching: false,
    isRinging: false,
    isConnected: false,
    callSession: null,
    error: null,
    attemptCount: 0
  });
  
  const [pricing, setPricing] = useState<ChatPricing>({
    videoRatePerMinute: 10,
    videoWomenEarningRate: 5
  });
  
  const excludedUsersRef = useRef<string[]>([]);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isRetryingRef = useRef(false);

  // Fetch admin-set pricing on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_pricing')
          .select('video_rate_per_minute, video_women_earning_rate')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setPricing({
            videoRatePerMinute: Number(data.video_rate_per_minute) || 10,
            videoWomenEarningRate: Number(data.video_women_earning_rate) || 5
          });
        }
      } catch (err) {
        console.error('[VideoCall] Error fetching pricing:', err);
      }
    };

    fetchPricing();
  }, []);

  // Clean up channel on unmount
  useEffect(() => {
    return () => {
      if (callChannelRef.current) {
        supabase.removeChannel(callChannelRef.current);
      }
    };
  }, []);

  // Subscribe to call status changes
  const subscribeToCallStatus = useCallback((callId: string) => {
    // Remove existing channel if any
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
    }

    const channel = supabase
      .channel(`video-call-status-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `call_id=eq.${callId}`
        },
        async (payload) => {
          const callData = payload.new as { 
            status: string; 
            call_id: string; 
            woman_user_id: string;
          };
          
          console.log('[VideoCall] Status update:', callData.status);

          if (callData.status === 'active') {
            // Call was answered
            setState(prev => ({
              ...prev,
              isRinging: false,
              isConnected: true
            }));
            toast({
              title: "Call Connected",
              description: "Video call is now active",
            });
          } else if (callData.status === 'declined' || callData.status === 'busy') {
            // Woman declined or was busy - try another
            console.log('[VideoCall] Call declined/busy, trying another woman...');
            
            // Add this woman to excluded list
            excludedUsersRef.current.push(callData.woman_user_id);
            
            // Try next available woman if under retry limit
            if (!isRetryingRef.current) {
              isRetryingRef.current = true;
              await tryNextAvailableWoman();
              isRetryingRef.current = false;
            }
          } else if (callData.status === 'ended' || callData.status === 'timeout') {
            // Call ended
            if (callChannelRef.current) {
              supabase.removeChannel(callChannelRef.current);
              callChannelRef.current = null;
            }
            setState(prev => ({
              ...prev,
              isSearching: false,
              isRinging: false,
              isConnected: false,
              callSession: null
            }));
          }
        }
      )
      .subscribe();

    callChannelRef.current = channel;
  }, [toast]);

  // Find and call next available woman
  const tryNextAvailableWoman = useCallback(async () => {
    const currentAttempt = state.attemptCount + 1;
    
    if (currentAttempt > maxRetries) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        isRinging: false,
        error: `No free user available of the same language (${userLanguage}).`,
        attemptCount: 0
      }));
      toast({
        title: "No Available Users",
        description: `No free user available of the same language (${userLanguage}). Please try again later.`,
        variant: "destructive",
      });
      excludedUsersRef.current = [];
      return;
    }

    setState(prev => ({
      ...prev,
      attemptCount: currentAttempt,
      isSearching: true,
      isRinging: false
    }));

    try {
      console.log(`[VideoCall] Attempt ${currentAttempt}/${maxRetries}, excluded:`, excludedUsersRef.current);
      
      // Call edge function to find available woman
      const { data: result, error } = await supabase.functions.invoke('ai-women-manager', {
        body: {
          action: 'distribute_for_call',
          data: { 
            language: userLanguage,
            excludeUserIds: excludedUsersRef.current
          }
        }
      });

      if (error) throw error;

      if (!result.success || !result.woman) {
        setState(prev => ({
          ...prev,
          isSearching: false,
          isRinging: false,
          error: result.reason || `No free user available of the same language (${userLanguage}).`,
          attemptCount: 0
        }));
        toast({
          title: "No Available Users",
          description: result.reason || `No free user available of the same language (${userLanguage}).`,
          variant: "destructive",
        });
        excludedUsersRef.current = [];
        return;
      }

      // Create video call session with ringing status using admin-set rate
      const callId = `call_${currentUserId}_${result.woman.user_id}_${Date.now()}`;
      
      const { error: sessionError } = await supabase
        .from('video_call_sessions')
        .insert({
          call_id: callId,
          man_user_id: currentUserId,
          woman_user_id: result.woman.user_id,
          status: 'ringing',
          rate_per_minute: pricing.videoRatePerMinute
        });

      if (sessionError) throw sessionError;

      // Subscribe to this call's status updates
      subscribeToCallStatus(callId);

      console.log('[VideoCall] Setting state to isRinging, callSession:', {
        callId,
        womanUserId: result.woman.user_id,
        womanName: result.woman.full_name,
      });

      setState(prev => ({
        ...prev,
        isSearching: false,
        isRinging: true,
        callSession: {
          callId,
          womanUserId: result.woman.user_id,
          womanName: result.woman.full_name || 'User',
          womanPhoto: result.woman.photo_url,
          ratePerMinute: pricing.videoRatePerMinute
        },
        error: null
      }));

      toast({
        title: "Calling...",
        description: `Connecting to ${result.woman.full_name}`,
      });

      // Set up auto-timeout after 30 seconds if no response
      setTimeout(async () => {
        // Check if still ringing
        const { data: callData } = await supabase
          .from('video_call_sessions')
          .select('status')
          .eq('call_id', callId)
          .single();

        if (callData?.status === 'ringing') {
          console.log('[VideoCall] Call timeout, marking as timeout and trying next');
          await supabase
            .from('video_call_sessions')
            .update({ 
              status: 'timeout', 
              ended_at: new Date().toISOString(),
              end_reason: 'no_answer'
            })
            .eq('call_id', callId);
          
          // Add to excluded and try next
          excludedUsersRef.current.push(result.woman.user_id);
          if (!isRetryingRef.current) {
            isRetryingRef.current = true;
            await tryNextAvailableWoman();
            isRetryingRef.current = false;
          }
        }
      }, 30000);

    } catch (error) {
      console.error('[VideoCall] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start video call. Please try again.';
      setState(prev => ({
        ...prev,
        isSearching: false,
        isRinging: false,
        error: errorMessage,
        attemptCount: 0
      }));
      toast({
        title: "Video Call Error",
        description: errorMessage,
        variant: "destructive",
      });
      excludedUsersRef.current = [];
    }
  }, [currentUserId, userLanguage, maxRetries, state.attemptCount, subscribeToCallStatus, toast]);

  // Start a new video call
  const startVideoCall = useCallback(async () => {
    console.log('[VideoCall] startVideoCall called');
    // Reset state
    excludedUsersRef.current = [];
    setState(prev => ({
      ...prev,
      attemptCount: 0,
      error: null
    }));

    // Check if user is super user (bypass balance check)
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';
    const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);

    if (!isSuperUser) {
      // Calculate minimum balance needed for at least 1 minute of video call
      // Using admin-set video rate
      const minBalance = Math.ceil(pricing.videoRatePerMinute);
      
      if (walletBalance <= 0) {
        const errorMsg = "Your wallet balance is ₹0. Recharge is mandatory to start video calls.";
        setState(prev => ({ ...prev, error: errorMsg }));
        return { needsRecharge: true, message: errorMsg };
      }
      
      if (walletBalance < minBalance) {
        const errorMsg = `You need at least ₹${minBalance} (1 minute @ ₹${pricing.videoRatePerMinute}/min) to start a video call. Your current balance is ₹${walletBalance}.`;
        setState(prev => ({ ...prev, error: errorMsg }));
        return { needsRecharge: true, message: errorMsg };
      }
    }

    await tryNextAvailableWoman();
    return { needsRecharge: false };
  }, [walletBalance, pricing.videoRatePerMinute, tryNextAvailableWoman]);

  // End the current call
  const endCall = useCallback(async () => {
    if (state.callSession) {
      await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          end_reason: 'user_ended'
        })
        .eq('call_id', state.callSession.callId);
    }

    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }

    excludedUsersRef.current = [];
    setState({
      isSearching: false,
      isRinging: false,
      isConnected: false,
      callSession: null,
      error: null,
      attemptCount: 0
    });
  }, [state.callSession]);

  // Cancel the ongoing search
  const cancelSearch = useCallback(async () => {
    if (state.callSession) {
      await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          end_reason: 'caller_cancelled'
        })
        .eq('call_id', state.callSession.callId);
    }

    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }

    excludedUsersRef.current = [];
    setState({
      isSearching: false,
      isRinging: false,
      isConnected: false,
      callSession: null,
      error: null,
      attemptCount: 0
    });
  }, [state.callSession]);

  return {
    ...state,
    startVideoCall,
    endCall,
    cancelSearch,
    isActive: state.isSearching || state.isRinging || state.isConnected
  };
};
