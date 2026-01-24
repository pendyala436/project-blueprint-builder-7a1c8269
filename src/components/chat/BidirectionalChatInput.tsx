/**
 * EN-Mode Only Chat Input Component
 * ==================================
 * 
 * Simplified chat input where users ALWAYS type in English.
 * The system translates to the user's mother tongue for preview
 * and to the receiver's mother tongue for delivery.
 * 
 * RULES:
 * 1. Preview: Shows ONLY mother tongue translation (no English in preview)
 * 2. After Send: Native script + English meaning in small letters below
 * 3. Receiver: Their mother tongue + English meaning below
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Globe, Languages, Loader2, Keyboard, Mic } from 'lucide-react';
import { type UserLanguageProfile } from '@/lib/offline-translation/types';
// OFFLINE UNIVERSAL TRANSLATION SYSTEM - No external APIs
import {
  translateUniversal,
  normalizeLanguage,
  isSameLanguage,
  isEngineReady,
  initializeEngine,
  isEnglish,
  isLatinScriptLanguage,
  getLiveNativePreview,
} from '@/lib/translation/universal-offline-engine';
import { dynamicTransliterate } from '@/lib/translation/dynamic-transliterator';

// ============================================================
// TYPES
// ============================================================

export type InputType = 'pure-english' | 'unknown';

export interface LivePreviewResult {
  nativePreview: string;           // Preview in sender's native script
  receiverPreview: string;         // Preview for receiver (if different language)
  confidence: number;
}

export interface MeaningBasedMessage {
  id: string;
  originalInput: string;           // Raw English input from user
  extractedMeaning: string;        // English semantic meaning (same as input in EN-mode)
  confidence: number;
  senderView: string;              // Message in sender's mother tongue
  senderScript: 'native' | 'latin';
  receiverView: string;            // Message in receiver's mother tongue
  receiverScript: 'native' | 'latin';
  senderLanguage: string;
  receiverLanguage: string;
  timestamp: string;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  sameLanguage: boolean;
}

// ============================================================
// TYPES
// ============================================================

export interface BidirectionalChatInputProps {
  /** Current user's profile (typing user) */
  myProfile: UserLanguageProfile;
  /** Partner's profile (message receiver) */
  partnerProfile: UserLanguageProfile;
  onSendMessage: (message: MeaningBasedMessage) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// ============================================================
// OFFLINE TRANSLATION HELPERS
// ============================================================

/**
 * Generate live preview using OFFLINE universal translation engine
 * EN-MODE: English input → Mother tongue translation
 */
async function generateLivePreview(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<LivePreviewResult> {
  if (!input || !input.trim()) {
    return { nativePreview: '', receiverPreview: '', confidence: 0 };
  }

  const trimmed = input.trim();
  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  const sameLanguage = isSameLanguage(normSender, normReceiver);

  let nativePreview = '';
  let receiverPreview = '';
  let confidence = 0.9;

  // EN-MODE: Translate English → Sender's mother tongue
  if (isEnglish(normSender)) {
    // Sender speaks English - no translation needed for preview
    nativePreview = trimmed;
  } else {
    // Translate English to sender's mother tongue using offline engine
    try {
      const result = await translateUniversal(trimmed, 'english', normSender);
      nativePreview = result.text;
      confidence = result.confidence || 0.85;

      // Ensure native script if sender uses non-Latin script
      if (!isLatinScriptLanguage(normSender) && /^[a-zA-Z\s\d.,!?'"()[\]{}:;@#$%^&*+=\-_/\\|<>~`]+$/.test(nativePreview)) {
        const transliterated = dynamicTransliterate(nativePreview, normSender);
        if (transliterated && transliterated !== nativePreview) {
          nativePreview = transliterated;
        }
      }
    } catch (err) {
      console.error('[generateLivePreview] Translation error:', err);
      nativePreview = trimmed;
      confidence = 0.5;
    }
  }

  // Generate receiver preview if different language
  if (!sameLanguage) {
    if (isEnglish(normReceiver)) {
      receiverPreview = trimmed; // Receiver speaks English
    } else {
      try {
        const result = await translateUniversal(trimmed, 'english', normReceiver);
        receiverPreview = result.text;

        // Ensure native script
        if (!isLatinScriptLanguage(normReceiver) && /^[a-zA-Z\s\d.,!?'"()[\]{}:;@#$%^&*+=\-_/\\|<>~`]+$/.test(receiverPreview)) {
          const transliterated = dynamicTransliterate(receiverPreview, normReceiver);
          if (transliterated && transliterated !== receiverPreview) {
            receiverPreview = transliterated;
          }
        }
      } catch (err) {
        console.error('[generateLivePreview] Receiver translation error:', err);
        receiverPreview = trimmed;
      }
    }
  }

  return { nativePreview, receiverPreview, confidence };
}

/**
 * Process message for sending using OFFLINE universal translation engine
 */
async function processMessage(
  input: string,
  senderProfile: UserLanguageProfile,
  receiverProfile: UserLanguageProfile
): Promise<MeaningBasedMessage> {
  const trimmed = input.trim();
  const timestamp = new Date().toISOString();
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const normSender = normalizeLanguage(senderProfile.motherTongue);
  const normReceiver = normalizeLanguage(receiverProfile.motherTongue);
  const sameLanguage = isSameLanguage(normSender, normReceiver);

  // EN-MODE: Input is always English
  const extractedMeaning = trimmed;

  // Generate sender view (in sender's mother tongue)
  let senderView = '';
  let senderScript: 'native' | 'latin' = 'latin';
  let wasTransliterated = false;

  if (isEnglish(normSender)) {
    senderView = trimmed;
    senderScript = 'latin';
  } else {
    try {
      const result = await translateUniversal(trimmed, 'english', normSender);
      senderView = result.text;
      senderScript = isLatinScriptLanguage(normSender) ? 'latin' : 'native';

      // Ensure native script
      if (!isLatinScriptLanguage(normSender) && /^[a-zA-Z\s\d.,!?'"()[\]{}:;@#$%^&*+=\-_/\\|<>~`]+$/.test(senderView)) {
        const transliterated = dynamicTransliterate(senderView, normSender);
        if (transliterated && transliterated !== senderView) {
          senderView = transliterated;
          wasTransliterated = true;
        }
      }
    } catch (err) {
      console.error('[processMessage] Sender translation error:', err);
      senderView = trimmed;
    }
  }

  // Generate receiver view
  let receiverView = '';
  let receiverScript: 'native' | 'latin' = 'latin';
  let wasTranslated = false;

  if (sameLanguage) {
    receiverView = senderView;
    receiverScript = senderScript;
  } else if (isEnglish(normReceiver)) {
    receiverView = trimmed;
    receiverScript = 'latin';
    wasTranslated = !isEnglish(normSender);
  } else {
    try {
      const result = await translateUniversal(trimmed, 'english', normReceiver);
      receiverView = result.text;
      receiverScript = isLatinScriptLanguage(normReceiver) ? 'latin' : 'native';
      wasTranslated = true;

      // Ensure native script
      if (!isLatinScriptLanguage(normReceiver) && /^[a-zA-Z\s\d.,!?'"()[\]{}:;@#$%^&*+=\-_/\\|<>~`]+$/.test(receiverView)) {
        const transliterated = dynamicTransliterate(receiverView, normReceiver);
        if (transliterated && transliterated !== receiverView) {
          receiverView = transliterated;
        }
      }
    } catch (err) {
      console.error('[processMessage] Receiver translation error:', err);
      receiverView = trimmed;
    }
  }

  return {
    id,
    originalInput: trimmed,
    extractedMeaning,
    confidence: 0.9,
    senderView,
    senderScript,
    receiverView,
    receiverScript,
    senderLanguage: normSender,
    receiverLanguage: normReceiver,
    timestamp,
    wasTranslated,
    wasTransliterated,
    sameLanguage,
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export const BidirectionalChatInput: React.FC<BidirectionalChatInputProps> = memo(({
  myProfile,
  partnerProfile,
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder,
  className,
}) => {
  // State - ALWAYS EN MODE (users type in English only)
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(isEngineReady());
  const [preview, setPreview] = useState<LivePreviewResult | null>(null);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Derived values - MY language as sender, PARTNER's language as receiver
  const myLanguage = normalizeLanguage(myProfile.motherTongue);
  const partnerLanguage = normalizeLanguage(partnerProfile.motherTongue);
  const sameLanguage = isSameLanguage(myLanguage, partnerLanguage);
  
  // Initialize engine
  useEffect(() => {
    if (!isReady) {
      initializeEngine().then(() => setIsReady(true));
    }
  }, [isReady]);
  
  // Handle input change - ALWAYS EN MODE
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
    
    // Debounced full preview - ALWAYS EN MODE
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (value.trim()) {
      previewTimeoutRef.current = setTimeout(async () => {
        const result = await generateLivePreview(value, myLanguage, partnerLanguage);
        setPreview(result);
      }, 150);
    } else {
      setPreview(null);
    }
  }, [myLanguage, partnerLanguage, onTyping]);
  
  // Handle send - I am sender, partner is receiver
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending || !isReady) return;
    
    setIsSending(true);
    onTyping?.(false);
    
    try {
      // Process message: myProfile as sender, partnerProfile as receiver, ALWAYS EN MODE
      const message = await processMessage(trimmed, myProfile, partnerProfile);
      onSendMessage(message);
      setInput('');
      setPreview(null);
    } catch (err) {
      console.error('[BidirectionalChatInput] Send error:', err);
    } finally {
      setIsSending(false);
    }
  }, [input, disabled, isSending, isReady, myProfile, partnerProfile, onSendMessage, onTyping]);
  
  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);
  
  const showPreview = input.trim().length > 0;
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Live Previews */}
      {showPreview && (
        <div className="space-y-1.5 px-2 py-2 bg-muted/30 rounded-lg mx-2">
          {/* Preview Header */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Preview
            </span>
            <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1.5">
              <Globe className="h-2.5 w-2.5" />
              English
            </Badge>
          </div>
          
          {/* 
           * EN-MODE PREVIEW:
           * - Shows ONLY mother tongue translation (native script)
           * - NO English shown in preview (English appears only after send)
           */}
          
          {/* Mother Tongue Preview ONLY - No English in preview */}
          {preview?.nativePreview && preview.nativePreview !== input && (
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px] shrink-0 h-5">
                {myProfile.motherTongue}
              </Badge>
              <p className="text-sm font-medium unicode-text flex-1" dir="auto">
                {preview.nativePreview}
              </p>
            </div>
          )}
          
          {/* Partner's Preview - how THEY will see it (NO English in preview) */}
          {!sameLanguage && preview?.receiverPreview && (
            <div className="flex items-start gap-2 pt-1 border-t border-muted/50">
              <Badge variant="outline" className="text-[10px] shrink-0 h-5 gap-0.5 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                <Languages className="h-2.5 w-2.5" />
                {partnerProfile.motherTongue}
              </Badge>
              <p className="text-xs text-muted-foreground unicode-text flex-1" dir="auto">
                {preview.receiverPreview}
              </p>
            </div>
          )}
          
          {/* Confidence indicator */}
          {preview && preview.confidence > 0 && (
            <div className="flex justify-end">
              <span className="text-[9px] text-muted-foreground">
                {Math.round(preview.confidence * 100)}% confidence
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Input Area */}
      <div className="flex gap-2 items-end px-2 pb-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type in English..."
            disabled={disabled || !isReady}
            className={cn(
              'min-h-[44px] max-h-32 resize-none unicode-text pr-10',
              'focus-visible:ring-1 focus-visible:ring-primary'
            )}
            dir="auto"
            rows={1}
          />
          {/* Voice input hint (placeholder for future) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 bottom-1 h-8 w-8 opacity-50 hover:opacity-100"
            disabled
            title="Voice input coming soon"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isSending || !isReady}
          size="icon"
          className="shrink-0 h-11 w-11"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Status bar */}
      {!isReady && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Initializing translation engine...</span>
        </div>
      )}
    </div>
  );
});

BidirectionalChatInput.displayName = 'BidirectionalChatInput';

export default BidirectionalChatInput;
