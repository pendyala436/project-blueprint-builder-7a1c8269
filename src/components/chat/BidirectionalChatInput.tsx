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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Send, Globe, Languages, Loader2, Keyboard, Mic, Type } from 'lucide-react';
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
  const [isEnglishMode, setIsEnglishMode] = useState(true); // Toggle for English vs phonetic typing
  
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
    
    const trimmedValue = value.trim();
    
    // Use toggle to determine input type instead of auto-detection
    if (trimmedValue && !myLangIsLatin) {
      if (!isEnglishMode) {
        // Non-English mode: treat Latin input as phonetic typing
        setInstantPreview(getInstantNativePreview(value, myLanguage));
      } else {
        // English mode: no instant transliteration, use meaning-based translation
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
    
    // Debounced full preview - pass isEnglishMode to override detection
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (value.trim()) {
      previewTimeoutRef.current = setTimeout(async () => {
        const result = await generateLivePreview(value, myLanguage, partnerLanguage, isEnglishMode);
        setPreview(result);
      }, 150);
    } else {
      setPreview(null);
    }
  }, [myLanguage, partnerLanguage, myLangIsLatin, onTyping, isEnglishMode]);
  
  // Handle send - I am sender, partner is receiver
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending || !isReady) return;
    
    setIsSending(true);
    onTyping?.(false);
    
    try {
      // Process message: myProfile as sender, partnerProfile as receiver, pass isEnglishMode
      const message = await processMessage(trimmed, myProfile, partnerProfile, isEnglishMode);
      onSendMessage(message);
      setInput('');
      setPreview(null);
      setInstantPreview('');
    } catch (err) {
      console.error('[BidirectionalChatInput] Send error:', err);
    } finally {
      setIsSending(false);
    }
  }, [input, disabled, isSending, isReady, myProfile, partnerProfile, onSendMessage, onTyping, isEnglishMode]);
  
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
          
          {/* 
           * UNIFIED PREVIEW FORMAT:
           * - Primary: Mother tongue translation (native OR Latin based on language)
           * - Secondary: English meaning in small letters below
           * 
           * For EN mode: Shows meaning-based translation
           * For Native/Phonetic mode: Shows instant transliteration
           */}
          
          {/* Mother Tongue Preview with English meaning below */}
          {(() => {
            // Determine which preview to show
            const motherTongueText = (instantPreview && instantPreview !== input) 
              ? instantPreview 
              : (preview?.nativePreview && preview.nativePreview !== input) 
                ? preview.nativePreview 
                : null;
            
            // Get English meaning (for EN mode, this is the input itself normalized)
            const englishMeaning = isEnglishMode 
              ? input.trim() // In EN mode, the input IS the English meaning
              : preview?.englishMeaning;
            
            if (!motherTongueText && !isEnglishMode) return null;
            
            // For EN mode, always show the translation preview with English below
            if (isEnglishMode && preview?.nativePreview) {
              return (
                <div className="space-y-1">
                  {/* Primary: Mother tongue translation */}
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0 h-5">
                      {myProfile.motherTongue}
                    </Badge>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium unicode-text" dir="auto">
                        {preview.nativePreview}
                      </p>
                      {/* English meaning below in small letters */}
                      <p className="text-[10px] text-muted-foreground/70 italic border-t border-current/10 pt-0.5">
                        🌐 {input.trim()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            
            // For Native/Phonetic mode with instant preview
            if (motherTongueText) {
              return (
                <div className="space-y-1">
                  {/* Primary: Mother tongue (transliteration) */}
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0 h-5">
                      {myProfile.motherTongue}
                    </Badge>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium unicode-text" dir="auto">
                        {motherTongueText}
                      </p>
                      {/* English meaning below in small letters (if available) */}
                      {englishMeaning && englishMeaning !== motherTongueText && (
                        <p className="text-[10px] text-muted-foreground/70 italic border-t border-current/10 pt-0.5">
                          🌐 {englishMeaning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            
            return null;
          })()}
          
          {/* Partner's Preview - how THEY will see it */}
          {!sameLanguage && preview?.receiverPreview && (
            <div className="flex items-start gap-2 pt-1 border-t border-muted/50">
              <Badge variant="outline" className="text-[10px] shrink-0 h-5 gap-0.5 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                <Languages className="h-2.5 w-2.5" />
                {partnerProfile.motherTongue}
              </Badge>
              <div className="flex-1 space-y-0.5">
                <p className="text-xs text-muted-foreground unicode-text" dir="auto">
                  {preview.receiverPreview}
                </p>
                {/* English meaning for receiver too */}
                {preview.englishMeaning && (
                  <p className="text-[9px] text-muted-foreground/60 italic">
                    🌐 {preview.englishMeaning}
                  </p>
                )}
              </div>
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
      
      {/* English/Non-English Toggle */}
      {!myLangIsLatin && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b">
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Typing Mode:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-medium transition-colors",
              !isEnglishMode ? "text-primary" : "text-muted-foreground"
            )}>
              {myProfile.motherTongue}
            </span>
            <Switch
              checked={isEnglishMode}
              onCheckedChange={setIsEnglishMode}
              className="h-4 w-8 data-[state=checked]:bg-blue-500"
            />
            <span className={cn(
              "text-xs font-medium transition-colors",
              isEnglishMode ? "text-blue-500" : "text-muted-foreground"
            )}>
              English
            </span>
          </div>
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
            placeholder={isEnglishMode 
              ? "Type in English (meaning-based)..." 
              : `Type in ${myProfile.motherTongue} using Latin letters...`
            }
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
