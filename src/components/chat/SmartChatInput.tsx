/**
 * Smart Chat Input Component
 * ==========================
 * 
 * Auto-detecting, bidirectional chat input with:
 * - Auto language detection (English, native script, romanized, voice)
 * - Real-time preview in sender's mother tongue
 * - Semantic translation to receiver's mother tongue
 * - Voice-to-text support
 * - No hardcoded language lists
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Mic, MicOff, Loader2, Globe, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmartChatTranslation } from '@/hooks/useSmartChatTranslation';
import { useVoiceInput } from '@/hooks/useVoiceInput';

// ============================================================
// TYPES
// ============================================================

export interface SmartChatInputProps {
  onSendMessage: (
    message: string,
    metadata: {
      senderView: string;
      receiverView: string;
      englishMeaning: string;
      originalInput: string;
      inputType: string;
      detectedLanguage: string;
    }
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  senderMotherTongue: string;
  receiverMotherTongue: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showDebugInfo?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export const SmartChatInput: React.FC<SmartChatInputProps> = memo(({
  onSendMessage,
  onTyping,
  senderMotherTongue,
  receiverMotherTongue,
  disabled = false,
  placeholder = 'Type a message...',
  className,
  showDebugInfo = false,
}) => {
  // Input state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smart translation hook
  const {
    translateInput,
    translateVoice,
    getFinalTranslation,
    result,
    detection,
    isTranslating,
    senderLang,
    receiverLang,
    isSameLang,
  } = useSmartChatTranslation({
    senderMotherTongue,
    receiverMotherTongue,
    enabled: true,
    debounceMs: 200,
  });

  // Voice input hook
  const {
    isListening,
    isSupported: voiceSupported,
    fullTranscript,
    startListening,
    stopListening,
    clearTranscript,
    error: voiceError,
  } = useVoiceInput({
    language: senderMotherTongue,
    continuous: false,
    interimResults: true,
    onResult: (voiceResult) => {
      if (voiceResult.isFinal) {
        setInputText(prev => prev + voiceResult.text);
        translateVoice(voiceResult.text);
      }
    },
  });

  /**
   * Handle text input change with input event tracking
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    // Get the native input event for method detection
    const nativeEvent = e.nativeEvent as InputEvent;
    
    // Trigger auto-detection with input event
    translateInput(value);

    // Typing indicator
    if (onTyping) {
      onTyping(value.length > 0);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [translateInput, onTyping]);

  /**
   * Handle send message
   */
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || disabled || isSending) return;

    setIsSending(true);

    try {
      // Get final translation
      const finalResult = await getFinalTranslation(trimmed);

      // Send message with all metadata
      onSendMessage(trimmed, {
        senderView: finalResult.senderView || trimmed,
        receiverView: finalResult.receiverView || trimmed,
        englishMeaning: finalResult.englishMeaning || trimmed,
        originalInput: trimmed,
        inputType: finalResult.detection?.inputType || 'unknown',
        detectedLanguage: finalResult.detection?.detectedLanguage || 'en',
      });

      // Clear input
      setInputText('');
      clearTranscript();

      // Reset typing
      if (onTyping) {
        onTyping(false);
      }
    } catch (error) {
      console.error('[SmartChatInput] Send error:', error);
    } finally {
      setIsSending(false);
    }
  }, [inputText, disabled, isSending, getFinalTranslation, onSendMessage, clearTranscript, onTyping]);

  /**
   * Handle keyboard submit
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Toggle voice input
   */
  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Get input type badge color
  const getInputTypeBadgeColor = () => {
    switch (detection?.inputType) {
      case 'english': return 'bg-blue-500';
      case 'native-script': return 'bg-green-500';
      case 'romanized': return 'bg-yellow-500';
      case 'voice': return 'bg-purple-500';
      case 'mixed': return 'bg-orange-500';
      default: return 'bg-muted';
    }
  };

  // Get input method badge color
  const getInputMethodBadgeColor = () => {
    switch (detection?.inputMethod) {
      case 'gboard': return 'bg-emerald-500';
      case 'ios-native': return 'bg-sky-500';
      case 'external': return 'bg-slate-500';
      case 'font-tool': return 'bg-pink-500';
      case 'voice': return 'bg-purple-500';
      case 'ime': return 'bg-indigo-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Preview Section */}
      {inputText.trim() && result.senderView && result.senderView !== inputText && (
        <div className="px-3 py-2 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Globe className="w-3 h-3" />
            <span>Preview in your language:</span>
            {isTranslating && <Loader2 className="w-3 h-3 animate-spin" />}
          </div>
          <p className="text-sm font-medium">{result.senderView}</p>
          {result.englishMeaning && result.englishMeaning !== result.senderView && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              🌐 {result.englishMeaning}
            </p>
          )}
        </div>
      )}

      {/* Debug Info (optional) */}
      {showDebugInfo && detection && (
        <div className="flex flex-wrap gap-1 px-2">
          <Badge variant="outline" className={cn('text-xs text-white', getInputTypeBadgeColor())}>
            {detection.inputType}
          </Badge>
          <Badge variant="outline" className={cn('text-xs text-white', getInputMethodBadgeColor())}>
            {detection.inputMethod}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {detection.detectedLanguageName}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {Math.round(detection.confidence * 100)}% conf
          </Badge>
          {!isSameLang && (
            <Badge variant="outline" className="text-xs">
              → {receiverLang}
            </Badge>
          )}
          {detection.metadata?.isGboard && (
            <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700">
              Gboard
            </Badge>
          )}
          {detection.metadata?.isFontTool && (
            <Badge variant="outline" className="text-xs bg-pink-100 text-pink-700">
              Font Tool
            </Badge>
          )}
          {detection.metadata?.isMixedInput && (
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
              Mixed
            </Badge>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎤 Listening...' : placeholder}
            disabled={disabled || isSending}
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none pr-10',
              isListening && 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            )}
            rows={1}
          />
          
          {/* Keyboard indicator */}
          {detection && inputText.trim() && (
            <div className="absolute right-2 bottom-2">
              <Keyboard className={cn(
                'w-4 h-4',
                detection.isNativeInput ? 'text-green-500' : 'text-muted-foreground'
              )} />
            </div>
          )}
        </div>

        {/* Voice Button */}
        {voiceSupported && (
          <Button
            variant={isListening ? 'destructive' : 'outline'}
            size="icon"
            onClick={toggleVoice}
            disabled={disabled || isSending}
            className="shrink-0"
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!inputText.trim() || disabled || isSending}
          size="icon"
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Voice Error */}
      {voiceError && (
        <p className="text-xs text-destructive px-2">{voiceError}</p>
      )}
    </div>
  );
});

SmartChatInput.displayName = 'SmartChatInput';

export default SmartChatInput;
