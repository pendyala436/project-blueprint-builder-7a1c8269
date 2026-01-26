export { ChatUserList, type ChatUser } from './ChatUserList';
export { ChatMessageList, type ChatMessage } from './ChatMessageList';
export { ChatMessageInput } from './ChatMessageInput';
export { MultilingualChatRoom } from './MultilingualChatRoom';

// Real-time translation components (production-ready, < 3ms UI response)
export { RealtimeChatInput, type MessageViews } from './RealtimeChatInput';
export { RealtimeMessageBubble, type MessageViewData } from './RealtimeMessageBubble';

// Extended Universal Translation (multi-language input with auto-detection)
// Supports input in ANY language with dual display (native + English meaning)
export { ExtendedChatInput, type ExtendedMessageData } from './ExtendedChatInput';
export { ExtendedMessageBubble } from './ExtendedMessageBubble';

// Typing mode selector (simplified - single mode)
export { 
  TypingModeSelector, 
  type TypingMode, 
  useTypingMode, 
  getSavedTypingMode, 
  saveTypingMode 
} from './TypingModeSelector';

// ============================================================
// BIDIRECTIONAL CHAT - Meaning-Based Universal Translation
// ============================================================
// 
// Accepts ANY input method:
// - Physical/on-screen keyboard
// - Voice-to-text
// - Phonetic typing (Latin letters for non-Latin languages)
// - Native script keyboards
// - Mixed native + Latin input
// 
// Features:
// - Meaning extraction from any input
// - Live preview in sender's mother tongue
// - Dual display: Native + English meaning
// - Automatic translation to receiver's language
// - OFFLINE ONLY - No external APIs

export { BidirectionalChatInput } from './BidirectionalChatInput';
export { BidirectionalMessageBubble } from './BidirectionalMessageBubble';
export { BidirectionalChatContainer } from './BidirectionalChatContainer';

// ============================================================
// SMART CHAT - Auto-Detection + Semantic Translation
// ============================================================
// 
// Auto-detects input type:
// - English typing: "how are you"
// - Native script: "బాగున్నావా" (Gboard/native keyboard)
// - Romanized: "bagunnava" (English letters, native meaning)
// - Voice-to-text: Any language
// 
// Features:
// - No hardcoded language detection
// - Unicode-based script detection
// - ML-enhanced language identification
// - Real-time preview in sender's mother tongue
// - Semantic translation to receiver's mother tongue
// - Voice input with auto-language detection

export { SmartChatInput } from './SmartChatInput';
