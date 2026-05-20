/**
 * VoiceRecorder.tsx - WhatsApp-style push-to-talk voice message recorder
 */
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  chatId: string;
  currentUserId: string;
  receiverId: string;
  disabled?: boolean;
  onVoiceSent?: () => void;
  onError?: (msg: string) => void;
}

export const VoiceRecorder = ({
  chatId,
  currentUserId,
  receiverId,
  disabled = false,
  onVoiceSent,
  onError,
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      setDuration(0);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      recorder.start(100); // collect data every 100ms
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  }, []);

  const stopAndSend = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsSending(true);

    // Wait for recorder to finish
    await new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        resolve();
      };
      recorder.stop();
    });

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (blob.size < 500) {
        // Too short, discard
        setIsSending(false);
        return;
      }

      const fileName = `voice_${Date.now()}.webm`;
      // RLS requires first folder = auth user_id
      const filePath = `${currentUserId}/${chatId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, blob, { contentType: 'audio/webm' });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // BUG-VM-03 FIX: Show error to user
        onError?.(`Voice upload failed: ${uploadError.message}`);
        setIsSending(false);
        return;
      }

      // Use [VOICE:chat-attachment://path] format — parsed by both ChatScreen and MiniChatWindow renderers
      const voiceMarker = `[VOICE:chat-attachment://${filePath}]`;
      await supabase.from('chat_messages').insert({
        chat_id: chatId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message: voiceMarker,
      });

      onVoiceSent?.();
    } catch (err) {
      console.error('Voice send error:', err);
    } finally {
      setIsSending(false);
      setDuration(0);
    }
  }, [chatId, currentUserId, receiverId, onVoiceSent]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (isSending) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Sending voice...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-destructive/10 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-medium text-destructive">{formatDuration(duration)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={cancelRecording}
          title="Cancel"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="aurora"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={stopAndSend}
          title="Send voice message"
        >
          <Mic className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
      onClick={startRecording}
      disabled={disabled}
      title="Record voice message"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
};

export default VoiceRecorder;
