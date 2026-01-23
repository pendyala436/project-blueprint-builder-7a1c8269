/**
 * Extended Chat Input with Multi-Language Support
 * ================================================
 * 
 * Allows typing in ANY language (not just English)
 * 
 * FLOW:
 * 1. User types in any language (typed or via Gboard/voice)
 * 2. Auto-detect input language (shown as badge)
 * 3. Live preview shows message in sender's mother tongue
 * 4. On send:
 *    - Sender sees: Native message + English meaning (small)
 *    - Receiver sees: Native message + English meaning (small)
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Globe, Languages } from 'lucide-react';
import {
  translateExtended,
  generateLivePreview,
  generateReceiverPreview,
  detectInputLanguage,
  isEnglish,
  isSameLanguage,
  type ExtendedMessageViews,
} from '@/lib/translation/extended-universal-engine';

/**
 * Message views for storage and display
 */
export interface ExtendedMessageData {
  originalInput: string;
  detectedLanguage: string;
  englishMeaning: string;
  senderNativeText: string;
  senderEnglishHint: string;
  receiverNativeText: string;
  receiverEnglishHint: string;
}

interface ExtendedChatInputProps {
  onSendMessage: (
    messageToStore: string,
    senderView: string,
    receiverView: string,
    messageData: ExtendedMessageData
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  senderLanguage: string;
  receiverLanguage: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ExtendedChatInput: React.FC<ExtendedChatInputProps> = memo(({
  onSendMessage,
  onTyping,
  senderLanguage,
  receiverLanguage,
  disabled = false,
  placeholder,
  className,
}) => {
  const { t } = useTranslation();

  // State
  const [rawInput, setRawInput] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [nativePreview, setNativePreview] = useState('');
  const [englishPreview, setEnglishPreview] = useState('');
  const [receiverNativePreview, setReceiverNativePreview] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  /**
   * Handle input change - detect language and generate previews
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawInput(value);

    // Clear previous timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    if (!value.trim()) {
      setDetectedLanguage('');
      setNativePreview('');
      setEnglishPreview('');
      setReceiverNativePreview('');
      setDetectionConfidence(0);
      return;
    }

    // Instant language detection (synchronous)
    const detection = detectInputLanguage(value);
    setDetectedLanguage(detection.language);
    setDetectionConfidence(detection.confidence);

    // Debounced preview generation (async)
    setIsGeneratingPreview(true);
    previewTimeoutRef.current = setTimeout(async () => {
      try {
        // Generate sender's native preview
        const senderPreview = await generateLivePreview(value, senderLanguage);
        setNativePreview(senderPreview.nativePreview);
        
        // Generate receiver's preview
        if (!isSameLanguage(senderLanguage, receiverLanguage)) {
          const { preview, englishMeaning } = await generateReceiverPreview(
            value,
            senderLanguage,
            receiverLanguage
          );
          setReceiverNativePreview(preview);
          setEnglishPreview(englishMeaning);
        } else {
          setReceiverNativePreview('');
          setEnglishPreview('');
        }
      } catch (err) {
        console.error('[ExtendedChatInput] Preview error:', err);
      } finally {
        setIsGeneratingPreview(false);
      }
    }, 400);

    // Typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  }, [senderLanguage, receiverLanguage, onTyping]);

  /**
   * Handle send - generate all views and send message
   */
  const handleSend = useCallback(async () => {
    const trimmedInput = rawInput.trim();
    if (!trimmedInput || disabled || isComposing) return;

    // Save input and clear immediately for responsiveness
    const savedInput = trimmedInput;
    setRawInput('');
    setNativePreview('');
    setEnglishPreview('');
    setReceiverNativePreview('');
    setDetectedLanguage('');
    setDetectionConfidence(0);
    onTyping?.(false);

    try {
      // Generate full translation with all views
      const views = await translateExtended(savedInput, senderLanguage, receiverLanguage);

      const messageData: ExtendedMessageData = {
        originalInput: views.originalInput,
        detectedLanguage: views.detectedLanguage,
        englishMeaning: views.englishMeaning,
        senderNativeText: views.senderNativeText,
        senderEnglishHint: views.senderEnglishHint,
        receiverNativeText: views.receiverNativeText,
        receiverEnglishHint: views.receiverEnglishHint,
      };

      console.log('[ExtendedChatInput] Sending message:', messageData);

      onSendMessage(
        views.senderNativeText,  // What gets stored (sender's native)
        views.senderNativeText,  // What sender sees
        views.receiverNativeText, // What receiver sees
        messageData
      );
    } catch (err) {
      console.error('[ExtendedChatInput] Send error:', err);
      // Fallback: send raw input
      onSendMessage(savedInput, savedInput, savedInput, {
        originalInput: savedInput,
        detectedLanguage: 'unknown',
        englishMeaning: savedInput,
        senderNativeText: savedInput,
        senderEnglishHint: savedInput,
        receiverNativeText: savedInput,
        receiverEnglishHint: savedInput,
      });
    }

    textareaRef.current?.focus();
  }, [rawInput, disabled, isComposing, senderLanguage, receiverLanguage, onSendMessage, onTyping]);

  /**
   * Handle key press
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [isComposing, handleSend]);

  // IME handlers
  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [rawInput]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const isEnglishSender = isEnglish(senderLanguage);
  const showSenderPreview = rawInput.trim() && !isEnglishSender && nativePreview;
  const showReceiverPreview = rawInput.trim() && !isSameLanguage(senderLanguage, receiverLanguage);

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Language detection badge */}
      {rawInput.trim() && detectedLanguage && (
        <div className="px-4 py-2 border-b border-border/30 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {t('chat.detectedLanguage', 'Detected')}:
          </span>
          <Badge variant="secondary" className="text-xs capitalize">
            {detectedLanguage}
          </Badge>
          {detectionConfidence > 0.8 && (
            <span className="text-xs text-green-600">✓</span>
          )}
        </div>
      )}

      {/* Sender's native preview - what YOU will see */}
      {showSenderPreview && (
        <div className="px-4 py-2 border-b border-border/30">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <span>👁️</span>
            <span>{t('chat.yourView', 'You will see')} ({senderLanguage})</span>
          </div>
          <div className="px-3 py-2 bg-accent/30 border border-accent/50 rounded-lg unicode-text" dir="auto">
            {isGeneratingPreview ? (
              <span className="text-muted-foreground italic animate-pulse text-sm">
                {t('chat.translating', 'Translating...')}
              </span>
            ) : (
              <p className="text-base">{nativePreview}</p>
            )}
          </div>
          {/* English meaning hint */}
          {englishPreview && englishPreview !== nativePreview && (
            <div className="mt-1 px-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="h-3 w-3" />
              <span className="italic">🌐 {englishPreview}</span>
            </div>
          )}
        </div>
      )}

      {/* Receiver's preview - what PARTNER will see */}
      {showReceiverPreview && receiverNativePreview && (
        <div className="px-4 py-2 border-b border-border/30">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <span>👤</span>
            <span>{t('chat.partnerSees', 'Partner will see')} ({receiverLanguage})</span>
          </div>
          <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg unicode-text" dir="auto">
            {isGeneratingPreview ? (
              <span className="text-muted-foreground italic animate-pulse text-sm">
                {t('chat.translating', 'Translating...')}
              </span>
            ) : (
              <p className="text-base">{receiverNativePreview}</p>
            )}
          </div>
          {/* English meaning hint */}
          {englishPreview && englishPreview !== receiverNativePreview && (
            <div className="mt-1 px-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="h-3 w-3" />
              <span className="italic">🌐 {englishPreview}</span>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={rawInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || t('chat.typeAnyLanguage', 'Type in any language...')}
            disabled={disabled}
            dir="auto"
            spellCheck={true}
            autoComplete="off"
            autoCorrect="on"
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none unicode-text',
              'py-3 px-4',
              'rounded-xl border-muted-foreground/20',
              'focus-visible:ring-primary/50',
              'text-lg',
              isComposing && 'ring-2 ring-primary/30'
            )}
            aria-label={t('chat.typeMessage', 'Type a message')}
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!rawInput.trim() || disabled}
          size="icon"
          className={cn(
            'h-11 w-11 rounded-full flex-shrink-0',
            'bg-primary hover:bg-primary/90',
            'transition-transform active:scale-95'
          )}
          aria-label={t('chat.send', 'Send')}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
});

ExtendedChatInput.displayName = 'ExtendedChatInput';

export default ExtendedChatInput;
