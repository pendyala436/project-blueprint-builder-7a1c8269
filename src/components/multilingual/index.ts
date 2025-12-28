/**
 * Multilingual Chat Components
 * Real-time chat with 200+ language support
 * Based on dl-translate (https://github.com/xhluca/dl-translate)
 */

export { DLTranslateChatRoom } from './DLTranslateChatRoom';
export { MultilingualChatInput } from './MultilingualChatInput';
export { MultilingualMessage } from './MultilingualMessage';
export { TypingIndicator } from './TypingIndicator';
export { LanguageSelector } from './LanguageSelector';
export { TranslationStatus } from './TranslationStatus';

// Re-export hook and types
export { useMultilingualChatSystem } from '@/hooks/useMultilingualChatSystem';
export type { 
  MultilingualMessage as MultilingualMessageType, 
  LivePreview, 
  TypingIndicator as TypingIndicatorType 
} from '@/hooks/useMultilingualChatSystem';
