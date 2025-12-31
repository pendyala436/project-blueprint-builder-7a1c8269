import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, X, Check, Clock, IndianRupee, Volume2 } from "lucide-react";

interface IncomingChatPopupProps {
  sessionId: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  ratePerMinute: number;
  startedAt: string;
  userGender: "male" | "female";
  onAccept: (sessionId: string) => void;
  onReject: (sessionId: string) => void;
}

// Audio context for buzz sound
let audioContext: AudioContext | null = null;

// Vibration pattern for incoming chat [vibrate, pause, vibrate]
const triggerVibration = () => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // vibrate 200ms, pause 100ms, vibrate 200ms
    }
  } catch (error) {
    console.error("Error triggering vibration:", error);
  }
};

const playBuzzSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a pleasant notification tone
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
    
    // Trigger vibration alongside sound
    triggerVibration();
  } catch (error) {
    console.error("Error playing buzz sound:", error);
  }
};

const IncomingChatPopup = ({
  sessionId,
  partnerName,
  partnerPhoto,
  partnerLanguage,
  ratePerMinute,
  startedAt,
  userGender,
  onAccept,
  onReject
}: IncomingChatPopupProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const buzzIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play buzz sound on mount and every 2 seconds for women
  useEffect(() => {
    // Play initial sound
    playBuzzSound();

    // For women: continuous buzz until accepted/rejected
    if (userGender === "female") {
      buzzIntervalRef.current = setInterval(() => {
        playBuzzSound();
      }, 2000);
    }

    return () => {
      if (buzzIntervalRef.current) {
        clearInterval(buzzIntervalRef.current);
        buzzIntervalRef.current = null;
      }
    };
  }, [userGender]);

  // Calculate elapsed time since chat started
  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    
    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    // Auto-reject after 60 seconds of no response
    const timeout = setTimeout(() => {
      handleReject();
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [startedAt]);

  const handleAccept = () => {
    // Stop buzz sound
    if (buzzIntervalRef.current) {
      clearInterval(buzzIntervalRef.current);
      buzzIntervalRef.current = null;
    }
    
    setIsExiting(true);
    setTimeout(() => {
      onAccept(sessionId);
    }, 200);
  };

  const handleReject = () => {
    // Stop buzz sound
    if (buzzIntervalRef.current) {
      clearInterval(buzzIntervalRef.current);
      buzzIntervalRef.current = null;
    }
    
    setIsExiting(true);
    setTimeout(() => {
      onReject(sessionId);
    }, 200);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isVisible) return null;

  return (
    <Card className={cn(
      "w-72 p-4 shadow-2xl border-2 border-primary/50 bg-background",
      "animate-in slide-in-from-bottom-5 fade-in duration-300",
      "z-[9999] relative",
      isExiting && "animate-out slide-out-to-right fade-out duration-200"
    )}>
      {/* Pulsing indicator with sound icon */}
      <div className="absolute -top-1 -right-1 flex items-center gap-1">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-primary items-center justify-center">
            <Volume2 className="h-2.5 w-2.5 text-primary-foreground" />
          </span>
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-primary/30 animate-pulse">
            <AvatarImage src={partnerPhoto || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {partnerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{partnerName}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3 w-3 animate-bounce" />
            <span>wants to chat with you!</span>
          </div>
        </div>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant="secondary" className="text-xs">
          {partnerLanguage}
        </Badge>
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {formatTime(elapsedSeconds)}
        </Badge>
        {userGender === "male" && (
          <Badge variant="outline" className="text-xs flex items-center gap-1 text-destructive border-destructive/30">
            <IndianRupee className="h-2.5 w-2.5" />
            ₹{ratePerMinute}/min
          </Badge>
        )}
        {userGender === "female" && (
          <Badge className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
            Earn ₹{ratePerMinute}/min
          </Badge>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
          onClick={handleReject}
        >
          <X className="h-4 w-4" />
          Decline
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5 bg-primary hover:bg-primary/90 animate-pulse"
          onClick={handleAccept}
        >
          <Check className="h-4 w-4" />
          Accept
        </Button>
      </div>

      {/* Auto-close warning */}
      {elapsedSeconds > 45 && (
        <p className="text-[10px] text-center text-destructive mt-2 animate-pulse font-medium">
          ⚠️ Auto-declining in {60 - elapsedSeconds}s...
        </p>
      )}
    </Card>
  );
};

export default IncomingChatPopup;
