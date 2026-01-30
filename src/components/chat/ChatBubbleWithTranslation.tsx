/**
 * ChatBubbleWithTranslation Component
 * =====================================
 * 
 * Displays a chat message with:
 * - Main text in mother tongue (large)
 * - English meaning below (small, muted)
 * 
 * UI Rules Enforced:
 * - Sender sees: Their MT + English
 * - Receiver sees: Their MT + English
 */

import { cn } from '@/lib/utils';

interface ChatBubbleWithTranslationProps {
  mainText: string;           // Mother tongue text
  englishText: string;        // English meaning
  isSender: boolean;          // true = right align, false = left align
  showEnglish?: boolean;      // Whether to show English subtext
  timestamp?: string;         // Optional timestamp
  senderName?: string;        // Optional sender name
  className?: string;
}

export function ChatBubbleWithTranslation({
  mainText,
  englishText,
  isSender,
  showEnglish = true,
  timestamp,
  senderName,
  className
}: ChatBubbleWithTranslationProps) {
  // Don't show English subtext if it's the same as main text
  const shouldShowEnglish = showEnglish && 
    englishText && 
    englishText.toLowerCase().trim() !== mainText.toLowerCase().trim();

  return (
    <div 
      className={cn(
        "flex flex-col max-w-[80%] mb-3",
        isSender ? "ml-auto items-end" : "mr-auto items-start",
        className
      )}
    >
      {/* Sender name (for group chats) */}
      {!isSender && senderName && (
        <span className="text-xs text-muted-foreground mb-1 px-1">
          {senderName}
        </span>
      )}
      
      {/* Message bubble */}
      <div
        className={cn(
          "px-4 py-2 rounded-2xl shadow-sm",
          isSender 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {/* Main text - Mother tongue */}
        <p className="text-base leading-relaxed break-words">
          {mainText}
        </p>
        
        {/* English subtext */}
        {shouldShowEnglish && (
          <p 
            className={cn(
              "text-xs mt-1 opacity-70 italic break-words",
              isSender ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {englishText}
          </p>
        )}
      </div>
      
      {/* Timestamp */}
      {timestamp && (
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {timestamp}
        </span>
      )}
    </div>
  );
}

/**
 * Simple chat bubble without translation
 */
interface SimpleChatBubbleProps {
  text: string;
  isSender: boolean;
  timestamp?: string;
  className?: string;
}

export function SimpleChatBubble({
  text,
  isSender,
  timestamp,
  className
}: SimpleChatBubbleProps) {
  return (
    <div 
      className={cn(
        "flex flex-col max-w-[80%] mb-3",
        isSender ? "ml-auto items-end" : "mr-auto items-start",
        className
      )}
    >
      <div
        className={cn(
          "px-4 py-2 rounded-2xl shadow-sm",
          isSender 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="text-base leading-relaxed break-words">
          {text}
        </p>
      </div>
      
      {timestamp && (
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {timestamp}
        </span>
      )}
    </div>
  );
}
