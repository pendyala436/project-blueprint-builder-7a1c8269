import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send, Smile, Loader2 } from 'lucide-react';
import { chatRateLimiter } from '@/lib/validation';

// Native language labels for placeholder and send button
// Placeholder shows native script + transliterated hint so users know they can type in any style
const NATIVE_LABELS: Record<string, { placeholder: string; send: string; preview: string }> = {
  telugu: { placeholder: 'బాగున్నావా / bagunnava / how are you...', send: 'పంపు', preview: 'ప్రివ్యూ' },
  hindi: { placeholder: 'कैसे हो / kaise ho / how are you...', send: 'भेजें', preview: 'पूर्वावलोकन' },
  tamil: { placeholder: 'எப்படி இருக்கீங்க / eppadi irukkinga / how are you...', send: 'அனுப்பு', preview: 'முன்னோட்டம்' },
  kannada: { placeholder: 'ಹೇಗಿದ್ದೀರಾ / hegiddira / how are you...', send: 'ಕಳುಹಿಸು', preview: 'ಪೂರ್ವವೀಕ್ಷಣೆ' },
  malayalam: { placeholder: 'സുഖമാണോ / sukhamano / how are you...', send: 'അയയ്ക്കുക', preview: 'പ്രിവ്യൂ' },
  bengali: { placeholder: 'কেমন আছো / kemon acho / how are you...', send: 'পাঠান', preview: 'পূর্বরূপ' },
  marathi: { placeholder: 'कसे आहात / kase aahat / how are you...', send: 'पाठवा', preview: 'पूर्वावलोकन' },
  gujarati: { placeholder: 'કેમ છો / kem cho / how are you...', send: 'મોકલો', preview: 'પૂર્વાવલોકન' },
  punjabi: { placeholder: 'ਕਿਵੇਂ ਹੋ / kiven ho / how are you...', send: 'ਭੇਜੋ', preview: 'ਪੂਰਵਦਰਸ਼ਨ' },
  odia: { placeholder: 'କେମିତି ଅଛ / kemiti acha / how are you...', send: 'ପଠାନ୍ତୁ', preview: 'ପୂର୍ବାବଲୋକନ' },
  urdu: { placeholder: 'کیسے ہو / kaise ho / how are you...', send: 'بھیجیں', preview: 'پیش نظارہ' },
  assamese: { placeholder: 'কেনে আছা / kene asa / how are you...', send: 'পঠিয়াওক', preview: 'পূৰ্বদৰ্শন' },
  arabic: { placeholder: 'كيف حالك / kayf halak / how are you...', send: 'إرسال', preview: 'معاينة' },
  spanish: { placeholder: '¿Cómo estás? / how are you...', send: 'Enviar', preview: 'Vista previa' },
  french: { placeholder: 'Comment ça va? / how are you...', send: 'Envoyer', preview: 'Aperçu' },
  portuguese: { placeholder: 'Como você está? / how are you...', send: 'Enviar', preview: 'Visualizar' },
  russian: { placeholder: 'Как дела / kak dela / how are you...', send: 'Отправить', preview: 'Предпросмотр' },
  japanese: { placeholder: 'お元気ですか / ogenki desuka / how are you...', send: '送信', preview: 'プレビュー' },
  korean: { placeholder: '잘 지내요 / jal jinaeyo / how are you...', send: '보내기', preview: '미리보기' },
  chinese: { placeholder: '你好吗 / ni hao ma / how are you...', send: '发送', preview: '预览' },
  german: { placeholder: 'Wie geht es dir? / how are you...', send: 'Senden', preview: 'Vorschau' },
  italian: { placeholder: 'Come stai? / how are you...', send: 'Invia', preview: 'Anteprima' },
  thai: { placeholder: 'สบายดีไหม / sabai dee mai / how are you...', send: 'ส่ง', preview: 'ดูตัวอย่าง' },
  turkish: { placeholder: 'Nasılsın? / how are you...', send: 'Gönder', preview: 'Önizleme' },
  vietnamese: { placeholder: 'Bạn khỏe không? / how are you...', send: 'Gửi', preview: 'Xem trước' },
  indonesian: { placeholder: 'Apa kabar? / how are you...', send: 'Kirim', preview: 'Pratinjau' },
  malay: { placeholder: 'Apa khabar? / how are you...', send: 'Hantar', preview: 'Pratonton' },
  persian: { placeholder: 'حالت چطوره / halet chetore / how are you...', send: 'ارسال', preview: 'پیش‌نمایش' },
  swahili: { placeholder: 'Habari yako? / how are you...', send: 'Tuma', preview: 'Hakiki' },
  nepali: { placeholder: 'कस्तो छ / kasto chha / how are you...', send: 'पठाउनुहोस्', preview: 'पूर्वावलोकन' },
  sinhala: { placeholder: 'කොහොමද / kohomada / how are you...', send: 'යවන්න', preview: 'පෙරදසුන' },
  english: { placeholder: 'Type a message...', send: 'Send', preview: 'Preview' },
};

export function getNativeLabels(language?: string) {
  if (!language) return NATIVE_LABELS.english;
  const key = language.toLowerCase().trim();
  return NATIVE_LABELS[key] || NATIVE_LABELS.english;
}

interface ChatMessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  userLanguage?: string;
  maxLength?: number;
}

export const ChatMessageInput: React.FC<ChatMessageInputProps> = memo(({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder,
  className,
  userLanguage,
  maxLength = 2000,
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const labels = getNativeLabels(userLanguage);

  // iOS keyboard height detection
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
      document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
    };
    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > maxLength) return;
    setMessage(value);

    if (onTyping) {
      onTyping(value.length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  }, [onTyping]);

  const handleSend = useCallback(async () => {
    const text = message.trim().replace(/<[^>]*>/g, "");
    if (!text || disabled || isSending) return;

    if (!chatRateLimiter.canProceed()) {
      return;
    }

    setIsSending(true);
    try {
      setMessage('');
      onTyping?.(false);
      textareaRef.current?.focus();
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  }, [message, disabled, isSending, onSendMessage, onTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      <div className="p-3 pt-2 flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || labels.placeholder}
            disabled={disabled || isSending}
            dir="auto"
            spellCheck={true}
            autoComplete="off"
            autoCorrect="on"
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none unicode-text',
              'py-3 px-4 pr-12',
              'rounded-xl border-muted-foreground/20',
              'focus-visible:ring-primary/50',
              'text-lg',
            )}
            aria-label={labels.placeholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Add emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending}
          size="icon"
          className={cn(
            'h-11 w-11 rounded-full flex-shrink-0',
            'bg-primary hover:bg-primary/90',
            'transition-transform active:scale-95',
          )}
          aria-label={labels.send}
          title={labels.send}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
});

ChatMessageInput.displayName = 'ChatMessageInput';

export default ChatMessageInput;
