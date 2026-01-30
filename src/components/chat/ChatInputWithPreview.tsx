/**
 * ChatInputWithPreview Component
 * ================================
 * 
 * Smart chat input with:
 * - Real-time mother tongue preview
 * - English meaning display
 * - Any typing method support
 * - Debounced translation preview
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { processChatMessage, type MessageViews } from '@/lib/chat-pipeline';

interface ChatInputWithPreviewProps {
  senderLanguage: string;      // Sender's mother tongue
  receiverLanguage: string;    // Receiver's mother tongue
  onSend: (result: MessageViews) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInputWithPreview({
  senderLanguage,
  receiverLanguage,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  className
}: ChatInputWithPreviewProps) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<{ main: string; english: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debounced preview update
  const updatePreview = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPreview(null);
      setIsTranslating(false);
      return;
    }
    
    setIsTranslating(true);
    
    try {
      const result = await processChatMessage(text, senderLanguage, receiverLanguage);
      setPreview({
        main: result.sender.main,
        english: result.sender.english
      });
    } catch (err) {
      console.error('[ChatInputWithPreview] Preview error:', err);
      setPreview({ main: text, english: '' });
    } finally {
      setIsTranslating(false);
    }
  }, [senderLanguage, receiverLanguage]);

  // Handle input change with debounce
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce (300ms)
    debounceRef.current = setTimeout(() => {
      updatePreview(value);
    }, 300);
  }, [updatePreview]);

  // Handle send
  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    
    setIsSending(true);
    
    try {
      const result = await processChatMessage(input, senderLanguage, receiverLanguage);
      await onSend(result);
      
      // Clear input after successful send
      setInput('');
      setPreview(null);
      
      // Focus textarea
      textareaRef.current?.focus();
    } catch (err) {
      console.error('[ChatInputWithPreview] Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key (send on Enter, newline on Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Show preview only if it differs from input
  const shouldShowPreview = preview && 
    preview.main && 
    preview.main.toLowerCase().trim() !== input.toLowerCase().trim();

  const shouldShowEnglish = preview && 
    preview.english && 
    preview.english.toLowerCase().trim() !== preview.main.toLowerCase().trim();

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview area */}
      {(shouldShowPreview || isTranslating) && (
        <div className="px-3 py-2 bg-muted/50 rounded-lg border border-border/50">
          {isTranslating ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Translating...</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">
                {preview?.main}
              </p>
              {shouldShowEnglish && (
                <p className="text-xs text-muted-foreground mt-1">
                  {preview?.english}
                </p>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Input area */}
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
        />
        
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isSending}
          size="icon"
          className="shrink-0 h-11 w-11"
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
}
