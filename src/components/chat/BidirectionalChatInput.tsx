/**
 * Bidirectional Chat Input Component with NL/EN Toggle
 * =====================================================
 * 
 * Supports two typing modes:
 * - EN (English): Type in English → translates to mother tongue
 * - NL (Native/Latin): Type phonetically in native language
 * 
 * RULES:
 * 1. Preview: Shows mother tongue translation (native script)
 * 2. After Send: Native script + English meaning in small letters below
 * 3. Receiver: Their mother tongue + English meaning below
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Globe, Languages, Loader2, Mic } from 'lucide-react';
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
// Phonetic transliteration removed - meaning-based only

// ============================================================
// TYPES
// ============================================================

export type TypingMode = 'english-meaning' | 'native-latin';

export interface LivePreviewResult {
  nativePreview: string;           // Preview in sender's native script
  receiverPreview: string;         // Preview for receiver (if different language)
  confidence: number;
}

export interface MeaningBasedMessage {
  id: string;
  originalInput: string;           // Raw input from user
  extractedMeaning: string;        // English semantic meaning
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
// PROPS
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

      // MEANING-BASED ONLY: No phonetic transliteration
      // The offline engine returns semantic translation directly
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

        // MEANING-BASED ONLY: No phonetic transliteration
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

      // MEANING-BASED ONLY: No phonetic transliteration - wasTransliterated stays false
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

      // MEANING-BASED ONLY: No phonetic transliteration
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
  // State
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(isEngineReady());
  const [preview, setPreview] = useState<LivePreviewResult | null>(null);
  const [typingMode, setTypingMode] = useState<TypingMode>('english-meaning');
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Derived values - MY language as sender, PARTNER's language as receiver
  const myLanguage = normalizeLanguage(myProfile.motherTongue);
  const partnerLanguage = normalizeLanguage(partnerProfile.motherTongue);
  const sameLanguage = isSameLanguage(myLanguage, partnerLanguage);
  const isMyLangEnglish = isEnglish(myLanguage);
  
  // Initialize engine
  useEffect(() => {
    if (!isReady) {
      initializeEngine().then(() => setIsReady(true));
    }
  }, [isReady]);
  
  // Generate preview based on typing mode
  const generatePreview = useCallback(async (value: string) => {
    if (!value.trim()) {
      setPreview(null);
      return;
    }
    
    const trimmed = value.trim();
    let nativePreview = '';
    let receiverPreview = '';
    let confidence = 0.9;
    
    if (typingMode === 'english-meaning') {
      // EN MODE: English → Mother tongue translation
      if (isMyLangEnglish) {
        nativePreview = trimmed;
      } else {
        try {
          const result = await translateUniversal(trimmed, 'english', myLanguage);
          nativePreview = result.text;
          confidence = result.confidence || 0.85;
        } catch (err) {
          console.error('[generatePreview] EN mode error:', err);
          nativePreview = trimmed;
          confidence = 0.5;
        }
      }
      
      // Receiver preview
      if (!sameLanguage) {
        if (isEnglish(partnerLanguage)) {
          receiverPreview = trimmed;
        } else {
          try {
            const result = await translateUniversal(trimmed, 'english', partnerLanguage);
            receiverPreview = result.text;
          } catch (err) {
            receiverPreview = trimmed;
          }
        }
      }
    } else {
      // NL MODE: Show as-is (NO phonetic transliteration)
      nativePreview = trimmed;
      
      // For receiver, extract English meaning then translate (NO transliteration)
      if (!sameLanguage) {
        try {
          const englishResult = await translateUniversal(nativePreview, myLanguage, 'english');
          const englishMeaning = englishResult.text;
          
          if (isEnglish(partnerLanguage)) {
            receiverPreview = englishMeaning;
          } else {
            const receiverResult = await translateUniversal(englishMeaning, 'english', partnerLanguage);
            receiverPreview = receiverResult.text;
          }
        } catch (err) {
          receiverPreview = nativePreview;
        }
      }
    }
    
    setPreview({ nativePreview, receiverPreview, confidence });
  }, [typingMode, myLanguage, partnerLanguage, sameLanguage, isMyLangEnglish]);
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
    
    // Debounced preview
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (value.trim()) {
      previewTimeoutRef.current = setTimeout(() => generatePreview(value), 150);
    } else {
      setPreview(null);
    }
  }, [onTyping, generatePreview]);
  
  // Handle send - I am sender, partner is receiver
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending || !isReady) return;
    
    setIsSending(true);
    onTyping?.(false);
    
    try {
      let extractedMeaning = trimmed;
      let senderView = '';
      let senderScript: 'native' | 'latin' = 'latin';
      let wasTransliterated = false;
      
      if (typingMode === 'english-meaning') {
        // EN MODE: Input is English
        extractedMeaning = trimmed;
        
        if (isMyLangEnglish) {
          senderView = trimmed;
        } else {
          const result = await translateUniversal(trimmed, 'english', myLanguage);
          senderView = result.text;
          senderScript = isLatinScriptLanguage(myLanguage) ? 'latin' : 'native';
        }
      } else {
        // NL MODE: Show as-is (NO transliteration)
        senderView = trimmed;
        senderScript = isLatinScriptLanguage(myLanguage) ? 'latin' : 'native';
        
        // Extract English meaning from input
        const englishResult = await translateUniversal(senderView, myLanguage, 'english');
        extractedMeaning = englishResult.text;
      }
      
      // Generate receiver view
      let receiverView = '';
      let receiverScript: 'native' | 'latin' = 'latin';
      let wasTranslated = false;
      
      if (sameLanguage) {
        receiverView = senderView;
        receiverScript = senderScript;
      } else if (isEnglish(partnerLanguage)) {
        receiverView = extractedMeaning;
        receiverScript = 'latin';
        wasTranslated = !isEnglish(myLanguage);
      } else {
        const result = await translateUniversal(extractedMeaning, 'english', partnerLanguage);
        receiverView = result.text;
        receiverScript = isLatinScriptLanguage(partnerLanguage) ? 'latin' : 'native';
        wasTranslated = true;
      }
      
      const message: MeaningBasedMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        originalInput: trimmed,
        extractedMeaning,
        confidence: 0.9,
        senderView,
        senderScript,
        receiverView,
        receiverScript,
        senderLanguage: myLanguage,
        receiverLanguage: partnerLanguage,
        timestamp: new Date().toISOString(),
        wasTranslated,
        wasTransliterated,
        sameLanguage,
      };
      
      onSendMessage(message);
      setInput('');
      setPreview(null);
    } catch (err) {
      console.error('[BidirectionalChatInput] Send error:', err);
    } finally {
      setIsSending(false);
    }
  }, [input, disabled, isSending, isReady, typingMode, myProfile, partnerProfile, myLanguage, partnerLanguage, sameLanguage, isMyLangEnglish, onSendMessage, onTyping]);
  
  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  // Toggle typing mode
  const toggleTypingMode = useCallback(() => {
    setTypingMode(prev => prev === 'english-meaning' ? 'native-latin' : 'english-meaning');
    setPreview(null);
    // Re-generate preview with new mode
    if (input.trim()) {
      setTimeout(() => generatePreview(input), 50);
    }
  }, [input, generatePreview]);
  
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
  const placeholderText = typingMode === 'english-meaning' 
    ? 'Type in English...' 
    : `Type in ${myProfile.motherTongue}...`;
  
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
              {typingMode === 'english-meaning' ? 'English' : myProfile.motherTongue}
            </Badge>
          </div>
          
          {/* Mother Tongue Preview */}
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
          
          {/* Partner's Preview */}
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
      
      {/* Input Area with NL/EN Toggle */}
      <div className="flex gap-2 items-end px-2 pb-2">
        {/* NL/EN Toggle Button */}
        <Button
          type="button"
          variant={typingMode === 'english-meaning' ? 'default' : 'secondary'}
          size="sm"
          onClick={toggleTypingMode}
          className={cn(
            'shrink-0 h-11 w-11 font-bold text-xs',
            typingMode === 'english-meaning' 
              ? 'bg-primary hover:bg-primary/90' 
              : 'bg-secondary hover:bg-secondary/80'
          )}
          title={typingMode === 'english-meaning' 
            ? 'EN: Type in English (meaning-based)' 
            : 'NL: Type in Native/Latin (phonetic)'}
        >
          {typingMode === 'english-meaning' ? 'EN' : 'NL'}
        </Button>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={disabled || !isReady}
            className={cn(
              'min-h-[44px] max-h-32 resize-none unicode-text pr-10',
              'focus-visible:ring-1 focus-visible:ring-primary'
            )}
            dir="auto"
            rows={1}
          />
          {/* Voice input hint */}
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
