/**
 * Real-Time Chat Input with Extended Universal Translation
 * =========================================================
 * 
 * SUPPORTS INPUT IN ANY LANGUAGE (typed or voice)
 * 
 * FLOW:
 * 1. User Input (any language: typed or Gboard/voice)
 * 2. Auto-detect input language (shown as badge)
 * 3. Live Preview: Message in sender's mother tongue + English meaning
 * 4. On Send:
 *    - Sender sees: Native message (large) + English meaning (small)
 *    - Receiver sees: Native message (large) + English meaning (small)
 * 
 * TRANSLATION PIPELINE:
 * Input (any language) → Detect → English pivot → Sender native + Receiver native
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
  generateReceiverPreview as generateReceiverPreviewFn,
  detectInputLanguage,
  isEnglish,
  isSameLanguage,
  type ExtendedMessageViews,
} from '@/lib/translation/extended-universal-engine';

/**
 * Message views for all mode combinations
 * These views are sent to the parent for storage
 */
export interface MessageViews {
  messageToStore: string;   // What gets stored in database (sender's view)
  senderView: string;       // What sender sees after sending
  receiverView: string;     // What receiver sees (translated to their language)
  originalEnglish: string;  // English meaning
  senderNative: string;     // Sender's native language view
  receiverNative: string;   // Receiver's native language view
  senderMode: string;       // Always 'english-meaning'
  // Extended fields for dual display
  detectedLanguage?: string;
  englishMeaning?: string;
}

interface RealtimeChatInputProps {
  onSendMessage: (message: string, senderView: string, receiverView: string, messageViews?: MessageViews) => void;
  onTyping?: (isTyping: boolean) => void;
  senderLanguage: string; // User's mother tongue from profile
  receiverLanguage: string; // Partner's mother tongue from profile
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const RealtimeChatInput: React.FC<RealtimeChatInputProps> = memo(({
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
  const [detectedLanguage, setDetectedLanguage] = useState('');
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

  // Check language properties
  const isEnglishSender = isEnglish(senderLanguage);
  const sameLanguage = isSameLanguage(senderLanguage, receiverLanguage);

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
        // Import getEnglishMeaning for English pivot extraction
        const { getEnglishMeaning } = await import('@/lib/translation/extended-universal-engine');
        
        // Generate sender's native preview
        const senderPreview = await generateLivePreview(value, senderLanguage);
        setNativePreview(senderPreview.nativePreview);
        
        // Always get English meaning (for display below native)
        const { english: englishMeaning } = await getEnglishMeaning(value, detection.language);
        setEnglishPreview(englishMeaning);
        
        // Generate receiver's preview if different language
        if (!sameLanguage) {
          const { preview } = await generateReceiverPreviewFn(
            value,
            senderLanguage,
            receiverLanguage
          );
          setReceiverNativePreview(preview);
        } else {
          setReceiverNativePreview('');
        }
      } catch (err) {
        console.error('[RealtimeChatInput] Preview error:', err);
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
  }, [senderLanguage, receiverLanguage, sameLanguage, onTyping]);

  /**
   * Handle send - generate all views and send message
   */
  const handleSend = useCallback(async () => {
    const trimmedInput = rawInput.trim();
    if (!trimmedInput || disabled || isComposing) return;

    // Save input and clear immediately for responsiveness
    const savedInput = trimmedInput;
    const savedNativePreview = nativePreview;
    const savedEnglish = englishPreview;
    const savedReceiverPreview = receiverNativePreview;
    const savedDetectedLang = detectedLanguage;
    
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

      const messageViews: MessageViews = {
        messageToStore: views.senderNativeText,
        senderView: views.senderNativeText,
        receiverView: views.receiverNativeText,
        originalEnglish: views.englishMeaning,
        senderNative: views.senderNativeText,
        receiverNative: views.receiverNativeText,
        senderMode: 'extended-universal',
        detectedLanguage: views.detectedLanguage,
        englishMeaning: views.englishMeaning,
      };

      console.log('[RealtimeChatInput] Sending message:', {
        input: savedInput,
        detected: views.detectedLanguage,
        english: views.englishMeaning,
        senderView: views.senderNativeText,
        receiverView: views.receiverNativeText,
      });

      onSendMessage(
        views.senderNativeText,  // What gets stored (sender's native)
        views.senderNativeText,  // What sender sees
        views.receiverNativeText, // What receiver sees
        messageViews
      );
    } catch (err) {
      console.error('[RealtimeChatInput] Send error:', err);
      // Fallback: send with previews if available
      const fallbackSender = savedNativePreview || savedInput;
      const fallbackReceiver = savedReceiverPreview || savedInput;
      
      onSendMessage(fallbackSender, fallbackSender, fallbackReceiver, {
        messageToStore: fallbackSender,
        senderView: fallbackSender,
        receiverView: fallbackReceiver,
        originalEnglish: savedEnglish || savedInput,
        senderNative: fallbackSender,
        receiverNative: fallbackReceiver,
        senderMode: 'extended-universal',
        detectedLanguage: savedDetectedLang,
        englishMeaning: savedEnglish || savedInput,
      });
    }

    textareaRef.current?.focus();
  }, [rawInput, nativePreview, englishPreview, receiverNativePreview, detectedLanguage, disabled, isComposing, senderLanguage, receiverLanguage, onSendMessage, onTyping]);

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

  // Show sender preview when there's input and native preview differs from raw input
  // This handles romanized typing like "kaise ho" → "कैसे हो"
  const showSenderPreview = rawInput.trim() && nativePreview && nativePreview !== rawInput.trim();
  // Show receiver preview when different languages
  const showReceiverPreview = rawInput.trim() && !sameLanguage && receiverNativePreview;

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
          {/* MANDATORY English meaning hint */}
          {englishPreview && (
            <div className="mt-1 px-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="h-3 w-3" />
              <span className="italic">🌐 {englishPreview}</span>
            </div>
          )}
        </div>
      )}

      {/* Always show English meaning when typing in non-English (even if no native preview) */}
      {!showSenderPreview && rawInput.trim() && englishPreview && !isEnglishSender && (
        <div className="px-4 py-2 border-b border-border/30">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Languages className="h-3.5 w-3.5" />
            <span>{t('chat.englishMeaning', 'English meaning')}</span>
          </div>
          <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm">🌐 {englishPreview}</p>
          </div>
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

RealtimeChatInput.displayName = 'RealtimeChatInput';

export default RealtimeChatInput;
