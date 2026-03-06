import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, PauseCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DraggableVideoCallWindow from "./DraggableVideoCallWindow";
import { cn } from "@/lib/utils";

// Audio context for ringtone
let ringCtx: AudioContext | null = null;

const playRingTone = () => {
  try {
    if (!ringCtx) {
      ringCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = ringCtx.createOscillator();
    const gain = ringCtx.createGain();
    osc.connect(gain);
    gain.connect(ringCtx.destination);
    osc.frequency.setValueAtTime(440, ringCtx.currentTime);
    osc.frequency.setValueAtTime(520, ringCtx.currentTime + 0.15);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ringCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ringCtx.currentTime + 0.4);
    osc.start(ringCtx.currentTime);
    osc.stop(ringCtx.currentTime + 0.4);
  } catch (e) {
    console.error("Ring tone error:", e);
  }
};

interface IncomingVideoCallWindowProps {
  callId: string;
  callerUserId: string;
  callerName: string;
  callerPhoto: string | null;
  currentUserId: string;
  onClose: () => void;
}

const IncomingVideoCallWindow = ({
  callId,
  callerUserId,
  callerName,
  callerPhoto,
  currentUserId,
  onClose
}: IncomingVideoCallWindowProps) => {
  const { toast } = useToast();
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [pausedChatCount, setPausedChatCount] = useState(0);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Continuous ring sound until answered/declined
  useEffect(() => {
    if (isAnswered) return;
    playRingTone();
    ringIntervalRef.current = setInterval(playRingTone, 2000);
    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [isAnswered]);

  // Countdown timer and auto-decline - use ref to avoid stale closure
  const handleDeclineRef = useRef<() => void>(() => {});
  
  useEffect(() => {
    handleDeclineRef.current = handleDecline;
  });

  useEffect(() => {
    if (isAnswered) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleDeclineRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered]);

  // Check active chats on mount to show warning
  useEffect(() => {
    checkActiveChats();
  }, []);

  const checkActiveChats = async () => {
    // Check for both man_user_id and woman_user_id since either gender can receive calls
    const { count } = await supabase
      .from('active_chat_sessions')
      .select('*', { count: 'exact', head: true })
      .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`)
      .eq('status', 'active');
    
    setPausedChatCount(count || 0);
  };

  // Pause all active chats when answering video call
  const pauseActiveChats = async () => {
    try {
      // Pause chats where user is either man or woman
      await supabase
        .from('active_chat_sessions')
        .update({ 
          status: 'paused',
          end_reason: 'video_call_priority'
        })
        .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`)
        .eq('status', 'active');
    } catch (err) {
      console.error('[VideoCall] Failed to pause chats:', err);
    }
  };

  const stopRing = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  };

  const handleAnswer = async () => {
    stopRing();
    try {
      // First, pause all active chats - VIDEO CALL HAS PRIORITY
      await pauseActiveChats();

      // Update call status to active
      const { error } = await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('call_id', callId);

      if (error) {
        console.error('Error updating call status:', error);
        toast({
          title: "Error",
          description: "Failed to answer call. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setIsAnswered(true);
      
      toast({
        title: "Call Connected",
        description: pausedChatCount > 0 
          ? `Connected with ${callerName}. ${pausedChatCount} chat(s) paused.`
          : `Connected with ${callerName}`,
      });
    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Error",
        description: "Failed to answer call",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async () => {
    stopRing();
    try {
      const { error } = await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString(),
          end_reason: 'declined'
        })
        .eq('call_id', callId);

      if (error) {
        console.error('Error declining call:', error);
      }

      toast({
        title: "Call Declined",
        description: "You declined the video call",
      });
      
      onClose();
    } catch (error) {
      console.error('Error declining call:', error);
      onClose();
    }
  };

  // If answered, show the draggable video call window
  if (isAnswered) {
    return (
      <DraggableVideoCallWindow
        callId={callId}
        remoteUserId={callerUserId}
        remoteName={callerName}
        remotePhoto={callerPhoto}
        isInitiator={false}
        currentUserId={currentUserId}
        onClose={onClose}
        initialPosition={{ x: window.innerWidth - 400, y: 80 }}
        zIndex={70}
      />
    );
  }

  // Incoming call UI
  return (
    <Card className="fixed bottom-20 right-4 w-72 sm:w-80 p-4 bg-gradient-to-br from-card to-muted border-border shadow-2xl z-[80] animate-in slide-in-from-right-5">
      <div className="flex flex-col items-center text-center">
        {/* Animated ring effect */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full bg-success/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
          <Avatar className="w-20 h-20 relative z-10 border-4 border-success">
            <AvatarImage src={callerPhoto || undefined} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
              {callerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center gap-2 mb-2 text-success">
          <Video className="w-4 h-4" />
          <span className="text-xs font-medium">Incoming Video Call</span>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-1">{callerName}</h3>
        <p className="text-muted-foreground text-sm mb-1">wants to video call you</p>
        
        {/* Show chat pause warning */}
        {pausedChatCount > 0 && (
          <div className="flex items-center gap-1 text-warning text-xs mb-1">
            <PauseCircle className="w-3 h-3" />
            <span>{pausedChatCount} chat(s) will be paused</span>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mb-4">Auto-decline in {timeRemaining}s</p>

        <div className="flex items-center gap-4">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleDecline}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            variant="success"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleAnswer}
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default IncomingVideoCallWindow;
