/**
 * Real-Time Chat Input with OFFLINE Universal Translation
 * ========================================================
 * 100% OFFLINE - NO EXTERNAL APIs - Meaning-based translation
 * 
 * 3 TYPING MODES (for both sender AND receiver):
 * 1. Native Mode - Type in mother tongue (native/Latin script)
 * 2. English Core - Type English, display English, receiver sees native
 * 3. English (Meaning-Based) - Type English, preview/display as native translation
 * 
 * ALL 9 COMBINATIONS SUPPORTED:
 * Sender Mode × Receiver Mode = 9 possible combinations
 * 
 * Message Data Stored:
 * - originalEnglish: English text for English Core mode
 * - senderNative: Sender's native language view
 * - receiverNative: Receiver's native language view
 * 
 * TRANSLATION ENGINE:
 * Uses Universal Offline Engine from universal-offline-engine.ts
 * - Meaning-based translation via Supabase dictionaries
 * - English pivot for cross-language semantic translation
 * - Script conversion for non-Latin scripts
 * - Zero external API calls
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import { 
  translateUniversal,
  translateBidirectionalChat,
  getLiveNativePreview,
  isSameLanguage,
  isLatinScriptLanguage as checkLatinScript,
  isLatinText as checkLatinTextUtil,
  isEnglish,
  dynamicTransliterate,
  reverseTransliterate,
} from '@/lib/translation/universal-offline-engine';
import { 
  TypingModeSelector, 
  type TypingMode, 
  useTypingMode,
  getSavedTypingMode 
} from './TypingModeSelector';

/**
 * Message views for all 9 mode combinations
 * These views are sent to the parent for storage
 */
export interface MessageViews {
  messageToStore: string;   // What gets stored in database (sender's view)
  senderView: string;       // What sender sees after sending
  receiverView: string;     // What receiver sees (translated to their language)
  originalEnglish: string;  // English text for English Core mode
  senderNative: string;     // Sender's native language view
  receiverNative: string;   // Receiver's native language view
  senderMode: TypingMode;   // Sender's typing mode
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

// Use universal offline engine's isLatinText
const isLatinText = (text: string): boolean => checkLatinTextUtil(text);

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
  const [rawInput, setRawInput] = useState(''); // What user typed (Latin)
  const [nativeText, setNativeText] = useState(''); // Transliterated/translated native script
  const [previewText, setPreviewText] = useState(''); // Preview text for meaning-based mode
  const [receiverPreview, setReceiverPreview] = useState(''); // Preview of what receiver will see
  const [isComposing, setIsComposing] = useState(false);
  const [isTranslatingPreview, setIsTranslatingPreview] = useState(false);
  const [isTranslatingReceiverPreview, setIsTranslatingReceiverPreview] = useState(false);
  
  // Use persistent typing mode hook with auto-detection
  const { 
    mode: typingMode, 
    setMode: setTypingMode, 
    isAutoMode,
    handleInputForAutoDetect,
    autoDetectEnabled 
  } = useTypingMode();

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const receiverPreviewTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Check if user's mother tongue uses non-Latin script
  // For Latin-script languages (Spanish, French, etc.) - no transliteration needed
  // For non-Latin languages (Hindi, Telugu, etc.) - transliteration converts Latin → Native
  const needsTransliteration = !checkLatinScript(senderLanguage);
  const isEnglishLanguage = isEnglish(senderLanguage);
  const isSenderLatinScript = checkLatinScript(senderLanguage);

  /**
   * INSTANT transliteration - sync, < 2ms
   * Uses Universal Offline Engine's getLiveNativePreview
   * Converts Latin text to native script immediately
   */
  const transliterateNow = useCallback((latinText: string): string => {
    if (!latinText.trim()) return '';
    
    // Use universal offline engine for instant preview
    if (needsTransliteration && isLatinText(latinText)) {
      try {
        return getLiveNativePreview(latinText, senderLanguage);
      } catch (e) {
        console.error('[RealtimeChatInput] Transliteration error:', e);
        return latinText;
      }
    }
    
    // Latin-script languages - no transliteration
    return latinText;
  }, [needsTransliteration, senderLanguage]);

  /**
   * Generate preview for English typing - shows SENDER'S MOTHER TONGUE
   * Uses Universal Offline Engine for meaning-based translation
   * Type in English → See meaning-based preview in your native language
   * Works for BOTH Latin and non-Latin script languages
   */
  const generateSenderNativePreview = useCallback(async (englishText: string) => {
    if (!englishText.trim()) {
      setPreviewText('');
      return;
    }

    // If sender's native is English, no translation needed
    if (isEnglish(senderLanguage)) {
      setPreviewText('');
      return;
    }

    setIsTranslatingPreview(true);
    try {
      // Use Universal Offline Engine for meaning-based translation
      // Works for all languages: Latin (Spanish, French) and non-Latin (Hindi, Telugu)
      const result = await translateUniversal(englishText, 'english', senderLanguage);
      
      // Show preview if translation happened OR if script conversion happened
      if (result?.text && (result.isTranslated || result.isTransliterated || result.text !== englishText)) {
        setPreviewText(result.text);
        console.log('[RealtimeChatInput] Sender preview:', {
          input: englishText,
          output: result.text,
          method: result.method,
          confidence: result.confidence,
          isTranslated: result.isTranslated,
          isTransliterated: result.isTransliterated,
        });
      } else if (result?.text) {
        // Even if same text, still show as preview for Latin languages (semantic equivalence)
        setPreviewText(result.text);
      } else {
        setPreviewText('');
      }
    } catch (e) {
      console.error('[RealtimeChatInput] Sender native preview error:', e);
      setPreviewText('');
    } finally {
      setIsTranslatingPreview(false);
    }
  }, [senderLanguage]);

  /**
   * Generate receiver preview - shows RECEIVER'S MOTHER TONGUE
   * Shows what the receiver will see in their native language
   */
  /**
   * Generate receiver preview - shows RECEIVER'S MOTHER TONGUE
   * Uses Universal Offline Engine for meaning-based translation
   * Works for BOTH Latin and non-Latin script languages
   */
  const generateReceiverPreview = useCallback(async (sourceText: string, sourceLanguage: string) => {
    // Skip if same language or empty
    if (!sourceText.trim() || isSameLanguage(sourceLanguage, receiverLanguage)) {
      setReceiverPreview('');
      return;
    }

    setIsTranslatingReceiverPreview(true);
    try {
      // Use Universal Offline Engine for meaning-based translation
      // Works for all language combinations including Latin→Latin
      const result = await translateUniversal(sourceText, sourceLanguage, receiverLanguage);
      
      // Show preview for any translation or script conversion
      if (result?.text && (result.isTranslated || result.isTransliterated || result.text !== sourceText)) {
        setReceiverPreview(result.text);
        console.log('[RealtimeChatInput] Receiver preview:', {
          input: sourceText,
          output: result.text,
          method: result.method,
          confidence: result.confidence,
          isTranslated: result.isTranslated,
        });
      } else if (result?.text) {
        // Show even for same-script languages (semantic preview)
        setReceiverPreview(result.text);
      } else {
        setReceiverPreview('');
      }
    } catch (e) {
      console.error('[RealtimeChatInput] Receiver preview error:', e);
      setReceiverPreview('');
    } finally {
      setIsTranslatingReceiverPreview(false);
    }
  }, [receiverLanguage]);

  /**
   * Handle input change - ALL modes show sender's mother tongue preview when typing English
   * KEY BEHAVIOR: Type in English → See preview in YOUR mother tongue
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawInput(value);

    // AUTO-DETECTION: Check if user is typing in native script (Gboard, etc.)
    if (autoDetectEnabled && value.length >= 2) {
      handleInputForAutoDetect(value);
    }

    // Clear timeouts
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (receiverPreviewTimeoutRef.current) clearTimeout(receiverPreviewTimeoutRef.current);

    const isEnglishNative = isEnglish(senderLanguage);
    const isTypingLatin = isLatinText(value);

    // English (Meaning-Based) Mode - Type English, preview in SENDER'S mother tongue
    setNativeText(value);
    
    // Generate SENDER'S native preview (English → sender's mother tongue)
    if (value.trim() && !isEnglishNative) {
      previewTimeoutRef.current = setTimeout(() => {
        generateSenderNativePreview(value);
      }, 500);
    } else {
      setPreviewText('');
    }
    
    // Also generate receiver preview (English → receiver's mother tongue)
    if (value.trim() && !isEnglish(receiverLanguage)) {
      receiverPreviewTimeoutRef.current = setTimeout(() => {
        generateReceiverPreview(value, 'english');
      }, 600);
    } else {
      setReceiverPreview('');
    }

    // Typing indicator
    if (onTyping) {
      onTyping(value.length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  }, [typingMode, needsTransliteration, transliterateNow, generateSenderNativePreview, generateReceiverPreview, onTyping, senderLanguage, receiverLanguage, autoDetectEnabled, handleInputForAutoDetect]);

  /**
   * Handle send - generates ALL views for 9 mode combinations
   * Each message stores: originalEnglish, senderNative, receiverNative
   * Display logic is handled by the receiving component based on receiver's mode
   */
  const handleSend = useCallback(() => {
    const rawMessage = rawInput.trim();
    if (!rawMessage || disabled || isComposing) return;

    // Clear input IMMEDIATELY
    const savedRaw = rawMessage;
    const savedNative = (nativeText || rawMessage).trim();
    const savedPreview = previewText.trim();
    const savedMode = typingMode;
    
    setRawInput('');
    setNativeText('');
    setPreviewText('');
    setReceiverPreview('');
    onTyping?.(false);

    // Process based on mode - generate ALL views for 9 combinations
    (async () => {
      let messageToStore = savedRaw;
      let senderView = savedRaw;
      let receiverView = savedRaw;
      
      // Additional views for 9 combinations
      let originalEnglish = '';      // English version (for English Core receivers)
      let senderNative = '';         // Sender's native language
      let receiverNative = '';       // Receiver's native language

      try {
        const isEnglishSender = isEnglish(senderLanguage);
        const isEnglishReceiver = isEnglish(receiverLanguage);
        const sameLanguage = isSameLanguage(senderLanguage, receiverLanguage);

        // ================================================
        // English (Meaning-Based) Mode Only
        // Sender types English → Sender sees THEIR mother tongue
        // Receiver sees THEIR mother tongue (translated)
        // ================================================
        originalEnglish = savedRaw;
        
        // SENDER sees their MOTHER TONGUE after sending
        if (isEnglishSender) {
          // Sender's native IS English - show English
          senderView = savedRaw;
          senderNative = savedRaw;
          messageToStore = savedRaw;
        } else if (savedPreview) {
          // Use the preview we already generated (sender's native translation)
          senderView = savedPreview;
          senderNative = savedPreview;
          messageToStore = savedPreview;
        } else {
          // Translate English input to sender's mother tongue using Universal Offline Engine
          const toSenderNative = await translateUniversal(savedRaw, 'english', senderLanguage);
          senderView = toSenderNative?.text || savedRaw;
          senderNative = senderView;
          messageToStore = senderView;
        }
        
        // RECEIVER sees their MOTHER TONGUE (translated from English)
        if (isEnglishReceiver) {
          receiverView = savedRaw; // Receiver's native is English
          receiverNative = savedRaw;
        } else if (sameLanguage && senderNative) {
          // Same language - receiver sees same as sender
          receiverView = senderNative;
          receiverNative = senderNative;
        } else {
          // Different languages - translate English to receiver's mother tongue
          const toReceiver = await translateUniversal(savedRaw, 'english', receiverLanguage);
          receiverView = toReceiver?.text || savedRaw;
          receiverNative = receiverView;
        }

      } catch (err) {
        console.error('[RealtimeChatInput] Translation error:', err);
        // Fallback to raw text
        originalEnglish = savedRaw;
        senderNative = savedNative || savedRaw;
        receiverNative = savedRaw;
      }

      // Create complete message views object
      const messageViews: MessageViews = {
        messageToStore,
        senderView,
        receiverView,
        originalEnglish,
        senderNative,
        receiverNative,
        senderMode: savedMode
      };

      onSendMessage(messageToStore, senderView, receiverView, messageViews);
    })();

    textareaRef.current?.focus();
  }, [rawInput, nativeText, previewText, typingMode, disabled, isComposing, senderLanguage, receiverLanguage, onSendMessage, onTyping]);

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
  }, [nativeText, rawInput]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      if (receiverPreviewTimeoutRef.current) clearTimeout(receiverPreviewTimeoutRef.current);
    };
  }, []);

  // Display text based on mode
  const getDisplayText = () => {
    return rawInput;
  };

  // Get placeholder based on mode
  const getPlaceholder = () => {
    return t('chat.typeEnglishMeaning', 'Type in English → shows as your language');
  };

  // Show mode indicator only for non-English users (mode selector removed - single mode)
  const showModeIndicator = !isEnglishLanguage;

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Mode indicator - single mode, no selector needed */}
      {showModeIndicator && (
        <div className="px-4 py-2 border-b border-border/50 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            {t('chat.typingEnglishMeaning', `Type English → Both see native`)}
          </span>
        </div>
      )}

      {/* English Meaning preview - shows SENDER'S MOTHER TONGUE */}
      {/* Works for BOTH Latin (Spanish, French) and non-Latin (Hindi, Telugu) languages */}
      {rawInput.trim() && !isEnglish(senderLanguage) && (
        <div className="px-4 py-2 border-b border-border/30">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <span>👁️</span>
            <span>{t('chat.yourView', 'You will see')} ({senderLanguage})</span>
          </div>
          <div className="px-3 py-2 bg-accent/30 border border-accent/50 rounded-lg text-base unicode-text" dir="auto">
            {isTranslatingPreview ? (
              <span className="text-muted-foreground italic animate-pulse">{t('chat.translating', 'Translating...')}</span>
            ) : previewText ? (
              previewText
            ) : (
              <span className="text-muted-foreground italic">{t('chat.awaitingTranslation', 'Type more for preview...')}</span>
            )}
          </div>
        </div>
      )}

      {/* Receiver preview - shows what PARTNER will see (their mother tongue) */}
      {/* Shown for ALL language combinations including Latin→Latin */}
      {rawInput.trim() && !isSameLanguage(senderLanguage, receiverLanguage) && (
        <div className="px-4 py-2 border-b border-border/30">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <span>👤</span>
            <span>{t('chat.partnerSees', 'Partner will see')} ({receiverLanguage})</span>
          </div>
          <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-base unicode-text" dir="auto">
            {isTranslatingReceiverPreview ? (
              <span className="text-muted-foreground italic animate-pulse">{t('chat.translatingForPartner', 'Translating...')}</span>
            ) : receiverPreview ? (
              receiverPreview
            ) : (
              <span className="text-muted-foreground italic">{t('chat.awaitingTranslation', 'Type more for preview...')}</span>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={getDisplayText()}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || getPlaceholder()}
            disabled={disabled}
            lang="en"
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
            aria-label={t('chat.typeMessage')}
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
