/**
 * Multilingual Chat Demo Component
 * 
 * Full browser-based implementation with NLLB-200:
 * 1. Sender types in Roman/Latin letters (phonetic input)
 * 2. Spell correction on input
 * 3. Live native script preview while typing
 * 4. On Send: message displays in sender's native script
 * 5. Receiver sees message translated with NLLB-200
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
import { Progress } from '@/components/ui/progress';
import { Send, Loader2, Languages, Eye, EyeOff, Globe, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNLLBChat } from '@/hooks/useNLLBChat';
import { ALL_LANGUAGES } from '@/data/dlTranslateLanguages';

// Message interface
interface ChatMessage {
  id: string;
  originalText: string;
  correctedText?: string;
  senderNativeText: string;
  translatedText?: string;
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
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">All Languages (200+)</div>
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
  const displayText = showTranslated ? (message.translatedText || message.senderNativeText) : message.senderNativeText;

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
        
        {message.correctedText && message.correctedText !== message.originalText && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-amber-600 border-amber-300">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            Corrected
          </Badge>
        )}
        
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
  
  // NLLB Chat Hook
  const { 
    transliteration,
    isModelLoading,
    isModelReady,
    modelLoadProgress,
    isTranslating,
    setInputText: setNLLBInput,
    initializeModel,
    processOutgoing,
    processIncoming,
    getSpellingSuggestion,
    isSameLanguage
  } = useNLLBChat({ 
    userLanguage, 
    partnerLanguage,
    autoCorrectSpelling: true
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Update NLLB input when text changes
  useEffect(() => {
    setNLLBInput(inputText);
  }, [inputText, setNLLBInput]);

  // Auto-initialize model
  useEffect(() => {
    if (!isModelReady && !isModelLoading) {
      initializeModel();
    }
  }, [isModelReady, isModelLoading, initializeModel]);

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);

    try {
      // 1. Process outgoing message with NLLB
      const processed = await processOutgoing(trimmed);
      
      const messageId = `msg-${Date.now()}`;
      
      // 2. Create message
      const newMessage: ChatMessage = {
        id: messageId,
        originalText: processed.originalText,
        correctedText: processed.correctedText,
        senderNativeText: processed.senderNativeText,
        translatedText: processed.translatedText,
        senderLanguage: userLanguage,
        receiverLanguage: partnerLanguage,
        sender: 'user',
        timestamp: new Date(),
        isTranslated: processed.isTranslated
      };

      setMessages(prev => [...prev, newMessage]);
      setInputText('');

      // 3. Simulate partner response (for demo)
      setTimeout(async () => {
        const partnerResponses = [
          'बहुत अच्छा!', 'धन्यवाद', 'मैं समझ गया', 'बढ़िया है',
          'कैसे हो?', 'मुझे बताओ', 'ठीक है', 'हाँ जी'
        ];
        const randomResponse = partnerResponses[Math.floor(Math.random() * partnerResponses.length)];
        
        const partnerMsgId = `msg-${Date.now()}`;
        
        // Translate partner's message for user using NLLB
        const partnerProcessed = await processIncoming(randomResponse, partnerLanguage);
        
        const partnerMsg: ChatMessage = {
          id: partnerMsgId,
          originalText: randomResponse,
          senderNativeText: randomResponse,
          translatedText: partnerProcessed.translatedText,
          senderLanguage: partnerLanguage,
          receiverLanguage: userLanguage,
          sender: 'partner',
          timestamp: new Date(),
          isTranslated: partnerProcessed.isTranslated
        };

        setMessages(prev => [...prev, partnerMsg]);
      }, 1500);

    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, userLanguage, partnerLanguage, processOutgoing, processIncoming]);

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

  // Check if input has spelling suggestion
  const spellingSuggestion = getSpellingSuggestion(inputText);

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-primary" />
            NLLB-200 Multilingual Chat
          </CardTitle>
          
          {/* Model Status */}
          <Badge 
            variant={isModelReady ? "default" : isModelLoading ? "secondary" : "outline"}
            className="text-xs"
          >
            {isModelLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {modelLoadProgress > 0 ? `${Math.round(modelLoadProgress)}%` : 'Loading...'}
              </>
            ) : isModelReady ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                NLLB-200 Ready
              </>
            ) : (
              <button onClick={initializeModel} className="hover:underline flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Load Model
              </button>
            )}
          </Badge>
        </div>

        {/* Model loading progress */}
        {isModelLoading && modelLoadProgress > 0 && (
          <Progress value={modelLoadProgress} className="h-1" />
        )}

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
          Type in English letters (e.g., "bagunnava" for Telugu). Spell correction + transliteration + NLLB-200 translation.
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
                <p className="text-xs mt-1">Powered by NLLB-200 (200+ languages)</p>
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
        {/* Spelling Suggestion */}
        {spellingSuggestion && (
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Suggestion: <span className="font-medium">{spellingSuggestion}</span>
            </span>
          </div>
        )}

        {/* Live Preview */}
        {transliteration.nativePreview && transliteration.nativePreview !== inputText && (
          <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                Preview ({NATIVE_NAMES[userLanguage] || userLanguage})
              </Badge>
              {transliteration.isProcessing && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>
            <p className="text-sm text-foreground/80">{transliteration.nativePreview}</p>
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in English letters (e.g., "namaste", "bagunnava")...`}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isSending}
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending || !isModelReady}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {isSending || isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          🔒 Spell correction • Phonetic transliteration • NLLB-200 translation (200+ languages)
        </p>
      </div>
    </Card>
  );
}

export default MultilingualChatDemo;
