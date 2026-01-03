/**
 * HoldToRecordButton.tsx
 * 
 * Hold-to-record voice button: 
 * - Red circle by default
 * - Green circle while holding/recording
 * - Releases and sends when let go
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HoldToRecordButtonProps {
  // For direct chat message sending
  chatId?: string;
  currentUserId?: string;
  partnerId?: string;
  onMessageSent?: () => void;
  // For optimistic UI - called immediately when recording completes with local blob URL
  onOptimisticMessage?: (tempId: string, localBlobUrl: string, duration: number) => void;
  // For replacing optimistic message with real server message
  onMessageConfirmed?: (tempId: string, serverMessageId: string, serverUrl: string) => void;
  // For removing optimistic message on error
  onMessageFailed?: (tempId: string) => void;
  // For custom handling (e.g., community chat)
  onRecordingComplete?: (audioBlob: Blob) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const HoldToRecordButton = ({
  chatId,
  currentUserId,
  partnerId,
  onMessageSent,
  onOptimisticMessage,
  onMessageConfirmed,
  onMessageFailed,
  onRecordingComplete,
  disabled = false,
  className
}: HoldToRecordButtonProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || isRecording || isSending) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      // Update duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        
        // Max 5 minutes
        if (elapsed >= 300) {
          stopRecordingAndSend();
        }
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to record voice messages',
        variant: 'destructive'
      });
    }
  }, [disabled, isRecording, isSending, toast]);

  const stopRecordingAndSend = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);

    // Stop media recorder
    const mediaRecorder = mediaRecorderRef.current;
    
    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Check minimum duration (0.5 seconds)
        if (recordingDuration < 1) {
          toast({
            title: 'Recording too short',
            description: 'Hold longer to record a voice message',
            variant: 'destructive'
          });
          resolve();
          return;
        }

        // Create blob
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });

        if (blob.size === 0) {
          toast({
            title: 'No audio recorded',
            description: 'Please try again',
            variant: 'destructive'
          });
          resolve();
          return;
        }

        // If custom callback provided, use it instead
        if (onRecordingComplete) {
          setIsSending(true);
          try {
            await onRecordingComplete(blob);
          } catch (error) {
            console.error('Failed to process voice message:', error);
            toast({
              title: 'Failed to send',
              description: 'Could not send voice message. Please try again.',
              variant: 'destructive'
            });
          } finally {
            setIsSending(false);
            setRecordingDuration(0);
          }
          resolve();
          return;
        }

        // Default behavior: Send to chat_messages
        if (!chatId || !currentUserId || !partnerId) {
          toast({
            title: 'Configuration error',
            description: 'Missing chat details',
            variant: 'destructive'
          });
          resolve();
          return;
        }

        setIsSending(true);
        
        // Create local preview for optimistic UI
        const tempId = `temp-voice-${Date.now()}`;
        const localBlobUrl = URL.createObjectURL(blob);
        
        // Call optimistic message callback immediately (sender sees it right away)
        onOptimisticMessage?.(tempId, localBlobUrl, recordingDuration);
        
        try {
          const fileName = `${currentUserId}/${chatId}/${Date.now()}.webm`;
          
          const { error: uploadError } = await supabase.storage
            .from('voice-messages')
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false,
              contentType: blob.type
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('voice-messages')
            .getPublicUrl(fileName);

          // Insert voice message
          const { data: insertedMsg, error: messageError } = await supabase
            .from('chat_messages')
            .insert({
              chat_id: chatId,
              sender_id: currentUserId,
              receiver_id: partnerId,
              message: `[VOICE:${publicUrl}]`,
              is_translated: false
            })
            .select()
            .single();

          if (messageError) throw messageError;

          // Call confirmation callback to replace optimistic message with real one
          if (insertedMsg) {
            onMessageConfirmed?.(tempId, insertedMsg.id, publicUrl);
          }

          // Clean up local blob URL
          URL.revokeObjectURL(localBlobUrl);

          toast({
            title: 'Voice message sent',
            description: `${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')} voice message delivered`
          });

          onMessageSent?.();
        } catch (error) {
          console.error('Failed to send voice message:', error);
          // Call failure callback to remove optimistic message
          onMessageFailed?.(tempId);
          URL.revokeObjectURL(localBlobUrl);
          toast({
            title: 'Failed to send',
            description: 'Could not send voice message. Please try again.',
            variant: 'destructive'
          });
        } finally {
          setIsSending(false);
          setRecordingDuration(0);
        }

        resolve();
      };

      mediaRecorder.stop();
    });
  }, [isRecording, recordingDuration, chatId, currentUserId, partnerId, toast, onMessageSent, onRecordingComplete]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    startRecording();
  }, [startRecording]);

  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecordingAndSend();
    }
  }, [isRecording, stopRecordingAndSend]);

  const handleMouseLeave = useCallback(() => {
    if (isRecording) {
      stopRecordingAndSend();
    }
  }, [isRecording, stopRecordingAndSend]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isSending) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "rounded-full flex items-center justify-center bg-muted",
          "h-8 w-8",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className={cn(
          "rounded-full flex items-center justify-center transition-all duration-200",
          "h-8 w-8 select-none touch-none",
          isRecording 
            ? "bg-live hover:bg-live/90 text-live-foreground scale-110 animate-pulse shadow-lg shadow-live/50" 
            : "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        title="Hold to record voice message"
      >
        <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
      </button>
      
      {/* Recording duration indicator */}
      {isRecording && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-live text-live-foreground text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
          {formatDuration(recordingDuration)}
        </div>
      )}
    </div>
  );
};

export default HoldToRecordButton;
