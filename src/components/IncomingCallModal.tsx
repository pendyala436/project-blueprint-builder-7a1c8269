import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VideoCallModal from "./VideoCallModal";

interface IncomingCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  callerUserId: string;
  callerName: string;
  callerPhoto: string | null;
  currentUserId: string;
}

const IncomingCallModal = ({
  isOpen,
  onClose,
  callId,
  callerUserId,
  callerName,
  callerPhoto,
  currentUserId
}: IncomingCallModalProps) => {
  const { toast } = useToast();
  const [isAnswered, setIsAnswered] = useState(false);

  // Play ringtone effect
  useEffect(() => {
    if (isOpen && !isAnswered) {
      // Could add audio ringtone here
      const timeout = setTimeout(() => {
        // Auto-decline after 30 seconds
        if (!isAnswered) {
          handleDecline();
        }
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [isOpen, isAnswered]);

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

  if (isAnswered) {
    return (
      <VideoCallModal
        isOpen={true}
        onClose={onClose}
        callId={callId}
        remoteUserId={callerUserId}
        remoteName={callerName}
        remotePhoto={callerPhoto}
        isInitiator={false}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => handleDecline()}>
      <DialogContent className="max-w-sm p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <div className="flex flex-col items-center text-center">
          {/* Animated ring effect */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-2 rounded-full bg-success/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
            <Avatar className="w-28 h-28 relative z-10 border-4 border-success">
              <AvatarImage src={callerPhoto || undefined} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-secondary text-white">
                {callerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center gap-2 mb-2 text-success">
            <Video className="w-5 h-5" />
            <span className="text-sm font-medium">Incoming Video Call</span>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-1">{callerName}</h2>
          <p className="text-gray-400 mb-8">wants to video call you</p>

          <div className="flex items-center gap-6">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={handleDecline}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>

            <Button
              variant="success"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={handleAnswer}
            >
              <Phone className="w-7 h-7" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
