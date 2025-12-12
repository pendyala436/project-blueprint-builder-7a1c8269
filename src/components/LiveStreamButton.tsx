import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Radio, Loader2, StopCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SRSVideoCallModal from "./SRSVideoCallModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LiveStreamButtonProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
}

const LiveStreamButton = ({ 
  currentUserId,
  userName,
  userPhoto,
}: LiveStreamButtonProps) => {
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [streamSession, setStreamSession] = useState<{
    streamId: string;
  } | null>(null);

  const startLiveStream = async () => {
    setShowConfirmDialog(false);
    setIsStarting(true);

    try {
      const streamId = `stream_${currentUserId}_${Date.now()}`;
      
      // Create video call session for streaming
      const { error: sessionError } = await supabase
        .from('video_call_sessions')
        .insert({
          call_id: streamId,
          man_user_id: currentUserId, // Using man_user_id for streamer
          woman_user_id: currentUserId, // Same user for streaming
          status: 'streaming',
          rate_per_minute: 0
        });

      if (sessionError) throw sessionError;

      setStreamSession({ streamId });
      setIsStreaming(true);

      toast({
        title: "Going Live!",
        description: "Your live stream is starting...",
      });

    } catch (error) {
      console.error("Error starting live stream:", error);
      toast({
        title: "Error",
        description: "Failed to start live stream. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndStream = async () => {
    if (streamSession) {
      await supabase
        .from('video_call_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          end_reason: 'stream_ended'
        })
        .eq('call_id', streamSession.streamId);
    }
    setStreamSession(null);
    setIsStreaming(false);
    
    toast({
      title: "Stream Ended",
      description: "Your live stream has ended.",
    });
  };

  return (
    <>
      <Button
        onClick={() => isStreaming ? handleEndStream() : setShowConfirmDialog(true)}
        disabled={isStarting}
        variant={isStreaming ? "destructive" : "aurora"}
        size="lg"
        className="gap-2"
      >
        {isStarting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Starting...
          </>
        ) : isStreaming ? (
          <>
            <StopCircle className="w-4 h-4" />
            End Stream
          </>
        ) : (
          <>
            <Radio className="w-4 h-4" />
            Go Live
          </>
        )}
      </Button>

      {streamSession && (
        <SRSVideoCallModal
          isOpen={!!streamSession}
          onClose={handleEndStream}
          callId={streamSession.streamId}
          remoteUserId={currentUserId}
          remoteName={userName}
          remotePhoto={userPhoto}
          isInitiator={true}
          currentUserId={currentUserId}
          mode="stream"
        />
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500" />
              Start Live Stream
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You're about to start a live stream that anyone can watch.</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Viewers can join using HLS for low-latency streaming</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={startLiveStream}
              className="bg-red-500 hover:bg-red-600"
            >
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LiveStreamButton;
