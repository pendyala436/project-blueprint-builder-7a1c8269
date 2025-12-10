import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import VideoCallModal from "./VideoCallModal";

interface VideoCallButtonProps {
  currentUserId: string;
  userLanguage: string;
  walletBalance: number;
  onBalanceChange?: (newBalance: number) => void;
}

const VideoCallButton = ({ 
  currentUserId, 
  userLanguage, 
  walletBalance,
  onBalanceChange 
}: VideoCallButtonProps) => {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [callSession, setCallSession] = useState<{
    callId: string;
    womanUserId: string;
    womanName: string;
    womanPhoto: string | null;
  } | null>(null);

  const startVideoCall = async () => {
    // Get current user email to check if super user
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';
    
    // Super users (matching email pattern) bypass balance check entirely
    const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);
    
    if (!isSuperUser) {
      // Check wallet balance dynamically from pricing
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "min_video_call_balance")
        .maybeSingle();
      
      const minBalance = settingsData?.setting_value 
        ? parseInt(String(settingsData.setting_value)) 
        : 50;
      
      if (walletBalance < minBalance) {
        toast({
          title: "Insufficient Balance",
          description: `You need at least ₹${minBalance} to start a video call. Please recharge your wallet.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSearching(true);

    try {
      // Use AI to find available woman for video call
      const { data: result, error } = await supabase.functions.invoke('ai-women-manager', {
        body: {
          action: 'distribute_for_call',
          data: { language: userLanguage }
        }
      });

      if (error) throw error;

      if (!result.success || !result.woman) {
        toast({
          title: "No Available Users",
          description: result.reason || "No women are available for video calls right now. Please try again later.",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      // Create video call session
      const callId = `call_${currentUserId}_${result.woman.user_id}_${Date.now()}`;
      
      const { error: sessionError } = await supabase
        .from('video_call_sessions')
        .insert({
          call_id: callId,
          man_user_id: currentUserId,
          woman_user_id: result.woman.user_id,
          status: 'ringing',
          rate_per_minute: 5.00
        });

      if (sessionError) throw sessionError;

      setCallSession({
        callId,
        womanUserId: result.woman.user_id,
        womanName: result.woman.full_name || 'User',
        womanPhoto: result.woman.photo_url
      });

      toast({
        title: "Calling...",
        description: `Connecting to ${result.woman.full_name}`,
      });

    } catch (error) {
      console.error("Error starting video call:", error);
      toast({
        title: "Error",
        description: "Failed to start video call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleEndCall = async () => {
    if (callSession) {
      await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          end_reason: 'user_ended'
        })
        .eq('call_id', callSession.callId);
    }
    setCallSession(null);
  };

  return (
    <>
      <Button
        onClick={startVideoCall}
        disabled={isSearching}
        variant="aurora"
        size="lg"
        className="gap-2"
      >
        {isSearching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding...
          </>
        ) : (
          <>
            <Video className="w-4 h-4" />
            Video Call
          </>
        )}
      </Button>

      {callSession && (
        <VideoCallModal
          isOpen={!!callSession}
          onClose={handleEndCall}
          callId={callSession.callId}
          remoteUserId={callSession.womanUserId}
          remoteName={callSession.womanName}
          remotePhoto={callSession.womanPhoto}
          isInitiator={true}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
};

export default VideoCallButton;
