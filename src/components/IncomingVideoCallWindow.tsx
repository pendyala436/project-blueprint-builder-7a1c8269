import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DraggableVideoCallWindow from "./DraggableVideoCallWindow";
import { cn } from "@/lib/utils";

// Audio context for ringtone sound
let audioContext: AudioContext | null = null;

const playRingtone = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a pleasant ringtone pattern
    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(659.25, now); // E5
    oscillator.frequency.setValueAtTime(783.99, now + 0.15); // G5
    oscillator.frequency.setValueAtTime(880, now + 0.3); // A5
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    oscillator.start(now);
    oscillator.stop(now + 0.5);
  } catch (error) {
    console.error("Error playing ringtone:", error);
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

  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play ringtone sound on mount and every 2 seconds
  useEffect(() => {
    if (isAnswered) return;

    // Play initial sound
    playRingtone();

    // Continuous ringtone every 2 seconds
    ringtoneIntervalRef.current = setInterval(() => {
      playRingtone();
    }, 2000);

    return () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };
  }, [isAnswered]);

  // Countdown timer and auto-decline
  useEffect(() => {
    if (isAnswered) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered]);

  const handleAnswer = async () => {
    // Stop ringtone
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    try {
      await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('call_id', callId);

      setIsAnswered(true);
      
      toast({
        title: "Call Connected",
        description: `Connected with ${callerName}`,
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
    // Stop ringtone
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    try {
      await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString(),
          end_reason: 'declined'
        })
        .eq('call_id', callId);

      toast({
        title: "Call Declined",
        description: "You declined the video call",
      });
      
      onClose();
    } catch (error) {
      console.error('Error declining call:', error);
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
    <Card className="fixed bottom-20 right-4 w-72 sm:w-80 p-4 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-2xl z-[80] animate-in slide-in-from-right-5">
      {/* Sound indicator */}
      <div className="absolute -top-1 -right-1 flex items-center gap-1">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-success items-center justify-center">
            <Volume2 className="h-2.5 w-2.5 text-white" />
          </span>
        </span>
      </div>
      
      <div className="flex flex-col items-center text-center">
        {/* Animated ring effect */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full bg-success/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
          <Avatar className="w-20 h-20 relative z-10 border-4 border-success">
            <AvatarImage src={callerPhoto || undefined} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-secondary text-white">
              {callerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center gap-2 mb-2 text-success">
          <Video className="w-4 h-4" />
          <span className="text-xs font-medium">Incoming Video Call</span>
        </div>

        <h3 className="text-lg font-semibold text-white mb-1">{callerName}</h3>
        <p className="text-gray-400 text-sm mb-1">wants to video call you</p>
        <p className="text-xs text-gray-500 mb-4">Auto-decline in {timeRemaining}s</p>

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
