/**
 * DL-Translate Multilingual Chat Component
 * 
 * Features:
 * 1. Real-time transliteration (Latin → native script in input box)
 * 2. Auto language detection for sender/receiver
 * 3. Conditional translation (only when languages differ)
 * 4. Native script storage and display
 * 5. Confidence scores for transliteration/translation
 * 6. Manual language override
 * 7. Supabase Realtime integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Send, 
  Globe, 
  Languages, 
  Loader2, 
  Check, 
  AlertCircle,
  Settings2,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  translate,
  translateForChat,
  convertToNativeScript,
  processOutgoingMessage,
  processIncomingMessage,
  detectScript,
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  getSupportedLanguages,
  getNativeName,
  LANGUAGES
} from '@/lib/dl-translate';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

// Types
interface ChatMessage {
  id: string;
  senderId: string;
  senderLanguage: string;
  originalMessage: string;
  nativeScriptMessage: string;
  translatedMessage?: string;
  detectedLanguage?: string;
  confidence?: number;
  isTranslated: boolean;
  timestamp: string;
}

interface DLTranslateChatProps {
  currentUserId: string;
  partnerId: string;
  userLanguage?: string;
  partnerLanguage?: string;
  chatId?: string;
}

// Language selector with search
const LanguageSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label?: string;
}> = ({ value, onChange, label }) => {
  const languages = getSupportedLanguages();
  
  return (
    <div className="flex flex-col gap-1">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] h-8 text-sm">
          <SelectValue>
            <span className="flex items-center gap-2">
              <Globe className="h-3 w-3" />
              {getNativeName(value) || value}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {languages.slice(0, 50).map((lang) => (
            <SelectItem key={lang.code} value={lang.name}>
              <span className="flex items-center gap-2">
                <span>{lang.native}</span>
                <span className="text-muted-foreground text-xs">({lang.name})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Transliteration preview badge
const TransliterationPreview: React.FC<{
  preview: string;
  isLoading: boolean;
  confidence?: number;
}> = ({ preview, isLoading, confidence }) => {
  if (!preview) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-sm">
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Check className="h-3 w-3 text-green-500" />
      )}
      <span className="font-medium">{preview}</span>
      {confidence && (
        <Badge variant="outline" className="text-xs">
          {Math.round(confidence * 100)}%
        </Badge>
      )}
    </div>
  );
};

// Message bubble component
const MessageBubble: React.FC<{
  message: ChatMessage;
  isOwn: boolean;
  showOriginal: boolean;
}> = ({ message, isOwn, showOriginal }) => {
  const displayText = showOriginal 
    ? message.originalMessage 
    : (message.translatedMessage || message.nativeScriptMessage);
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? 'order-1' : 'order-2'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed">{displayText}</p>
        </div>
        
        {/* Metadata */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          
          {message.isTranslated && (
            <Badge variant="outline" className="text-[10px] py-0">
              <Languages className="h-2.5 w-2.5 mr-1" />
              {message.senderLanguage} → translated
            </Badge>
          )}
          
          {message.confidence && message.confidence < 1 && (
            <Badge variant="secondary" className="text-[10px] py-0">
              {Math.round(message.confidence * 100)}%
            </Badge>
          )}
        </div>
        
        {/* Show original toggle */}
        {message.translatedMessage && message.translatedMessage !== message.originalMessage && (
          <button 
            className="text-xs text-primary/70 hover:text-primary mt-1"
            onClick={() => {/* Toggle handled at parent level */}}
          >
            {showOriginal ? 'Show translation' : 'Show original'}
          </button>
        )}
      </div>
    </div>
  );
};

// Main Chat Component
export const DLTranslateChat: React.FC<DLTranslateChatProps> = ({
  currentUserId,
  partnerId,
  userLanguage: initialUserLanguage = 'english',
  partnerLanguage: initialPartnerLanguage = 'english',
  chatId
}) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [transliteratedText, setTransliteratedText] = useState('');
  const [userLanguage, setUserLanguage] = useState(initialUserLanguage);
  const [partnerLanguage, setPartnerLanguage] = useState(initialPartnerLanguage);
  const [isTransliterating, setIsTransliterating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoTransliterate, setAutoTransliterate] = useState(true);
  const [showOriginalMessages, setShowOriginalMessages] = useState(false);
  const [transliterationConfidence, setTransliterationConfidence] = useState<number>();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedInput = useDebounce(inputText, 300);

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matchedLang = LANGUAGES.find(l => l.code === browserLang);
    if (matchedLang && !initialUserLanguage) {
      setUserLanguage(matchedLang.name);
    }
  }, [initialUserLanguage]);

  // Real-time transliteration as user types
  useEffect(() => {
    if (!autoTransliterate || !debouncedInput.trim()) {
      setTransliteratedText('');
      setTransliterationConfidence(undefined);
      return;
    }

    // Only transliterate if user's language uses non-Latin script and input is Latin
    if (!isLatinScript(debouncedInput)) {
      setTransliteratedText(debouncedInput);
      return;
    }

    const performTransliteration = async () => {
      setIsTransliterating(true);
      try {
        const result = await convertToNativeScript(debouncedInput, userLanguage);
        if (result.isTranslated && result.text !== debouncedInput) {
          setTransliteratedText(result.text);
          setTransliterationConfidence(0.9); // Server doesn't return confidence yet
        } else {
          setTransliteratedText(debouncedInput);
          setTransliterationConfidence(1);
        }
      } catch (error) {
        console.error('[DLTranslateChat] Transliteration error:', error);
        setTransliteratedText(debouncedInput);
      } finally {
        setIsTransliterating(false);
      }
    };

    performTransliteration();
  }, [debouncedInput, userLanguage, autoTransliterate]);

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    const messageText = inputText.trim();
    setInputText('');
    setTransliteratedText('');

    try {
      // Step 1: Process outgoing message (convert Latin to native script if needed)
      const processed = await processOutgoingMessage(messageText, userLanguage);
      const nativeScriptMessage = processed.text;
      
      // Step 2: Detect the actual language from the text
      const detected = detectScript(nativeScriptMessage);
      const actualSenderLanguage = detected.language !== 'english' 
        ? detected.language 
        : userLanguage;

      // Step 3: Translate for receiver if languages differ
      let translatedMessage: string | undefined;
      let isTranslated = false;

      if (!isSameLanguage(actualSenderLanguage, partnerLanguage)) {
        const translation = await processIncomingMessage(
          nativeScriptMessage,
          actualSenderLanguage,
          partnerLanguage
        );
        if (translation.isTranslated) {
          translatedMessage = translation.text;
          isTranslated = true;
        }
      }

      // Step 4: Create message object
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: currentUserId,
        senderLanguage: actualSenderLanguage,
        originalMessage: messageText,
        nativeScriptMessage,
        translatedMessage,
        detectedLanguage: detected.language,
        confidence: 0.9,
        isTranslated,
        timestamp: new Date().toISOString()
      };

      // Add to local state immediately
      setMessages(prev => [...prev, newMessage]);

      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);

      // Store in database if chatId provided
      if (chatId) {
        await supabase.from('chat_messages').insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: nativeScriptMessage,
          translated_message: translatedMessage,
          is_translated: isTranslated
        });
      }

      toast.success('Message sent');
    } catch (error) {
      console.error('[DLTranslateChat] Send error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Subscribe to realtime messages
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          const msg = payload.new as any;
          
          // Skip if it's our own message
          if (msg.sender_id === currentUserId) return;

          // Process incoming message for translation
          let translatedMessage = msg.translated_message;
          
          if (!translatedMessage && msg.sender_id !== currentUserId) {
            // Translate for current user
            const detected = detectScript(msg.message);
            if (!isSameLanguage(detected.language, userLanguage)) {
              const result = await processIncomingMessage(
                msg.message,
                detected.language,
                userLanguage
              );
              if (result.isTranslated) {
                translatedMessage = result.text;
              }
            }
          }

          const newMessage: ChatMessage = {
            id: msg.id,
            senderId: msg.sender_id,
            senderLanguage: detectLanguage(msg.message),
            originalMessage: msg.message,
            nativeScriptMessage: msg.message,
            translatedMessage,
            isTranslated: !!translatedMessage,
            timestamp: msg.created_at
          };

          setMessages(prev => [...prev, newMessage]);
          
          // Scroll to bottom
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId, userLanguage]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Multilingual Chat
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-4 w-4" />
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center gap-6">
              <LanguageSelector
                value={userLanguage}
                onChange={setUserLanguage}
                label="Your Language"
              />
              <LanguageSelector
                value={partnerLanguage}
                onChange={setPartnerLanguage}
                label="Partner Language"
              />
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-transliterate"
                  checked={autoTransliterate}
                  onCheckedChange={setAutoTransliterate}
                />
                <Label htmlFor="auto-transliterate" className="text-sm">
                  Real-time transliteration
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="show-original"
                  checked={showOriginalMessages}
                  onCheckedChange={setShowOriginalMessages}
                />
                <Label htmlFor="show-original" className="text-sm">
                  Show original text
                </Label>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>• Type in Latin letters (e.g., "bagunnava") to see real-time conversion to {getNativeName(userLanguage) || userLanguage}</p>
              <p>• Messages are automatically translated when sender and receiver languages differ</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Globe className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Start a conversation in any language</p>
              <p className="text-xs mt-1">Supporting 200+ languages with auto-translation</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
                showOriginal={showOriginalMessages}
              />
            ))
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t space-y-2">
          {/* Transliteration Preview */}
          {transliteratedText && transliteratedText !== inputText && (
            <TransliterationPreview
              preview={transliteratedText}
              isLoading={isTransliterating}
              confidence={transliterationConfidence}
            />
          )}

          {/* Input Row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type in any language... (${getNativeName(userLanguage) || userLanguage})`}
                className="pr-10"
                disabled={isSending}
              />
              {isTransliterating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSending}
              className="px-4"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Language Detection Info */}
          {inputText && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>
                Detected: {detectLanguage(inputText) || 'typing...'}
                {!isSameLanguage(detectLanguage(inputText), partnerLanguage) && (
                  <span className="ml-2 text-primary">
                    → Will translate to {getNativeName(partnerLanguage) || partnerLanguage}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DLTranslateChat;
