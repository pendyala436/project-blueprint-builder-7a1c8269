/**
 * Offline Chat Translation Components
 * ====================================
 * 
 * React components for offline multilingual chat.
 * Uses the offline translation engine with user profiles.
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Globe, Languages, Loader2 } from 'lucide-react';
import {
  useOfflineTranslation,
  useLivePreview,
  type UserLanguageProfile,
  type ChatMessageViews,
} from './index';

// ============================================================
// CHAT INPUT COMPONENT
// ============================================================

export interface OfflineChatInputProps {
  senderProfile: UserLanguageProfile;
  receiverProfile: UserLanguageProfile;
  onSendMessage: (views: ChatMessageViews) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const OfflineChatInput: React.FC<OfflineChatInputProps> = memo(({
  senderProfile,
  receiverProfile,
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder,
  className,
}) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { translateForProfiles, isReady } = useOfflineTranslation();
  
  const {
    nativePreview,
    englishPreview,
    receiverPreview,
    isGenerating,
    updatePreview,
  } = useLivePreview({
    senderLanguage: senderProfile.motherTongue,
    receiverLanguage: receiverProfile.motherTongue,
  });
  
  const sameLanguage = senderProfile.motherTongue.toLowerCase() === 
                       receiverProfile.motherTongue.toLowerCase();
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    updatePreview(value);
    
    // Typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  }, [updatePreview, onTyping]);
  
  // Handle send
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isSending) return;
    
    setIsSending(true);
    onTyping?.(false);
    
    try {
      const views = await translateForProfiles(trimmed, senderProfile, receiverProfile);
      onSendMessage(views);
      setInput('');
      updatePreview('');
    } catch (err) {
      console.error('[OfflineChatInput] Send error:', err);
    } finally {
      setIsSending(false);
    }
  }, [input, disabled, isSending, translateForProfiles, senderProfile, receiverProfile, onSendMessage, onTyping, updatePreview]);
  
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
    };
  }, []);
  
  const showPreviews = input.trim().length > 0;
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Live Previews */}
      {showPreviews && (
        <div className="space-y-1.5 px-2">
          {/* Native Preview */}
          {nativePreview && nativePreview !== input && (
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {senderProfile.motherTongue}
              </Badge>
              <p className="text-sm text-muted-foreground unicode-text" dir="auto">
                {nativePreview}
              </p>
            </div>
          )}
          
          {/* English Meaning */}
          {englishPreview && englishPreview !== input && (
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">
                <Globe className="h-2.5 w-2.5 mr-1" />
                EN
              </Badge>
              <p className="text-xs text-muted-foreground">
                {isGenerating ? '...' : englishPreview}
              </p>
            </div>
          )}
          
          {/* Receiver Preview */}
          {!sameLanguage && receiverPreview && (
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0 text-blue-600 border-blue-200">
                <Languages className="h-2.5 w-2.5 mr-1" />
                {receiverProfile.motherTongue}
              </Badge>
              <p className="text-xs text-muted-foreground unicode-text" dir="auto">
                {isGenerating ? '...' : receiverPreview}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Type in ${senderProfile.motherTongue}...`}
          disabled={disabled || !isReady}
          className="min-h-[44px] max-h-32 resize-none unicode-text"
          dir="auto"
          rows={1}
        />
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
    </div>
  );
});

OfflineChatInput.displayName = 'OfflineChatInput';

// ============================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================

export interface OfflineMessageBubbleProps {
  views: ChatMessageViews;
  isMe: boolean;
  senderName?: string;
  timestamp?: string;
  showEnglish?: boolean;
  className?: string;
}

export const OfflineMessageBubble: React.FC<OfflineMessageBubbleProps> = memo(({
  views,
  isMe,
  senderName,
  timestamp,
  showEnglish = true,
  className,
}) => {
  // Determine what to display
  const primaryText = isMe ? views.senderView : views.receiverView;
  const englishText = views.englishCore;
  const shouldShowEnglish = showEnglish && 
    englishText && 
    englishText.toLowerCase() !== primaryText.toLowerCase();
  
  return (
    <div
      className={cn(
        'flex gap-2 px-4 py-1',
        isMe ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isMe
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {/* Sender name */}
        {!isMe && senderName && (
          <p className="text-xs font-medium opacity-70 mb-1">
            {senderName}
          </p>
        )}
        
        {/* Primary text (native language) */}
        <p
          className="text-sm unicode-text whitespace-pre-wrap break-words leading-relaxed"
          dir="auto"
        >
          {primaryText}
        </p>
        
        {/* English meaning */}
        {shouldShowEnglish && (
          <div className={cn(
            'mt-1.5 pt-1.5 border-t flex items-start gap-1',
            isMe 
              ? 'border-primary-foreground/20' 
              : 'border-foreground/10'
          )}>
            <Globe className={cn(
              'h-3 w-3 flex-shrink-0 mt-0.5',
              isMe ? 'text-primary-foreground/50' : 'text-muted-foreground'
            )} />
            <p className={cn(
              'text-xs whitespace-pre-wrap break-words',
              isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )} dir="auto">
              {englishText}
            </p>
          </div>
        )}
        
        {/* Timestamp */}
        {timestamp && (
          <div className={cn(
            'flex items-center gap-1.5 mt-1.5',
            isMe ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px]',
              isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
            )}>
              {timestamp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

OfflineMessageBubble.displayName = 'OfflineMessageBubble';

// ============================================================
// TRANSLATION STATUS BADGE
// ============================================================

export interface TranslationStatusBadgeProps {
  views: ChatMessageViews;
  className?: string;
}

export const TranslationStatusBadge: React.FC<TranslationStatusBadgeProps> = memo(({
  views,
  className,
}) => {
  if (!views.wasTranslated && !views.wasTransliterated) {
    return null;
  }
  
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] gap-1', className)}
    >
      <Languages className="h-2.5 w-2.5" />
      {views.wasTranslated ? 'Translated' : 'Transliterated'}
      <span className="opacity-50">
        ({Math.round(views.confidence * 100)}%)
      </span>
    </Badge>
  );
});

TranslationStatusBadge.displayName = 'TranslationStatusBadge';

// ============================================================
// EXPORTS
// ============================================================

export default OfflineChatInput;
