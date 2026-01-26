/**
 * Bidirectional Chat Input Component - Mother Tongue First
 * =========================================================
 * 
 * CORE PRINCIPLE: Both sender and receiver see messages in their MOTHER TONGUE
 * 
 * Flow:
 * 1. User types (any method: English, native script, romanized, voice)
 * 2. Preview shows message in SENDER'S mother tongue (native script)
 * 3. After send: Sender sees in their mother tongue, receiver sees in their mother tongue
 * 4. English meaning shown below in small text for reference only
 * 
 * Uses edge function for proper semantic translation via free APIs.
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Globe, Languages, Loader2 } from 'lucide-react';
import { type UserLanguageProfile } from '@/lib/offline-translation/types';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES
// ============================================================

export interface LivePreviewResult {
  senderPreview: string;           // Preview in sender's native script
  receiverPreview: string;         // Preview for receiver (if different language)
  englishMeaning: string;          // English semantic meaning
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
// LANGUAGE UTILITIES
// ============================================================

function normalizeLanguage(lang: string): string {
  if (!lang || typeof lang !== 'string') return 'english';
  return lang.toLowerCase().trim() || 'english';
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = normalizeLanguage(lang1);
  const n2 = normalizeLanguage(lang2);
  if (n1 === n2) return true;
  
  // Common aliases
  const aliases: Record<string, string> = {
    'bangla': 'bengali',
    'oriya': 'odia',
    'mandarin': 'chinese',
  };
  return (aliases[n1] || n1) === (aliases[n2] || n2);
}

function isEnglish(lang: string): boolean {
  const n = normalizeLanguage(lang);
  return n === 'english' || n === 'en';
}

function isLatinScriptLanguage(lang: string): boolean {
  const latinScriptLanguages = new Set([
    'english', 'spanish', 'french', 'german', 'italian', 'portuguese',
    'dutch', 'polish', 'romanian', 'czech', 'hungarian', 'swedish',
    'danish', 'norwegian', 'finnish', 'turkish', 'vietnamese', 'indonesian',
    'malay', 'tagalog', 'filipino', 'swahili', 'hausa', 'yoruba',
  ]);
  return latinScriptLanguages.has(normalizeLanguage(lang));
}

// ============================================================
// TRANSLATION VIA EDGE FUNCTION
// ============================================================

/**
 * Call edge function for bidirectional translation
 * Returns senderView, receiverView, and englishCore
 */
async function translateBidirectional(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  englishCore: string;
  wasTranslated: boolean;
  wasTransliterated: boolean;
}> {
  if (!text.trim()) {
    return {
      senderView: '',
      receiverView: '',
      englishCore: '',
      wasTranslated: false,
      wasTransliterated: false,
    };
  }

  try {
    console.log('[BidirectionalChatInput] Calling edge function:', {
      text: text.substring(0, 50),
      senderLang: senderLanguage,
      receiverLang: receiverLanguage,
    });

    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        senderLanguage: senderLanguage.toLowerCase(),
        receiverLanguage: receiverLanguage.toLowerCase(),
        mode: 'bidirectional',
      },
    });

    if (error) {
      console.error('[BidirectionalChatInput] Edge function error:', error);
      throw error;
    }

    console.log('[BidirectionalChatInput] Translation result:', {
      senderView: data?.senderView?.substring(0, 30),
      receiverView: data?.receiverView?.substring(0, 30),
      englishCore: data?.englishCore?.substring(0, 30),
    });

    return {
      senderView: data?.senderView || text,
      receiverView: data?.receiverView || text,
      englishCore: data?.englishCore || text,
      wasTranslated: data?.wasTranslated || false,
      wasTransliterated: data?.wasTransliterated || false,
    };
  } catch (err) {
    console.error('[BidirectionalChatInput] Translation exception:', err);
    // Fallback to original text
    return {
      senderView: text,
      receiverView: text,
      englishCore: text,
      wasTranslated: false,
      wasTransliterated: false,
    };
  }
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
  const [preview, setPreview] = useState<LivePreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Derived values
  const myLanguage = normalizeLanguage(myProfile.motherTongue);
  const partnerLanguage = normalizeLanguage(partnerProfile.motherTongue);
  const sameLanguage = isSameLanguage(myLanguage, partnerLanguage);
  
  // Generate preview via edge function
  const generatePreview = useCallback(async (value: string) => {
    if (!value.trim()) {
      setPreview(null);
      return;
    }
    
    setIsLoadingPreview(true);
    
    try {
      const result = await translateBidirectional(value.trim(), myLanguage, partnerLanguage);
      
      setPreview({
        senderPreview: result.senderView,
        receiverPreview: result.receiverView,
        englishMeaning: result.englishCore,
        confidence: 0.9,
      });
    } catch (err) {
      console.error('[BidirectionalChatInput] Preview error:', err);
      // Fallback: show input as-is
      setPreview({
        senderPreview: value.trim(),
        receiverPreview: value.trim(),
        englishMeaning: value.trim(),
        confidence: 0.5,
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [myLanguage, partnerLanguage]);
  
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
    
    // Debounced preview (300ms to avoid too many API calls)
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (value.trim()) {
      previewTimeoutRef.current = setTimeout(() => generatePreview(value), 300);
    } else {
      setPreview(null);
    }
  }, [onTyping, generatePreview]);
  
  // Handle send - translate via edge function
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending) return;
    
    setIsSending(true);
    onTyping?.(false);
    
    try {
      // Call edge function for bidirectional translation
      const result = await translateBidirectional(trimmed, myLanguage, partnerLanguage);
      
      const message: MeaningBasedMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        originalInput: trimmed,
        extractedMeaning: result.englishCore,
        confidence: 0.9,
        senderView: result.senderView,
        senderScript: isLatinScriptLanguage(myLanguage) ? 'latin' : 'native',
        receiverView: result.receiverView,
        receiverScript: isLatinScriptLanguage(partnerLanguage) ? 'latin' : 'native',
        senderLanguage: myLanguage,
        receiverLanguage: partnerLanguage,
        timestamp: new Date().toISOString(),
        wasTranslated: result.wasTranslated,
        wasTransliterated: result.wasTransliterated,
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
  }, [input, disabled, isSending, myLanguage, partnerLanguage, sameLanguage, onSendMessage, onTyping]);
  
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
  
  const showPreview = input.trim().length > 0 && preview;
  const placeholderText = placeholder || `Type your message...`;
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Live Preview - Shows sender's mother tongue */}
      {showPreview && (
        <div className="space-y-1.5 px-2 py-2 bg-muted/30 rounded-lg mx-2">
          {/* Preview Header */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {isLoadingPreview ? 'Translating...' : 'Preview'}
            </span>
            <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1.5">
              <Globe className="h-2.5 w-2.5" />
              {myProfile.motherTongue}
            </Badge>
          </div>
          
          {/* Sender's Mother Tongue Preview - MAIN DISPLAY */}
          {preview.senderPreview && (
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px] shrink-0 h-5">
                {myProfile.motherTongue}
              </Badge>
              <p className="text-sm font-medium unicode-text flex-1" dir="auto">
                {preview.senderPreview}
              </p>
            </div>
          )}
          
          {/* English Meaning - Small subtext */}
          {preview.englishMeaning && preview.englishMeaning !== preview.senderPreview && (
            <div className="flex items-start gap-1.5 pt-1 border-t border-muted/50">
              <Globe className="h-2.5 w-2.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground unicode-text flex-1">
                {preview.englishMeaning}
              </p>
            </div>
          )}
          
          {/* Partner's Preview (only if different language) */}
          {!sameLanguage && preview.receiverPreview && preview.receiverPreview !== preview.senderPreview && (
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
        </div>
      )}
      
      {/* Input Area */}
      <div className="flex items-end gap-2 px-2 pb-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={disabled || isSending}
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none py-3 pr-4',
              'rounded-xl border-muted-foreground/20',
              'focus-visible:ring-1 focus-visible:ring-primary',
              'unicode-text'
            )}
            rows={1}
          />
        </div>
        
        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isSending}
          size="icon"
          className="h-11 w-11 rounded-xl shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
});

BidirectionalChatInput.displayName = 'BidirectionalChatInput';

export default BidirectionalChatInput;
