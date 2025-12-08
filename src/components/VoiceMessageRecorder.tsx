/**
 * VoiceMessageRecorder.tsx
 * 
 * Component for recording and sending voice messages.
 * Max duration: 5 minutes
 * Audio is sent in original language (no translation)
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceMessageRecorderProps {
  chatId: string;
  currentUserId: string;
  partnerId: string;
  onMessageSent?: () => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceMessageRecorder = ({
  chatId,
  currentUserId,
  partnerId,
  onMessageSent,
  disabled = false,
  className
}: VoiceMessageRecorderProps) => {
  const { toast } = useToast();
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    audioLevel
  } = useVoiceRecorder();

  const [isSending, setIsSending] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle recording button click
  const handleRecordClick = useCallback(async () => {
    if (isRecording) {
      // Stop and preview
      const blob = await stopRecording();
      if (blob) {
        setRecordedBlob(blob);
        setShowPreview(true);
      }
    } else {
      // Start recording
      setRecordedBlob(null);
      setShowPreview(false);
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cancel recording or preview
  const handleCancel = useCallback(() => {
    if (isRecording) {
      cancelRecording();
    }
    setRecordedBlob(null);
    setShowPreview(false);
  }, [isRecording, cancelRecording]);

  // Send the voice message
  const handleSend = useCallback(async () => {
    if (!recordedBlob || isSending) return;

    setIsSending(true);

    try {
      // Upload to Supabase storage
      const fileName = `${currentUserId}/${chatId}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, recordedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: recordedBlob.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      // Insert message with voice attachment
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: '🎤 Voice message',
          is_translated: false // Voice messages are not translated
        });

      if (messageError) throw messageError;

      // Also insert a reference to the audio URL
      // We'll use a special format: [VOICE:url]
      const { error: voiceError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: `[VOICE:${publicUrl}]`,
          is_translated: false
        });

      if (voiceError) throw voiceError;

      toast({
        title: 'Voice message sent',
        description: `${formatDuration(recordingDuration)} voice message delivered`,
      });

      setRecordedBlob(null);
      setShowPreview(false);
      onMessageSent?.();

    } catch (error) {
      console.error('Failed to send voice message:', error);
      toast({
        title: 'Failed to send',
        description: 'Could not send voice message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  }, [recordedBlob, isSending, currentUserId, chatId, partnerId, recordingDuration, toast, onMessageSent]);

  // Preview mode - show recorded audio
  if (showPreview && recordedBlob) {
    const audioUrl = URL.createObjectURL(recordedBlob);
    
    return (
      <div className={cn("flex items-center gap-2 p-2 bg-muted rounded-full", className)}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="rounded-full w-8 h-8 text-muted-foreground hover:text-destructive"
          onClick={handleCancel}
          disabled={isSending}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <audio 
          src={audioUrl} 
          controls 
          className="h-8 flex-1 max-w-[200px]"
          onEnded={() => URL.revokeObjectURL(audioUrl)}
        />
        
        <Button
          type="button"
          size="icon"
          className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90"
          onClick={handleSend}
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    );
  }

  // Recording mode
  if (isRecording) {
    return (
      <div className={cn("flex items-center gap-2 p-2 bg-destructive/10 rounded-full animate-pulse", className)}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="rounded-full w-8 h-8 text-muted-foreground hover:text-destructive"
          onClick={handleCancel}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          {/* Audio level visualization */}
          <div className="flex items-center gap-0.5 h-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-destructive rounded-full transition-all duration-75"
                style={{
                  height: `${Math.min(24, 4 + audioLevel * 20 * Math.random())}px`,
                  opacity: 0.5 + audioLevel * 0.5
                }}
              />
            ))}
          </div>
          
          <span className="text-sm font-medium text-destructive">
            {formatDuration(recordingDuration)}
          </span>
          <span className="text-xs text-muted-foreground">
            / 5:00
          </span>
        </div>
        
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="rounded-full w-10 h-10"
          onClick={handleRecordClick}
        >
          <Square className="w-4 h-4 fill-current" />
        </Button>
      </div>
    );
  }

  // Default - record button
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("rounded-full w-10 h-10", className)}
      onClick={handleRecordClick}
      disabled={disabled || isSending}
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};

export default VoiceMessageRecorder;
