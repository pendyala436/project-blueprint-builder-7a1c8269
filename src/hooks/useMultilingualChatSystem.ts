/**
 * Multilingual Chat System Hook
 * Complete implementation based on dl-translate (https://github.com/xhluca/dl-translate)
 * 
 * Features:
 * 1. Real-time transliteration: Latin → native script while typing
 * 2. Auto language detection from text script
 * 3. Conditional translation only when sender/receiver languages differ
 * 4. 200+ language support via NLLB-200 model
 * 5. Realtime message updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  translate, 
  translateForChat, 
  convertToNativeScript,
  processOutgoingMessage,
  processIncomingMessage,
} from '@/lib/dl-translate/translator';
import { 
  detectLanguage, 
  detectScript,
  isSameLanguage, 
  isLatinScript, 
  needsScriptConversion,
  getNativeName,
  getLanguageInfo,
} from '@/lib/dl-translate/languages';
import type { TranslationResult } from '@/lib/dl-translate/types';

// Types
export interface MultilingualMessage {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  originalMessage: string;
  translatedMessage?: string;
  senderLanguage: string;
  detectedLanguage?: string;
  isTranslated: boolean;
  translationConfidence?: number;
  createdAt: string;
}

export interface LivePreview {
  inputText: string;
  nativeText: string;
  isConverting: boolean;
  detectedScript?: string;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
  previewText?: string;
  language?: string;
}

interface UseMultilingualChatSystemProps {
  chatId: string;
  currentUserId: string;
  currentUserLanguage: string;
  partnerUserId: string;
  partnerLanguage: string;
}

interface LanguageInfoBasic {
  name: string;
  native?: string;
  script?: string;
  code?: string;
  rtl?: boolean;
}

interface UseMultilingualChatSystemReturn {
  // Messages
  messages: MultilingualMessage[];
  isLoadingMessages: boolean;
  
  // Input handling
  inputText: string;
  setInputText: (text: string) => void;
  livePreview: LivePreview;
  
  // Actions
  sendMessage: () => Promise<void>;
  translateMessage: (messageId: string) => Promise<void>;
  
  // Typing indicators
  partnerTyping: TypingIndicator | null;
  
  // Language info
  senderLanguageInfo: LanguageInfoBasic | null;
  receiverLanguageInfo: LanguageInfoBasic | null;
  needsTranslation: boolean;
  
  // State
  isTranslating: boolean;
  isSending: boolean;
  error: string | null;
}

export function useMultilingualChatSystem({
  chatId,
  currentUserId,
  currentUserLanguage,
  partnerUserId,
  partnerLanguage,
}: UseMultilingualChatSystemProps): UseMultilingualChatSystemReturn {
  // State
  const [messages, setMessages] = useState<MultilingualMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [inputText, setInputText] = useState('');
  const [livePreview, setLivePreview] = useState<LivePreview>({
    inputText: '',
    nativeText: '',
    isConverting: false,
  });
  const [partnerTyping, setPartnerTyping] = useState<TypingIndicator | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const transliterationTimeout = useRef<NodeJS.Timeout | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Language info
  const senderLanguageInfo = getLanguageInfo(currentUserLanguage);
  const receiverLanguageInfo = getLanguageInfo(partnerLanguage);
  const needsTranslation = !isSameLanguage(currentUserLanguage, partnerLanguage);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    subscribeToTyping();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [chatId]);

  // Handle real-time transliteration as user types
  useEffect(() => {
    if (!inputText.trim()) {
      setLivePreview({
        inputText: '',
        nativeText: '',
        isConverting: false,
      });
      return;
    }

    // Clear previous timeout
    if (transliterationTimeout.current) {
      clearTimeout(transliterationTimeout.current);
    }

    // Check if transliteration is needed
    const isLatin = isLatinScript(inputText);
    const needsConversion = needsScriptConversion(currentUserLanguage);

    if (!isLatin || !needsConversion) {
      // No conversion needed - show text as is
      setLivePreview({
        inputText,
        nativeText: inputText,
        isConverting: false,
        detectedScript: detectScript(inputText).script,
      });
      return;
    }

    // Debounce transliteration (300ms delay)
    setLivePreview(prev => ({ ...prev, isConverting: true }));
    
    transliterationTimeout.current = setTimeout(async () => {
      try {
        const result = await convertToNativeScript(inputText, currentUserLanguage);
        setLivePreview({
          inputText,
          nativeText: result.text,
          isConverting: false,
          detectedScript: result.detectedScript || detectScript(result.text).script,
        });
        
        // Send typing indicator with preview
        sendTypingIndicator(result.text);
      } catch (err) {
        console.error('[MultilingualChat] Transliteration error:', err);
        setLivePreview({
          inputText,
          nativeText: inputText,
          isConverting: false,
        });
      }
    }, 300);
  }, [inputText, currentUserLanguage]);

  const loadMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        // Transform and translate incoming messages for current user
        const transformed = await Promise.all(
          data.map(async (msg) => {
            const isIncoming = msg.sender_id !== currentUserId;
            let translatedMessage: string | undefined;
            let isTranslatedFlag = false;

            // If incoming message and languages differ, translate
            if (isIncoming && needsTranslation) {
              try {
                const result = await processIncomingMessage(
                  msg.message,
                  partnerLanguage,
                  currentUserLanguage
                );
                if (result.isTranslated) {
                  translatedMessage = result.text;
                  isTranslatedFlag = true;
                }
              } catch {
                // Keep original if translation fails
              }
            }

            return {
              id: msg.id,
              chatId: msg.chat_id,
              senderId: msg.sender_id,
              receiverId: msg.receiver_id,
              originalMessage: msg.message,
              translatedMessage: translatedMessage || msg.translated_message,
              senderLanguage: isIncoming ? partnerLanguage : currentUserLanguage,
              detectedLanguage: detectLanguage(msg.message),
              isTranslated: isTranslatedFlag || msg.is_translated || false,
              createdAt: msg.created_at,
            };
          })
        );

        setMessages(transformed);
      }
    } catch (err) {
      console.error('[MultilingualChat] Load messages error:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          const isIncoming = msg.sender_id !== currentUserId;
          let translatedMessage: string | undefined;
          let isTranslatedFlag = false;

          // Translate incoming messages
          if (isIncoming && needsTranslation) {
            try {
              const result = await processIncomingMessage(
                msg.message,
                partnerLanguage,
                currentUserLanguage
              );
              if (result.isTranslated) {
                translatedMessage = result.text;
                isTranslatedFlag = true;
              }
            } catch {
              // Keep original if translation fails
            }
          }

          const newMessage: MultilingualMessage = {
            id: msg.id,
            chatId: msg.chat_id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            originalMessage: msg.message,
            translatedMessage,
            senderLanguage: isIncoming ? partnerLanguage : currentUserLanguage,
            detectedLanguage: detectLanguage(msg.message),
            isTranslated: isTranslatedFlag,
            createdAt: msg.created_at,
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const subscribeToTyping = () => {
    const typingChannel = supabase
      .channel(`typing-${chatId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== currentUserId) {
          setPartnerTyping({
            userId: payload.payload.userId,
            isTyping: payload.payload.isTyping,
            previewText: payload.payload.previewText,
            language: payload.payload.language,
          });

          // Clear typing indicator after 3 seconds
          if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
          }
          typingTimeout.current = setTimeout(() => {
            setPartnerTyping(null);
          }, 3000);
        }
      })
      .subscribe();
  };

  const sendTypingIndicator = async (previewText?: string) => {
    await supabase.channel(`typing-${chatId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUserId,
        isTyping: true,
        previewText,
        language: currentUserLanguage,
      },
    });
  };

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    setIsSending(true);
    setError(null);

    try {
      // Process outgoing message (convert to native script if needed)
      const processed = await processOutgoingMessage(text, currentUserLanguage);
      const messageToSend = processed.text;
      
      // Prepare translation for receiver if languages differ
      let translatedForReceiver: string | undefined;
      if (needsTranslation) {
        try {
          const translationResult = await translateForChat(messageToSend, {
            senderLanguage: currentUserLanguage,
            receiverLanguage: partnerLanguage,
            senderMessage: messageToSend,
          });
          if (translationResult.isTranslated) {
            translatedForReceiver = translationResult.text;
          }
        } catch {
          // Store without translation - receiver will translate on their end
        }
      }

      // Insert message into database
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerUserId,
          message: messageToSend,
          translated_message: translatedForReceiver,
          is_translated: !!translatedForReceiver,
        });

      if (insertError) throw insertError;

      // Clear input
      setInputText('');
      setLivePreview({
        inputText: '',
        nativeText: '',
        isConverting: false,
      });

      // Stop typing indicator
      await supabase.channel(`typing-${chatId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          isTyping: false,
        },
      });
    } catch (err) {
      console.error('[MultilingualChat] Send message error:', err);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [inputText, chatId, currentUserId, currentUserLanguage, partnerUserId, partnerLanguage, needsTranslation]);

  const translateMessage = useCallback(async (messageId: string) => {
    setIsTranslating(true);
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const result = await translate(
        message.originalMessage,
        message.senderLanguage,
        currentUserLanguage
      );

      if (result.isTranslated) {
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, translatedMessage: result.text, isTranslated: true }
              : m
          )
        );
      }
    } catch (err) {
      console.error('[MultilingualChat] Translate message error:', err);
      setError('Failed to translate message');
    } finally {
      setIsTranslating(false);
    }
  }, [messages, currentUserLanguage]);

  return {
    messages,
    isLoadingMessages,
    inputText,
    setInputText,
    livePreview,
    sendMessage,
    translateMessage,
    partnerTyping,
    senderLanguageInfo,
    receiverLanguageInfo,
    needsTranslation,
    isTranslating,
    isSending,
    error,
  };
}
