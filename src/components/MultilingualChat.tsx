/**
 * Multilingual Chat System Component
 * 
 * Features:
 * - Real-time transliteration (Latin → Native script as you type)
 * - Auto language detection from text
 * - Conditional translation (only when languages differ)
 * - 200+ language support via dl-translate
 * - Confidence scores display
 * - Manual language override
 * 
 * @example
 * <MultilingualChat
 *   currentUserId="user-123"
 *   currentUserLanguage="telugu"
 *   partnerUserId="user-456"
 *   partnerLanguage="bengali"
 *   onSendMessage={handleSend}
 * />
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Send, 
  Globe, 
  Languages, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  Info
} from 'lucide-react';
import { useRealTimeTransliteration } from '@/hooks/useRealTimeTransliteration';
import { useLanguageDetection } from '@/hooks/useLanguageDetection';
import { 
  translateForChat, 
  processIncomingMessage,
  isSameLanguage,
  getNativeName,
  LANGUAGES
} from '@/lib/dl-translate';
import { cn } from '@/lib/utils';

// Types
export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  nativeText?: string;
  translatedText?: string;
  senderLanguage: string;
  timestamp: Date;
  isTranslated?: boolean;
  confidence?: number;
  detectedLanguage?: string;
}

interface MultilingualChatProps {
  currentUserId: string;
  currentUserLanguage: string;
  partnerUserId: string;
  partnerLanguage: string;
  messages: ChatMessage[];
  onSendMessage: (message: {
    text: string;
    nativeText: string;
    senderLanguage: string;
    detectedLanguage?: string;
  }) => Promise<void>;
  onLanguageChange?: (language: string) => void;
  className?: string;
  showLanguageSelector?: boolean;
  showConfidence?: boolean;
}

// Language Selector Component
const LanguageSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label?: string;
}> = ({ value, onChange, label }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  
  const filtered = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="capitalize">{getNativeName(value) || value}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-2">
          {label && <p className="text-xs text-muted-foreground px-2">{label}</p>}
          <Input
            placeholder="Search languages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {filtered.map(lang => (
                <Button
                  key={lang.code}
                  variant={value === lang.name ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => {
                    onChange(lang.name);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="text-muted-foreground">{lang.native}</span>
                  <span className="capitalize">{lang.name}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{
  message: ChatMessage;
  isOwnMessage: boolean;
  receiverLanguage: string;
  showConfidence?: boolean;
}> = ({ message, isOwnMessage, receiverLanguage, showConfidence }) => {
  const [displayText, setDisplayText] = useState(message.text);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationInfo, setTranslationInfo] = useState<{
    translated: boolean;
    confidence?: number;
    from?: string;
    to?: string;
  }>({ translated: false });

  useEffect(() => {
    const translateMessage = async () => {
      // Own messages - show native text
      if (isOwnMessage) {
        setDisplayText(message.nativeText || message.text);
        return;
      }

      // Same language - no translation needed
      if (isSameLanguage(message.senderLanguage, receiverLanguage)) {
        setDisplayText(message.nativeText || message.text);
        setTranslationInfo({ translated: false });
        return;
      }

      // Different languages - translate
      setIsTranslating(true);
      try {
        const result = await processIncomingMessage(
          message.nativeText || message.text,
          message.senderLanguage,
          receiverLanguage
        );
        
        setDisplayText(result.text);
        setTranslationInfo({
          translated: result.isTranslated,
          confidence: 0.9, // TODO: Get from API
          from: message.senderLanguage,
          to: receiverLanguage
        });
      } catch (error) {
        console.error('Translation error:', error);
        setDisplayText(message.nativeText || message.text);
      } finally {
        setIsTranslating(false);
      }
    };

    translateMessage();
  }, [message, isOwnMessage, receiverLanguage]);

  return (
    <div className={cn(
      "flex flex-col max-w-[80%] gap-1",
      isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "px-4 py-2 rounded-2xl",
        isOwnMessage 
          ? "bg-primary text-primary-foreground rounded-br-sm" 
          : "bg-muted rounded-bl-sm"
      )}>
        {isTranslating ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm opacity-70">Translating...</span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{displayText}</p>
        )}
      </div>
      
      {/* Translation info */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
        
        {translationInfo.translated && (
          <Badge variant="outline" className="text-xs h-5 gap-1">
            <Languages className="h-3 w-3" />
            <span className="capitalize">{translationInfo.from}</span>
            <span>→</span>
            <span className="capitalize">{translationInfo.to}</span>
          </Badge>
        )}
        
        {showConfidence && translationInfo.confidence && (
          <Badge 
            variant={translationInfo.confidence > 0.8 ? "default" : "secondary"}
            className="text-xs h-5"
          >
            {Math.round(translationInfo.confidence * 100)}%
          </Badge>
        )}
      </div>
    </div>
  );
};

// Main Chat Component
export const MultilingualChat: React.FC<MultilingualChatProps> = ({
  currentUserId,
  currentUserLanguage,
  partnerUserId,
  partnerLanguage,
  messages,
  onSendMessage,
  onLanguageChange,
  className,
  showLanguageSelector = true,
  showConfidence = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userLanguage, setUserLanguage] = useState(currentUserLanguage);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { detectFromText, detectFromBrowser } = useLanguageDetection();
  
  // Real-time transliteration
  const {
    original,
    converted,
    isConverting,
    handleInput,
    convertFullMessage
  } = useRealTimeTransliteration({
    targetLanguage: userLanguage,
    enabled: true,
    debounceMs: 250
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input change with transliteration
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    handleInput(value);
  }, [handleInput]);

  // Handle language change
  const handleLanguageChange = useCallback((lang: string) => {
    setUserLanguage(lang);
    onLanguageChange?.(lang);
  }, [onLanguageChange]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      // Convert full message to native script
      const nativeText = await convertFullMessage(inputValue);
      
      // Detect language from text
      const detected = detectFromText(nativeText);

      await onSendMessage({
        text: inputValue,
        nativeText,
        senderLanguage: userLanguage,
        detectedLanguage: detected.language
      });

      setInputValue('');
      handleInput('');
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, userLanguage, onSendMessage, convertFullMessage, detectFromText, handleInput]);

  // Handle enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Check if same language
  const sameLanguage = isSameLanguage(userLanguage, partnerLanguage);

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="flex-shrink-0 py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Multilingual Chat
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {showLanguageSelector && (
              <LanguageSelector
                value={userLanguage}
                onChange={handleLanguageChange}
                label="Your language"
              />
            )}
            
            {sameLanguage ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Same Language
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Languages className="h-3 w-3" />
                Auto-translate
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === currentUserId}
                receiverLanguage={userLanguage}
                showConfidence={showConfidence}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t space-y-2">
        {/* Live transliteration preview */}
        {converted && converted !== inputValue && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Preview:</span>
            <span className="font-medium truncate">{converted}</span>
            {isConverting && (
              <Loader2 className="h-3 w-3 animate-spin ml-auto" />
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Type in English or ${getNativeName(userLanguage)}...`}
              disabled={isSending}
              className="pr-10"
            />
            {isConverting && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Language info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>
              Type in English – converts to {getNativeName(userLanguage)} automatically
            </span>
          </div>
          {!sameLanguage && (
            <span>
              Translates to {getNativeName(partnerLanguage)} for your partner
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MultilingualChat;
