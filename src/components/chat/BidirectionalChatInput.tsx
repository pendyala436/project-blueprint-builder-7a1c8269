/**
 * Bidirectional Chat Input Component - Mother Tongue First
 * =========================================================
 * 
 * Uses Edge Function for translation (browser-based models removed).
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
  senderPreview: string;
  receiverPreview: string;
  englishMeaning: string;
  confidence: number;
}

export interface MeaningBasedMessage {
  id: string;
  originalInput: string;
  extractedMeaning: string;
  confidence: number;
  senderView: string;
  senderScript: 'native' | 'latin';
  receiverView: string;
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
  myProfile: UserLanguageProfile;
  partnerProfile: UserLanguageProfile;
  onSendMessage: (message: MeaningBasedMessage) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// ============================================================
// UTILITIES
// ============================================================

function normalizeLanguage(lang: string): string {
  if (!lang || typeof lang !== 'string') return 'en';
  const code = lang.toLowerCase().trim();
  const codeMap: Record<string, string> = {
    'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta',
    'kannada': 'kn', 'malayalam': 'ml', 'marathi': 'mr', 'gujarati': 'gu',
    'bengali': 'bn', 'punjabi': 'pa', 'urdu': 'ur', 'odia': 'or',
  };
  return codeMap[code] || code.slice(0, 2);
}

function checkSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

function isLatinScriptLanguage(lang: string): boolean {
  const latinScriptLanguages = new Set([
    'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ro', 'cs', 'hu', 'sv',
  ]);
  return latinScriptLanguages.has(normalizeLanguage(lang));
}

// ============================================================
// EDGE FUNCTION TRANSLATION
// ============================================================

async function translateBidirectionalBrowser(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  englishCore: string;
  wasTranslated: boolean;
}> {
  if (!text.trim()) {
    return { senderView: '', receiverView: '', englishCore: '', wasTranslated: false };
  }

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        senderLanguage: normalizeLanguage(senderLanguage),
        receiverLanguage: normalizeLanguage(receiverLanguage),
        mode: 'bidirectional',
      },
    });

    if (error) throw error;

    return {
      senderView: data?.senderView || text,
      receiverView: data?.receiverView || text,
      englishCore: data?.englishCore || text,
      wasTranslated: data?.wasTranslated || false,
    };
  } catch (err) {
    console.error('[BidirectionalChatInput] Translation error:', err);
    return { senderView: text, receiverView: text, englishCore: text, wasTranslated: false };
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
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState<LivePreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  
  const myLanguage = normalizeLanguage(myProfile.motherTongue);
  const partnerLanguage = normalizeLanguage(partnerProfile.motherTongue);
  const sameLanguage = checkSameLanguage(myLanguage, partnerLanguage);
  
  const generatePreview = useCallback(async (value: string) => {
    if (!value.trim()) {
      setPreview(null);
      return;
    }
    
    setIsLoadingPreview(true);
    
    try {
      const result = await translateBidirectionalBrowser(value.trim(), myLanguage, partnerLanguage);
      
      setPreview({
        senderPreview: result.senderView,
        receiverPreview: result.receiverView,
        englishMeaning: result.englishCore,
        confidence: 0.9,
      });
    } catch (err) {
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
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
    
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (value.trim()) {
      previewTimeoutRef.current = setTimeout(() => generatePreview(value), 400);
    } else {
      setPreview(null);
    }
  }, [onTyping, generatePreview]);
  
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending) return;
    
    setIsSending(true);
    onTyping?.(false);
    
    try {
      const result = await translateBidirectionalBrowser(trimmed, myLanguage, partnerLanguage);
      
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
        wasTransliterated: false,
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
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);
  
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
      {showPreview && (
        <div className="space-y-1.5 px-2 py-2 bg-muted/30 rounded-lg mx-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {isLoadingPreview ? 'Translating...' : 'Preview'}
            </span>
            <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1.5">
              <Globe className="h-2.5 w-2.5" />
              {myProfile.motherTongue}
            </Badge>
          </div>
          
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
          
          {preview.englishMeaning && preview.englishMeaning !== preview.senderPreview && (
            <div className="flex items-start gap-1.5 pt-1 border-t border-muted/50">
              <Globe className="h-2.5 w-2.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground unicode-text flex-1">
                {preview.englishMeaning}
              </p>
            </div>
          )}
          
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
