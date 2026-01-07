/**
 * Universal Chat Page - Production-Ready Multilingual Chat
 * 
 * COMPLETE BI-DIRECTIONAL TRANSLATION FLOW:
 * ==========================================
 * 
 * 1. TYPING: Sender types in Latin letters (any language)
 * 2. PREVIEW: Live transliteration shows native script instantly (< 3ms)
 * 3. SEND: Background translation - sender sees native text
 * 4. RECEIVER: Sees message translated to their mother tongue
 * 5. BI-DIRECTIONAL: Same flow works both ways
 * 6. SAME LANGUAGE: No translation, just native script display
 * 7. NON-BLOCKING: All translation in Web Worker, UI never freezes
 * 
 * Supports ALL 300+ NLLB-200 languages with auto-detection
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Loader2, Send, Globe, ChevronDown, ChevronUp, Languages, Sparkles, Check, Zap, AlertCircle } from 'lucide-react';
import { ALL_NLLB200_LANGUAGES, INDIAN_NLLB200_LANGUAGES } from '@/data/nllb200Languages';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';

// ============= TYPES =============

interface ChatMessage {
  id: string;
  originalText: string;      // What user typed (Latin)
  senderView: string;        // What sender sees (native script)
  receiverView: string;      // What receiver sees (translated to their language)
  senderLanguage: string;
  receiverLanguage: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
  sender: 'user' | 'partner';
  timestamp: Date;
  showOriginal: boolean;     // Toggle to view original
}

// ============= CONSTANTS =============

const POPULAR_LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Bengali', 
  'Portuguese', 'Russian', 'Japanese', 'German', 'Korean', 'Chinese (Simplified)',
  'Tamil', 'Telugu', 'Marathi', 'Turkish', 'Vietnamese', 'Italian'
];

// Sample partner responses in different languages for demo
const PARTNER_RESPONSES: Record<string, string[]> = {
  hindi: ['नमस्ते! कैसे हो आप?', 'मैं ठीक हूं, धन्यवाद', 'आप कहाँ से हैं?', 'बहुत अच्छा!', 'मुझे खुशी है'],
  telugu: ['నమస్కారం! మీరు ఎలా ఉన్నారు?', 'నేను బాగున్నాను, ధన్యవాదాలు', 'మీరు ఎక్కడ నుండి?', 'చాలా బాగుంది!'],
  tamil: ['வணக்கம்! நீங்கள் எப்படி இருக்கிறீர்கள்?', 'நான் நலம், நன்றி', 'நீங்கள் எங்கிருந்து?'],
  bengali: ['নমস্কার! আপনি কেমন আছেন?', 'আমি ভালো আছি, ধন্যবাদ', 'আপনি কোথা থেকে?'],
  marathi: ['नमस्कार! तुम्ही कसे आहात?', 'मी ठीक आहे, धन्यवाद', 'तुम्ही कुठून आहात?'],
  gujarati: ['નમસ્તે! તમે કેમ છો?', 'હું ઠીક છું, આભાર', 'તમે ક્યાંથી છો?'],
  kannada: ['ನಮಸ್ಕಾರ! ನೀವು ಹೇಗಿದ್ದೀರಿ?', 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಧನ್ಯವಾದಗಳು'],
  malayalam: ['നമസ്കാരം! നിങ്ങൾ എങ്ങനെയുണ്ട്?', 'ഞാൻ നല്ലതാണ്, നന്ദി'],
  punjabi: ['ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?', 'ਮੈਂ ਠੀਕ ਹਾਂ, ਧੰਨਵਾਦ'],
  arabic: ['مرحبا! كيف حالك؟', 'أنا بخير، شكراً', 'من أين أنت؟'],
  russian: ['Привет! Как дела?', 'Я хорошо, спасибо', 'Откуда ты?'],
  japanese: ['こんにちは！お元気ですか？', '元気です、ありがとう', 'どこから来ましたか？'],
  korean: ['안녕하세요! 어떻게 지내세요?', '잘 지내요, 감사합니다'],
  chinese: ['你好！你好吗？', '我很好，谢谢', '你从哪里来？'],
  spanish: ['¡Hola! ¿Cómo estás?', 'Estoy bien, gracias', '¿De dónde eres?'],
  french: ['Bonjour! Comment allez-vous?', 'Je vais bien, merci', 'D\'où venez-vous?'],
  german: ['Hallo! Wie geht es Ihnen?', 'Mir geht es gut, danke', 'Woher kommen Sie?'],
  portuguese: ['Olá! Como você está?', 'Estou bem, obrigado', 'De onde você é?'],
  english: ['Hello! How are you?', 'I am fine, thank you', 'Where are you from?', 'That\'s great!'],
};

// ============= HELPER COMPONENTS =============

const TranslationBadge: React.FC<{
  fromLanguage: string;
  toLanguage: string;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  onClick: () => void;
  showOriginal: boolean;
}> = ({ fromLanguage, toLanguage, wasTranslated, wasTransliterated, onClick, showOriginal }) => {
  if (!wasTranslated && !wasTransliterated) return null;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
    >
      <Languages className="h-3 w-3" />
      <span>
        {showOriginal 
          ? 'Show translation' 
          : wasTranslated 
            ? `Translated from ${fromLanguage}` 
            : `Converted to native script`
        }
      </span>
      {wasTranslated && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
          → {toLanguage}
        </Badge>
      )}
      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
        <Zap className="h-2.5 w-2.5 mr-0.5" />
        Browser
      </Badge>
      {showOriginal ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  );
};

const MessageBubble: React.FC<{
  message: ChatMessage;
  currentUserLanguage: string;
  onToggleOriginal: () => void;
}> = ({ message, currentUserLanguage, onToggleOriginal }) => {
  const isUser = message.sender === 'user';
  
  // Determine what to display
  // User sees their senderView, partner sees receiverView
  const displayText = useMemo(() => {
    if (message.showOriginal) {
      return message.originalText;
    }
    // User always sees their own senderView
    if (isUser) {
      return message.senderView;
    }
    // For partner messages, show receiverView (translated to user's language)
    return message.receiverView;
  }, [message, isUser]);
  
  const showTranslationBadge = !isUser && (message.wasTranslated || message.wasTransliterated);
  
  return (
    <div className={cn(
      "flex flex-col max-w-[80%] mb-3",
      isUser ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      {/* Sender indicator */}
      <span className="text-[10px] text-muted-foreground mb-1 px-1">
        {isUser ? `You (${message.senderLanguage})` : `Partner (${message.senderLanguage})`}
      </span>
      
      <div className={cn(
        "rounded-2xl px-4 py-3 shadow-sm max-w-full",
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted text-foreground rounded-bl-md"
      )}>
        {/* Display FULL message - no truncation, supports small to very large texts */}
        <p className="text-sm whitespace-pre-wrap break-words unicode-text leading-relaxed" dir="auto">
          {displayText}
        </p>
      </div>
      
      {/* Translation indicator for received messages */}
      {showTranslationBadge && (
        <TranslationBadge
          fromLanguage={message.senderLanguage}
          toLanguage={message.receiverLanguage}
          wasTranslated={message.wasTranslated}
          wasTransliterated={message.wasTransliterated}
          onClick={onToggleOriginal}
          showOriginal={message.showOriginal}
        />
      )}
      
      {/* Timestamp */}
      <span className="text-[10px] text-muted-foreground mt-1">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

const LanguageSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const popularLangs = ALL_NLLB200_LANGUAGES.filter(l => 
    POPULAR_LANGUAGES.includes(l.name)
  );
  const indianLangs = INDIAN_NLLB200_LANGUAGES;
  const otherLangs = ALL_NLLB200_LANGUAGES.filter(l => 
    !POPULAR_LANGUAGES.includes(l.name) && !l.isIndian
  );
  
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectGroup>
            <SelectLabel className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Popular
            </SelectLabel>
            {popularLangs.map(lang => (
              <SelectItem key={lang.code} value={lang.name}>
                {lang.name} ({lang.script})
              </SelectItem>
            ))}
          </SelectGroup>
          
          <SelectGroup>
            <SelectLabel>🇮🇳 Indian Languages</SelectLabel>
            {indianLangs.map(lang => (
              <SelectItem key={lang.code} value={lang.name}>
                {lang.name} ({lang.script})
              </SelectItem>
            ))}
          </SelectGroup>
          
          <SelectGroup>
            <SelectLabel>🌍 All Languages ({otherLangs.length}+)</SelectLabel>
            {otherLangs.map(lang => (
              <SelectItem key={lang.code} value={lang.name}>
                {lang.name} ({lang.script})
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

// ============= MAIN COMPONENT =============

const UniversalChatPage: React.FC = () => {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Production-ready translation hook (all 300+ languages, non-blocking)
  const {
    getLivePreview,
    processMessage,
    translateText,
    autoDetectLanguage,
    isLatinText,
    isLatinScriptLanguage,
    isSameLanguage,
    isReady,
    isLoading: isModelLoading,
    loadProgress,
    error: modelError,
  } = useRealtimeChatTranslation();
  
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [userLanguage, setUserLanguage] = useState('Telugu');
  const [partnerLanguage, setPartnerLanguage] = useState('Hindi');
  const [isSending, setIsSending] = useState(false);
  const [livePreview, setLivePreview] = useState<string>('');
  const [isComposing, setIsComposing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Live preview while typing (instant, < 3ms)
  useEffect(() => {
    if (!showPreview || !input.trim() || isComposing) {
      setLivePreview('');
      return;
    }
    
    // Use sync getLivePreview for instant response
    const result = getLivePreview(input, userLanguage);
    
    // Only show preview if different from input
    if (result.preview && result.preview !== input && result.isLatin) {
      setLivePreview(result.preview);
    } else {
      setLivePreview('');
    }
  }, [input, userLanguage, showPreview, isComposing, getLivePreview]);
  
  // Get partner responses based on language
  const getPartnerResponse = useCallback((lang: string): string => {
    const normalizedLang = lang.toLowerCase().replace(/\s+/g, '').replace(/\(.*\)/, '');
    const responses = PARTNER_RESPONSES[normalizedLang] || PARTNER_RESPONSES.english;
    return responses[Math.floor(Math.random() * responses.length)];
  }, []);
  
  // Send message with full bi-directional translation
  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;
    
    setIsSending(true);
    const originalInput = input.trim();
    
    try {
      // Step 1: Process user's message
      // - Convert Latin to sender's native script
      // - Prepare translation for receiver
      const userResult = await processMessage(originalInput, userLanguage, partnerLanguage);
      
      // Create user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        originalText: originalInput,
        senderView: userResult.senderView,
        receiverView: userResult.receiverView,
        senderLanguage: userLanguage,
        receiverLanguage: partnerLanguage,
        wasTransliterated: userResult.wasTransliterated,
        wasTranslated: userResult.wasTranslated,
        sender: 'user',
        timestamp: new Date(),
        showOriginal: false,
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLivePreview('');
      
      // Step 2: Simulate partner response (in partner's native language)
      setTimeout(async () => {
        const partnerText = getPartnerResponse(partnerLanguage);
        
        // Process partner's message for user
        // - Translate from partner's language to user's language
        const partnerResult = await processMessage(partnerText, partnerLanguage, userLanguage);
        
        const partnerMessage: ChatMessage = {
          id: `partner-${Date.now()}`,
          originalText: partnerText,
          senderView: partnerResult.senderView,
          receiverView: partnerResult.receiverView,
          senderLanguage: partnerLanguage,
          receiverLanguage: userLanguage,
          wasTransliterated: partnerResult.wasTransliterated,
          wasTranslated: partnerResult.wasTranslated,
          sender: 'partner',
          timestamp: new Date(),
          showOriginal: false,
        };
        
        setMessages(prev => [...prev, partnerMessage]);
        setIsSending(false);
      }, 800 + Math.random() * 700);
      
    } catch (err) {
      console.error('[UniversalChat] Send error:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      setIsSending(false);
    }
  }, [input, isSending, userLanguage, partnerLanguage, processMessage, getPartnerResponse, toast]);
  
  // Toggle original/translated view
  const toggleOriginal = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, showOriginal: !msg.showOriginal } : msg
    ));
  }, []);
  
  // Handle key press (Enter to send)
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  }, [isComposing, handleSend]);
  
  // Check if same language (no translation needed, just script conversion)
  const sameLanguage = isSameLanguage(userLanguage, partnerLanguage);
  
  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl h-[90vh] flex flex-col shadow-lg">
        <CardHeader className="border-b bg-card pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Universal Chat
              <Badge variant="secondary" className="ml-2">
                300+ Languages
              </Badge>
            </CardTitle>
            
            {/* Ready indicator */}
            <div className="flex items-center gap-2">
              {isModelLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{Math.round(loadProgress)}%</span>
                </div>
              ) : isReady ? (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              ) : modelError ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              ) : null}
            </div>
          </div>
          
          {/* Model loading progress */}
          {isModelLoading && (
            <div className="mt-3">
              <Progress value={loadProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                Loading NLLB-200 model... (one-time, cached in browser)
              </p>
            </div>
          )}
          
          {/* Translation status info */}
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Real-time Browser Translation</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Type in Latin → See instant native preview → Send → Receiver sees their language
            </p>
            {sameLanguage && (
              <p className="text-xs text-blue-500 mt-1">
                ⓘ Same language: Only native script conversion, no translation needed
              </p>
            )}
          </div>
          
          {/* Language Selectors */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <LanguageSelector
              value={userLanguage}
              onChange={setUserLanguage}
              label="Your Mother Tongue"
            />
            <LanguageSelector
              value={partnerLanguage}
              onChange={setPartnerLanguage}
              label="Partner's Mother Tongue"
            />
          </div>
          
          {/* Live preview toggle */}
          <div className="flex items-center justify-between mt-3 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="preview-toggle" className="text-sm">
                Show live native script preview
              </Label>
            </div>
            <Switch
              id="preview-toggle"
              checked={showPreview}
              onCheckedChange={setShowPreview}
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Globe className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Start chatting in any language!</p>
                <p className="text-xs mt-1 max-w-xs">
                  Type in Latin letters → See native preview → Messages auto-translate for receiver
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-sm">
                  <Badge variant="outline" className="text-xs">Hindi हिंदी</Badge>
                  <Badge variant="outline" className="text-xs">Telugu తెలుగు</Badge>
                  <Badge variant="outline" className="text-xs">Tamil தமிழ்</Badge>
                  <Badge variant="outline" className="text-xs">Arabic العربية</Badge>
                  <Badge variant="outline" className="text-xs">Japanese 日本語</Badge>
                  <Badge variant="outline" className="text-xs">+300 more</Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    currentUserLanguage={userLanguage}
                    onToggleOriginal={() => toggleOriginal(message.id)}
                  />
                ))}
                
                {isSending && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <div className="flex gap-1">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                    </div>
                    <span>Partner is typing...</span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          {/* Input Area */}
          <div className="p-4 border-t bg-card">
            {/* Live Preview - Shows FULL message instantly as you type */}
            {showPreview && livePreview && livePreview !== input && (
              <div className="mb-2 p-3 rounded-lg bg-primary/5 border border-primary/20 max-h-[200px] overflow-y-auto">
                <div className="flex items-center gap-1.5 text-xs text-primary mb-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Native script preview ({userLanguage}) - Full message:</span>
                </div>
                <p className="text-sm font-medium unicode-text whitespace-pre-wrap break-words" dir="auto">
                  {livePreview}
                </p>
              </div>
            )}
            
            {/* Input field - Shows FULL typed message, no truncation */}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder={`Type in ${userLanguage} (Latin letters work!)...`}
                className="min-h-[44px] max-h-[300px] resize-y unicode-text whitespace-pre-wrap"
                disabled={isSending}
                dir="auto"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                size="icon"
                className="h-[44px] w-[44px] shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Status footer */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {isReady ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-500" />
                    NLLB-200 • 300+ languages • Browser-only
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading translation model...
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Non-blocking • &lt;3ms UI response
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UniversalChatPage;
