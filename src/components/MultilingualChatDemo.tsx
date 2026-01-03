/**
 * Multilingual Chat Demo Component
 * 
 * Full browser-based implementation:
 * 1. Sender types in Roman/Latin letters (phonetic input)
 * 2. Live native script preview while typing
 * 3. On Send: message displays in sender's native script
 * 4. Receiver sees message in their native language
 * 5. Background translation using DL-Translate (200+ languages)
 * 6. No partial/half messages ever sent
 */

import { useState, useCallback, useRef, memo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, Loader2, Languages, Eye, EyeOff, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServerTranslation } from '@/hooks/useServerTranslation';
import { useMLTranslation } from '@/hooks/useMLTranslation';
import { ALL_LANGUAGES } from '@/data/dlTranslateLanguages';

// Message interface
interface ChatMessage {
  id: string;
  originalText: string;           // Original text in sender's native script
  translatedText?: string;        // Translated text for receiver
  senderLanguage: string;
  receiverLanguage: string;
  sender: 'user' | 'partner';
  timestamp: Date;
  isTranslated: boolean;
  showOriginal?: boolean;
}

// Native language names mapping
const NATIVE_NAMES: Record<string, string> = {
  english: 'English', hindi: 'हिंदी', bengali: 'বাংলা', telugu: 'తెలుగు',
  marathi: 'मराठी', tamil: 'தமிழ்', gujarati: 'ગુજરાતી', kannada: 'ಕನ್ನಡ',
  malayalam: 'മലയാളം', punjabi: 'ਪੰਜਾਬੀ', odia: 'ଓଡ଼ିଆ', urdu: 'اردو',
  arabic: 'العربية', spanish: 'Español', french: 'Français', german: 'Deutsch',
  chinese: '中文', japanese: '日本語', korean: '한국어', russian: 'Русский',
  portuguese: 'Português', italian: 'Italiano', dutch: 'Nederlands',
  thai: 'ไทย', vietnamese: 'Tiếng Việt', indonesian: 'Bahasa Indonesia',
  turkish: 'Türkçe', persian: 'فارسی', hebrew: 'עברית', greek: 'Ελληνικά',
  polish: 'Polski', czech: 'Čeština', hungarian: 'Magyar', romanian: 'Română',
  ukrainian: 'Українська', swedish: 'Svenska', danish: 'Dansk', finnish: 'Suomi',
  norwegian: 'Norsk', swahili: 'Kiswahili', nepali: 'नेपाली', sinhala: 'සිංහල',
  assamese: 'অসমীয়া', burmese: 'မြန်မာ', khmer: 'ខ្មែរ', lao: 'ລາວ',
  amharic: 'አማርኛ', yoruba: 'Yorùbá', igbo: 'Igbo', zulu: 'isiZulu'
};

// Popular languages for quick selection
const POPULAR_LANGUAGES = [
  'english', 'hindi', 'telugu', 'tamil', 'bengali', 'marathi', 
  'gujarati', 'kannada', 'malayalam', 'punjabi', 'urdu', 'arabic',
  'spanish', 'french', 'german', 'chinese', 'japanese', 'korean',
  'russian', 'portuguese', 'italian', 'thai', 'vietnamese', 'indonesian'
];

// Language selector component
const LanguageSelector = memo(({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (value: string) => void;
  label: string;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-muted-foreground font-medium">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Popular</div>
        {POPULAR_LANGUAGES.map(lang => (
          <SelectItem key={lang} value={lang} className="text-sm">
            {NATIVE_NAMES[lang] || lang}
          </SelectItem>
        ))}
        <Separator className="my-1" />
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">All Languages</div>
        {ALL_LANGUAGES.slice(0, 50).map(lang => (
          <SelectItem key={lang.code} value={lang.name.toLowerCase()} className="text-sm">
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
));
LanguageSelector.displayName = 'LanguageSelector';

// Message bubble component
const MessageBubble = memo(({ 
  message, 
  currentLanguage,
  onToggleOriginal 
}: { 
  message: ChatMessage;
  currentLanguage: string;
  onToggleOriginal: () => void;
}) => {
  const isUser = message.sender === 'user';
  const showTranslated = message.isTranslated && !message.showOriginal;
  const displayText = showTranslated ? (message.translatedText || message.originalText) : message.originalText;

  return (
    <div className={cn(
      "flex flex-col gap-1 max-w-[85%]",
      isUser ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "px-3 py-2 rounded-2xl text-sm",
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted text-foreground rounded-bl-md"
      )}>
        <p className="break-words whitespace-pre-wrap">{displayText}</p>
      </div>
      
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        
        {message.isTranslated && (
          <button
            onClick={onToggleOriginal}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            {message.showOriginal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {message.showOriginal ? 'Hide' : 'View'} original
          </button>
        )}
        
        {message.isTranslated && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
            {NATIVE_NAMES[message.senderLanguage] || message.senderLanguage} → {NATIVE_NAMES[currentLanguage] || currentLanguage}
          </Badge>
        )}
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// Main component
export function MultilingualChatDemo() {
  // State
  const [userLanguage, setUserLanguage] = useState('telugu');
  const [partnerLanguage, setPartnerLanguage] = useState('hindi');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Hooks
  const { 
    livePreview, 
    updateLivePreview, 
    clearLivePreview,
    processOutgoing,
    processIncoming,
    isTranslating,
    needsTranslation
  } = useServerTranslation({ 
    userLanguage, 
    partnerLanguage 
  });
  
  const { 
    isReady: isMLReady, 
    isLoading: isMLLoading, 
    progress: mlProgress,
    initialize: initializeML
  } = useMLTranslation({ autoLoad: true });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Update live preview as user types
  useEffect(() => {
    updateLivePreview(inputText);
  }, [inputText, updateLivePreview]);

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);

    try {
      // 1. Process outgoing message (convert Latin → Native script)
      const processedOutgoing = await processOutgoing(trimmed);
      
      const messageId = `msg-${Date.now()}`;
      
      // 2. Create message in sender's native script
      const newMessage: ChatMessage = {
        id: messageId,
        originalText: processedOutgoing.text, // Native script version
        senderLanguage: userLanguage,
        receiverLanguage: partnerLanguage,
        sender: 'user',
        timestamp: new Date(),
        isTranslated: false
      };

      // 3. If languages differ, translate for partner (background)
      if (needsTranslation(userLanguage, partnerLanguage)) {
        const translated = await processIncoming(processedOutgoing.text, userLanguage);
        newMessage.translatedText = translated.text;
        newMessage.isTranslated = translated.isTranslated;
      }

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      clearLivePreview();

      // 4. Simulate partner response (for demo)
      setTimeout(async () => {
        const partnerResponses = [
          'बहुत अच्छा!', 'धन्यवाद', 'मैं समझ गया', 'बढ़िया है',
          'कैसे हो?', 'मुझे बताओ', 'ठीक है', 'हाँ जी'
        ];
        const randomResponse = partnerResponses[Math.floor(Math.random() * partnerResponses.length)];
        
        const partnerMsgId = `msg-${Date.now()}`;
        const partnerMsg: ChatMessage = {
          id: partnerMsgId,
          originalText: randomResponse,
          senderLanguage: partnerLanguage,
          receiverLanguage: userLanguage,
          sender: 'partner',
          timestamp: new Date(),
          isTranslated: false
        };

        // Translate partner's message for user
        if (needsTranslation(partnerLanguage, userLanguage)) {
          const translatedForUser = await processIncoming(randomResponse, partnerLanguage);
          partnerMsg.translatedText = translatedForUser.text;
          partnerMsg.isTranslated = translatedForUser.isTranslated;
        }

        setMessages(prev => [...prev, partnerMsg]);
      }, 1500);

    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, userLanguage, partnerLanguage, processOutgoing, processIncoming, needsTranslation, clearLivePreview]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Toggle original text visibility
  const toggleOriginal = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, showOriginal: !msg.showOriginal } : msg
    ));
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-primary" />
            Multilingual Chat Demo
          </CardTitle>
          
          {/* ML Translation Status */}
          <Badge 
            variant={isMLReady ? "default" : isMLLoading ? "secondary" : "outline"}
            className="text-xs"
          >
          {isMLLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {mlProgress.status === 'downloading' ? `${Math.round(mlProgress.progress)}%` : 'Loading...'}
              </>
            ) : isMLReady ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                DL-Translate Ready
              </>
            ) : (
              <button onClick={initializeML} className="hover:underline">
                Load Translator
              </button>
            )}
          </Badge>
        </div>

        {/* Language Selection */}
        <div className="grid grid-cols-2 gap-4">
          <LanguageSelector
            value={userLanguage}
            onChange={setUserLanguage}
            label="Your Language (Mother Tongue)"
          />
          <LanguageSelector
            value={partnerLanguage}
            onChange={setPartnerLanguage}
            label="Partner's Language"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Type in English letters (e.g., "bagunnava" for Telugu). Your message will be converted to {NATIVE_NAMES[userLanguage] || userLanguage} script and translated for your partner.
        </p>
      </CardHeader>

      <Separator />

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                <Languages className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Start chatting in your language!</p>
                <p className="text-xs">Type in English letters - we'll convert to native script.</p>
              </div>
            )}
            
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                currentLanguage={message.sender === 'user' ? partnerLanguage : userLanguage}
                onToggleOriginal={() => toggleOriginal(message.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      <Separator />

      {/* Input Area */}
      <div className="p-4 space-y-2">
        {/* Live Preview */}
        {livePreview && livePreview !== inputText && (
          <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                Preview ({NATIVE_NAMES[userLanguage] || userLanguage})
              </Badge>
              {isTranslating && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>
            <p className="text-sm text-foreground/80">{livePreview}</p>
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in English letters (e.g., "bagunnava" for Telugu)...`}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isSending}
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          🔒 No partial messages sent • Background translation • 200+ languages via DL-Translate
        </p>
      </div>
    </Card>
  );
}

export default MultilingualChatDemo;
