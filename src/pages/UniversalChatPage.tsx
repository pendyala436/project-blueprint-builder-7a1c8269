/**
 * Universal Chat Page - Single Page Multilingual Chat
 * 
 * Features:
 * - 200+ NLLB-200 language support via Supabase Edge Function
 * - Auto-detect source language
 * - Auto-transliterate Romanized input → native script
 * - Translate to target language in native script
 * - "Translated from X" indicator (Tinder-style)
 * - Full Unicode support with IME
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Loader2, Send, Globe, ChevronDown, ChevronUp, Languages, Sparkles, Check } from 'lucide-react';
import { ALL_NLLB200_LANGUAGES, INDIAN_NLLB200_LANGUAGES } from '@/data/nllb200Languages';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslationService } from '@/hooks/useTranslationService';

// ============= TYPES =============

interface Message {
  id: string;
  text: string;
  translatedText?: string;
  sourceLanguage: string;
  targetLanguage?: string;
  isTranslated: boolean;
  showOriginal: boolean;
  sender: 'user' | 'partner';
  timestamp: Date;
  model?: string;
  usedPivot?: boolean;
}

// ============= CONSTANTS =============

const POPULAR_LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Bengali', 
  'Portuguese', 'Russian', 'Japanese', 'German', 'Korean', 'Chinese (Simplified)',
  'Tamil', 'Telugu', 'Marathi', 'Turkish', 'Vietnamese', 'Italian'
];

// ============= HELPER COMPONENTS =============

const TranslatedFromBadge: React.FC<{
  sourceLanguage: string;
  model?: string;
  usedPivot?: boolean;
  onClick: () => void;
  showOriginal: boolean;
}> = ({ sourceLanguage, model, usedPivot, onClick, showOriginal }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
  >
    <Languages className="h-3 w-3" />
    <span>
      {showOriginal ? 'Show translation' : `Translated from ${sourceLanguage}`}
    </span>
    {usedPivot && (
      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
        via English
      </Badge>
    )}
    {model && (
      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
        {model.includes('fallback') ? 'local' : 'NLLB'}
      </Badge>
    )}
    {showOriginal ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
  </button>
);

const MessageBubble: React.FC<{
  message: Message;
  onToggleOriginal: () => void;
  userLanguage: string;
}> = ({ message, onToggleOriginal, userLanguage }) => {
  const isUser = message.sender === 'user';
  const displayText = message.showOriginal ? message.text : (message.translatedText || message.text);
  const needsTranslation = message.isTranslated && message.sourceLanguage.toLowerCase() !== userLanguage.toLowerCase();
  
  return (
    <div className={cn(
      "flex flex-col max-w-[80%] mb-3",
      isUser ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "rounded-2xl px-4 py-2.5 shadow-sm",
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted text-foreground rounded-bl-md"
      )}>
        <p className="text-sm whitespace-pre-wrap break-words" dir="auto">
          {displayText}
        </p>
      </div>
      
      {/* Tinder-style "Translated from X" indicator */}
      {needsTranslation && !isUser && (
        <TranslatedFromBadge
          sourceLanguage={message.sourceLanguage}
          model={message.model}
          usedPivot={message.usedPivot}
          onClick={onToggleOriginal}
          showOriginal={message.showOriginal}
        />
      )}
      
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
  
  // Server-side translator via edge function
  const {
    translate,
    convertToNativeScript,
    isTranslating,
    error: translationError,
  } = useTranslationService();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userLanguage, setUserLanguage] = useState('English');
  const [partnerLanguage, setPartnerLanguage] = useState('Hindi');
  const [isLoading, setIsLoading] = useState(false);
  const [autoTransliterate, setAutoTransliterate] = useState(true);
  const [livePreview, setLivePreview] = useState<string>('');
  const [isComposing, setIsComposing] = useState(false);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Live preview for transliteration (via edge function)
  useEffect(() => {
    if (!autoTransliterate || !input.trim() || isComposing) {
      setLivePreview('');
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const result = await convertToNativeScript(input, userLanguage);
        if (result.isConverted && result.converted !== input) {
          setLivePreview(result.converted);
        } else {
          setLivePreview('');
        }
      } catch {
        setLivePreview('');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [input, userLanguage, autoTransliterate, isComposing, convertToNativeScript]);
  
  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    const messageText = autoTransliterate && livePreview ? livePreview : input.trim();
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: messageText,
      sourceLanguage: userLanguage,
      isTranslated: false,
      showOriginal: false,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLivePreview('');
    
    try {
      // Simulate partner response with translation
      setTimeout(async () => {
        const partnerResponses = [
          'नमस्ते! कैसे हो आप?',
          'मैं ठीक हूं, धन्यवाद',
          'आप कहाँ से हैं?',
          'बहुत अच्छा!',
          'मुझे आपसे बात करके खुशी हुई'
        ];
        
        const partnerText = partnerResponses[Math.floor(Math.random() * partnerResponses.length)];
        
        // Translate partner message for user via edge function
        const translatedForUser = await translate(
          partnerText,
          partnerLanguage,
          userLanguage
        );
        
        const partnerMessage: Message = {
          id: `partner-${Date.now()}`,
          text: partnerText,
          translatedText: translatedForUser.text,
          sourceLanguage: partnerLanguage,
          targetLanguage: userLanguage,
          isTranslated: translatedForUser.isTranslated,
          showOriginal: false,
          sender: 'partner',
          timestamp: new Date(),
          model: 'nllb-200-browser',
          usedPivot: false,
        };
        
        setMessages(prev => [...prev, partnerMessage]);
        setIsLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error('Send error:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [input, isLoading, autoTransliterate, livePreview, userLanguage, partnerLanguage, translate, toast]);
  
  // Toggle original/translated text
  const toggleOriginal = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, showOriginal: !msg.showOriginal } : msg
    ));
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl h-[85vh] flex flex-col shadow-lg">
        <CardHeader className="border-b bg-card pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Universal Chat
              <Badge variant="secondary" className="ml-2">
                {ALL_NLLB200_LANGUAGES.length}+ Languages
              </Badge>
            </CardTitle>
          </div>
          
          {/* Translation Status */}
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Translation Ready</span>
              <Badge variant="outline" className="text-xs">NLLB-200 via Server</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              200+ languages supported with auto-detection and transliteration
            </p>
            {translationError && (
              <p className="text-xs text-destructive mt-1">{translationError}</p>
            )}
          </div>
          
          {/* Language Selectors */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <LanguageSelector
              value={userLanguage}
              onChange={setUserLanguage}
              label="Your Language"
            />
            <LanguageSelector
              value={partnerLanguage}
              onChange={setPartnerLanguage}
              label="Partner's Language"
            />
          </div>
          
          {/* Auto-transliterate toggle */}
          <div className="flex items-center justify-between mt-3 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="auto-trans" className="text-sm">
                Auto-convert romanized typing to native script
              </Label>
            </div>
            <Switch
              id="auto-trans"
              checked={autoTransliterate}
              onCheckedChange={setAutoTransliterate}
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Globe className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Start a conversation in any language!</p>
                <p className="text-xs mt-1">
                  Messages are translated using NLLB-200 via server
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onToggleOriginal={() => toggleOriginal(message.id)}
                    userLanguage={userLanguage}
                  />
                ))}
                
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Partner is typing...</span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          {/* Input Area */}
          <div className="p-4 border-t bg-card">
            {/* Live Preview */}
            {livePreview && livePreview !== input && (
              <div className="mb-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-1.5 text-xs text-primary mb-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Native script preview:</span>
                </div>
                <p className="text-sm font-medium" dir="auto">{livePreview}</p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder={`Type in ${userLanguage} (or romanized)...`}
                className="min-h-[44px] max-h-[120px] resize-none"
                disabled={isLoading || isTranslating}
                dir="auto"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isTranslating}
                size="icon"
                className="h-[44px] w-[44px]"
              >
                {isLoading || isTranslating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by NLLB-200 • {ALL_NLLB200_LANGUAGES.length}+ languages supported
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UniversalChatPage;
