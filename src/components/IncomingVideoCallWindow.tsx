import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DraggableVideoCallWindow from "./DraggableVideoCallWindow";
import { cn } from "@/lib/utils";

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
  const [ratePerMinute, setRatePerMinute] = useState(10);

  // Fetch session rate on mount
  useEffect(() => {
    const fetchSessionRate = async () => {
      try {
        const { data } = await supabase
          .from('video_call_sessions')
          .select('rate_per_minute')
          .eq('call_id', callId)
          .maybeSingle();
        
        if (data?.rate_per_minute) {
          setRatePerMinute(Number(data.rate_per_minute));
        }
      } catch (err) {
        console.error('Error fetching session rate:', err);
      }
    };
    fetchSessionRate();
  }, [callId]);

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
        ratePerMinute={ratePerMinute}
      />
    );
  }

  // Incoming call UI
  return (
    <Card className="fixed bottom-20 right-4 w-72 sm:w-80 p-4 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-2xl z-[80] animate-in slide-in-from-right-5">
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
