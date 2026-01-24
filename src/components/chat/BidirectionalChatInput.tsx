/**
 * Bidirectional Chat Input Component
 * ===================================
 * 
 * Meaning-based input that accepts ANY input method:
 * - Physical/on-screen keyboard
 * - Voice-to-text
 * - Phonetic typing (Latin letters for non-Latin languages)
 * - Native script keyboards
 * - Mixed native + Latin input
 * 
 * Features:
 * - Live preview in sender's mother tongue
 * - English meaning preview
 * - Receiver preview (if different language)
 * - No input restrictions
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Globe, Languages, Loader2, Keyboard, Mic } from 'lucide-react';
import {
  generateLivePreview,
  getInstantNativePreview,
  processMessage,
  detectInputType,
  type MeaningBasedMessage,
  type LivePreviewResult,
  type InputType,
} from '@/lib/translation/meaning-based-chat';
import { type UserLanguageProfile } from '@/lib/offline-translation/types';
import {
  normalizeLanguage,
  isLatinScriptLanguage,
  isSameLanguage,
  isEngineReady,
  initializeEngine,
} from '@/lib/translation/universal-offline-engine';

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
// INPUT TYPE BADGE
// ============================================================

const InputTypeBadge = memo<{ inputType: InputType }>(({ inputType }) => {
  const labels: Record<InputType, { label: string; icon: React.ReactNode }> = {
    'pure-english': { label: 'English', icon: <Globe className="h-2.5 w-2.5" /> },
    'pure-native': { label: 'Native', icon: <Keyboard className="h-2.5 w-2.5" /> },
    'phonetic-latin': { label: 'Phonetic', icon: <Keyboard className="h-2.5 w-2.5" /> },
    'mixed-script': { label: 'Mixed', icon: <Languages className="h-2.5 w-2.5" /> },
    'mixed-language': { label: 'Multi', icon: <Languages className="h-2.5 w-2.5" /> },
    'unknown': { label: '', icon: null },
  };
  
  const info = labels[inputType];
  if (!info.label) return null;
  
  return (
    <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1.5">
      {info.icon}
      {info.label}
    </Badge>
  );
});
InputTypeBadge.displayName = 'InputTypeBadge';

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
  const [instantPreview, setInstantPreview] = useState('');
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Derived values - MY language as sender, PARTNER's language as receiver
  const myLanguage = normalizeLanguage(myProfile.motherTongue);
  const partnerLanguage = normalizeLanguage(partnerProfile.motherTongue);
  const sameLanguage = isSameLanguage(myLanguage, partnerLanguage);
  const myLangIsLatin = isLatinScriptLanguage(myLanguage);
  
  // Initialize engine
  useEffect(() => {
    if (!isReady) {
      initializeEngine().then(() => setIsReady(true));
    }
  }, [isReady]);
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Instant native preview (synchronous) - ONLY for phonetic typing
    // For English input, we skip instant preview and rely on async generateLivePreview
    // because English needs meaning-based translation, not phonetic transliteration
    const trimmedValue = value.trim();
    if (trimmedValue && !myLangIsLatin) {
      // Check if this looks like phonetic input (native words in Latin letters)
      // vs pure English input which needs translation
      const inputType = detectInputType(trimmedValue, myLanguage);
      
      if (inputType === 'phonetic-latin') {
        // Phonetic typing (e.g., "kaise ho" for Hindi) - show instant transliteration
        setInstantPreview(getInstantNativePreview(value, myLanguage));
      } else {
        // Pure English or other - clear instant preview, rely on async preview
        setInstantPreview('');
      }
    } else {
      setInstantPreview('');
    }
    
    // Typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
    
    // Debounced full preview - my language as sender, partner as receiver
    // This handles meaning-based translation for all input types
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (value.trim()) {
      previewTimeoutRef.current = setTimeout(async () => {
        const result = await generateLivePreview(value, myLanguage, partnerLanguage);
        setPreview(result);
      }, 150);
    } else {
      setPreview(null);
    }
  }, [myLanguage, partnerLanguage, myLangIsLatin, onTyping]);
  
  // Handle send - I am sender, partner is receiver
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending || !isReady) return;
    
    setIsSending(true);
    onTyping?.(false);
    
    try {
      // Process message: myProfile as sender, partnerProfile as receiver
      const message = await processMessage(trimmed, myProfile, partnerProfile);
      onSendMessage(message);
      setInput('');
      setPreview(null);
      setInstantPreview('');
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
  const currentInputType = input.trim() ? detectInputType(input, myLanguage) : 'unknown';
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Live Previews */}
      {showPreview && (
        <div className="space-y-1.5 px-2 py-2 bg-muted/30 rounded-lg mx-2">
          {/* Input Type Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Preview
            </span>
            <InputTypeBadge inputType={currentInputType} />
          </div>
          
          {/* Native Script Preview - meaning-based in MY language */}
          {/* Show instant preview for phonetic typing, or nativePreview from async for English input */}
          {(instantPreview && instantPreview !== input) ? (
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px] shrink-0 h-5">
                {myProfile.motherTongue}
              </Badge>
              <p className="text-sm font-medium unicode-text" dir="auto">
                {instantPreview}
              </p>
            </div>
          ) : (preview?.nativePreview && preview.nativePreview !== input) ? (
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px] shrink-0 h-5">
                {myProfile.motherTongue}
              </Badge>
              <p className="text-sm font-medium unicode-text" dir="auto">
                {preview.nativePreview}
              </p>
            </div>
          ) : null}
          
          {/* English Meaning */}
          {preview?.englishMeaning && preview.englishMeaning !== input && (
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0 h-5 gap-0.5">
                <Globe className="h-2.5 w-2.5" />
                EN
              </Badge>
              <p className="text-xs text-muted-foreground">
                {preview.englishMeaning}
              </p>
            </div>
          )}
          
          {/* Partner's Preview - how THEY will see it */}
          {!sameLanguage && preview?.receiverPreview && (
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0 h-5 gap-0.5 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                <Languages className="h-2.5 w-2.5" />
                {partnerProfile.motherTongue}
              </Badge>
              <p className="text-xs text-muted-foreground unicode-text" dir="auto">
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
            placeholder={placeholder || `Type in any way you like...`}
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
