/**
 * Production Real-time Chat Translation Component
 * 
 * Features:
 * - Auto-detect source and target language
 * - Latin typing → Live native script preview  
 * - Same language = no translation, both see native script
 * - Sender sees native script immediately on send
 * - Receiver sees message in their native script (translated)
 * - Bi-directional: Both sides type Latin, see native
 * - Non-blocking: All processing in background
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useRealtimeChatTranslation, type ChatUser, type ProcessedMessage } from '@/lib/translation/dl-translate/useRealtimeChatTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Loader2, Globe, Languages, Eye, EyeOff } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  senderId: string;
  senderNativeText: string;      // What sender sees
  receiverNativeText: string;    // What receiver sees
  originalInput: string;         // Raw Latin input
  isTranslated: boolean;
  detectedLanguage: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ProductionChatProps {
  currentUser: ChatUser;
  partner: ChatUser;
  onSendMessage?: (message: ChatMessage) => void;
  onTranslationReady?: (messageId: string, translatedText: string) => void;
  messages?: ChatMessage[];
  className?: string;
  showDebugInfo?: boolean;
}

// ============================================================================
// Message Display Component
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  viewerLanguage: string;
  showOriginal?: boolean;
}

function MessageBubble({ message, isOwn, showOriginal }: MessageBubbleProps) {
  const [showLatin, setShowLatin] = useState(false);

  // Determine which text to display based on viewer
  const displayText = isOwn ? message.senderNativeText : message.receiverNativeText;
  
  return (
    <div className={cn("flex w-full mb-3", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2.5 relative group",
        isOwn 
          ? "bg-primary text-primary-foreground rounded-br-sm" 
          : "bg-muted text-foreground rounded-bl-sm"
      )}>
        {/* Main message text */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {showLatin && message.originalInput ? message.originalInput : displayText}
        </p>
        
        {/* Translation indicator */}
        {message.isTranslated && !isOwn && (
          <div className="flex items-center gap-1.5 mt-1.5 opacity-60">
            <Globe className="h-3 w-3" />
            <span className="text-xs">Translated</span>
          </div>
        )}

        {/* Toggle original Latin text */}
        {message.originalInput && message.originalInput !== displayText && (
          <button
            onClick={() => setShowLatin(!showLatin)}
            className={cn(
              "absolute -right-2 -bottom-2 p-1.5 rounded-full",
              "bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          >
            {showLatin ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
        )}

        {/* Debug info */}
        {showOriginal && (
          <div className="mt-2 pt-2 border-t border-border/20 text-xs opacity-60">
            <p>Latin: {message.originalInput}</p>
            <p>Lang: {message.detectedLanguage}</p>
          </div>
        )}

        {/* Timestamp */}
        <span className={cn(
          "text-[10px] block mt-1",
          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Live Preview Component
// ============================================================================

interface LivePreviewProps {
  input: string;
  nativePreview: string;
  isProcessing: boolean;
  userLanguage: string;
}

function LivePreview({ input, nativePreview, isProcessing, userLanguage }: LivePreviewProps) {
  if (!input) return null;
  
  // Only show if input differs from preview (Latin → Native conversion happening)
  const showPreview = nativePreview && nativePreview !== input;
  
  if (!showPreview) return null;

  return (
    <div className="px-4 py-2 bg-accent/50 border-t border-border/30">
      <div className="flex items-center gap-2">
        <Languages className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Preview in {userLanguage}:</span>
        {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium mt-1 text-foreground">{nativePreview}</p>
    </div>
  );
}

// ============================================================================
// Main Chat Component
// ============================================================================

export function ProductionChatTranslation({
  currentUser,
  partner,
  onSendMessage,
  onTranslationReady,
  messages: externalMessages,
  className,
  showDebugInfo = false,
}: ProductionChatProps) {
  // Internal messages state (use external if provided)
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const messages = externalMessages ?? internalMessages;

  // Scroll ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use the real-time chat translation hook
  const {
    inputText,
    setInputText,
    livePreview,
    sendMessage,
    processIncoming,
    isModelLoading,
    modelLoadProgress,
    needsTranslation,
    translatorStatus,
    detectedLanguage: hookDetectedLanguage,
    isTypingLatin,
    reset,
  } = useRealtimeChatTranslation({
    currentUser,
    partner,
    preloadModel: true,
    debounceMs: 50, // Fast preview updates
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    const processed = await sendMessage();
    if (!processed) return;

    const chatMessage: ChatMessage = {
      id: processed.id,
      senderId: currentUser.id,
      senderNativeText: processed.senderNativeText,
      receiverNativeText: processed.receiverNativeText,
      originalInput: processed.originalInput,
      isTranslated: processed.isTranslated,
      detectedLanguage: processed.detectedLanguage,
      timestamp: processed.timestamp,
      status: 'sent',
    };

    // Update internal state if no external control
    if (!externalMessages) {
      setInternalMessages(prev => [...prev, chatMessage]);
    }

    // Notify parent
    onSendMessage?.(chatMessage);

    // If translation happened, notify when ready
    if (processed.isTranslated) {
      onTranslationReady?.(processed.id, processed.receiverNativeText);
    }
  }, [inputText, sendMessage, currentUser.id, externalMessages, onSendMessage, onTranslationReady]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className={cn("flex flex-col h-full bg-background rounded-xl overflow-hidden border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
            {partner.language.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{partner.id}</p>
            <p className="text-xs text-muted-foreground">{partner.language}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Translation status badge */}
          {needsTranslation ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="h-3 w-3" />
              Auto-translate ON
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs">
              <Languages className="h-3 w-3" />
              Same language
            </Badge>
          )}
          
          {/* Model loading indicator */}
          {isModelLoading && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {Math.round(modelLoadProgress)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Languages className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">Start chatting!</p>
            <p className="text-sm mt-1">
              Type in Latin letters - your message will appear in {currentUser.language}
            </p>
            {needsTranslation && (
              <p className="text-xs mt-2 text-primary">
                Messages will be auto-translated for {partner.id}
              </p>
            )}
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === currentUser.id}
              viewerLanguage={currentUser.language}
              showOriginal={showDebugInfo}
            />
          ))
        )}
      </ScrollArea>

      {/* Live transliteration preview */}
      <LivePreview
        input={livePreview.input}
        nativePreview={livePreview.nativePreview}
        isProcessing={livePreview.isProcessing}
        userLanguage={currentUser.language}
      />

      {/* Input area */}
      <div className="p-4 border-t bg-muted/20">
        {/* Debug info */}
        {showDebugInfo && (
          <div className="mb-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>Typing: {isTypingLatin ? 'Latin' : 'Native'}</span>
              <span>Detected: {hookDetectedLanguage || 'N/A'}</span>
              <span>Queue: {translatorStatus.pendingJobs} pending</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in Latin (${currentUser.language})...`}
            className="flex-1 h-12 text-base bg-background"
            disabled={isModelLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || isModelLoading}
            size="lg"
            className="h-12 w-12 p-0"
          >
            {isModelLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Typing hint */}
        {isTypingLatin && inputText.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Type in Latin → See preview in {currentUser.language} → Send in native script
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductionChatTranslation;
