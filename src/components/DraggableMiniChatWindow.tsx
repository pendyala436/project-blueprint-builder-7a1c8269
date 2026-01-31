import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Send,
  X,
  Maximize2,
  Minimize2,
  Clock,
  IndianRupee,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Wallet,
  AlertTriangle,
  GripVertical,
  Move,
  Paperclip,
  Image,
  Video,
  FileText,
  Mic,
  Square,
  Languages,
  MoreHorizontal,
  Type
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MiniChatActions } from "@/components/MiniChatActions";
import { GiftSendButton } from "@/components/GiftSendButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { TranslatedTypingIndicator } from "@/components/TranslatedTypingIndicator";
// Real-time typing with broadcast to partner
import { useRealtimeTranslation } from "@/lib/translation/useRealtimeTranslation";
// XENOVA BROWSER-BASED TRANSLATION SDK - Zero server load
// Supports 1000+ languages via lazy-loaded ML models
import {
  isSameLanguage,
  isLatinScriptLanguage,
  normalizeUnicode,
} from "@/lib/translation";
// Legacy imports for fallback compatibility
import { 
  isSameLanguageCheck,
  isEnglishLanguage as checkIsEnglish,
} from "@/lib/translation/semantic-translate-api";
import { useSpellCheck } from "@/hooks/useSpellCheck";

// Local utility functions (browser-based models removed)
function normalizeLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const code = lang.toLowerCase().trim();
  const codeMap: Record<string, string> = {
    'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta',
    'kannada': 'kn', 'malayalam': 'ml', 'marathi': 'mr', 'gujarati': 'gu',
    'bengali': 'bn', 'punjabi': 'pa', 'urdu': 'ur', 'odia': 'or',
  };
  return codeMap[code] || code.slice(0, 2);
}

function xenovaSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguageCode(lang1) === normalizeLanguageCode(lang2);
}

function xenovaIsEnglish(lang: string): boolean {
  const code = normalizeLanguageCode(lang);
  return code === 'en' || code === 'english';
}

console.log('[DraggableMiniChatWindow] Module loaded - Translation via Edge Function');

/**
 * Edge function semantic translation
 * Supports ALL input types: English, native script, voice, Gboard, font tools
 * Provides meaning-based translation (not phonetic transliteration)
 */
async function translateSemantic(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{
  translatedText: string;
  originalText: string;
  isTranslated: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}> {
  if (!text.trim()) {
    return {
      translatedText: '',
      originalText: '',
      isTranslated: false,
      sourceLanguage,
      targetLanguage,
      confidence: 0,
    };
  }
  
  const normalizedSource = normalizeLanguageCode(sourceLanguage);
  const normalizedTarget = normalizeLanguageCode(targetLanguage);
  
  console.log(`[translateSemantic] 🔄 "${text.substring(0, 40)}" | ${sourceLanguage}→${normalizedSource} → ${targetLanguage}→${normalizedTarget}`);
  
  // Same language check - no translation needed
  if (xenovaSameLanguage(normalizedSource, normalizedTarget)) {
    console.log('[translateSemantic] ✅ Same language, passthrough');
    return {
      translatedText: text,
      originalText: text,
      isTranslated: false,
      sourceLanguage: normalizedSource,
      targetLanguage: normalizedTarget,
      confidence: 1.0,
    };
  }
  
  // Use edge function for translation
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    console.log('[translateSemantic] Calling edge function...');
    
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        source: normalizedSource,
        target: normalizedTarget,
        mode: 'translate',
      },
    });
    
    if (error) {
      console.warn('[translateSemantic] Edge function error:', error);
      throw error;
    }
    
    const translatedText = data?.translatedText || data?.translatedMessage;
    const wasTranslated = translatedText && translatedText !== text && translatedText.trim() !== '';
    
    if (wasTranslated) {
      console.log(`[translateSemantic] ✅ Edge function success: "${translatedText?.substring(0, 40)}"`);
      return {
        translatedText,
        originalText: text,
        isTranslated: true,
        sourceLanguage: normalizedSource,
        targetLanguage: normalizedTarget,
        confidence: 0.85,
      };
    }
    
    console.log('[translateSemantic] ⚠️ Edge function returned unchanged text');
  } catch (edgeError) {
    console.warn('[translateSemantic] Edge function failed:', edgeError);
  }
  
  // Fallback: return original text
  console.log('[translateSemantic] ❌ Translation failed, returning original');
  return {
    translatedText: text,
    originalText: text,
    isTranslated: false,
    sourceLanguage: normalizedSource,
    targetLanguage: normalizedTarget,
    confidence: 0,
  };
}

/**
 * Edge function bidirectional chat translation
 * Provides proper sender/receiver views based on their mother tongues
 * 
 * @param text - The message text (can be in any language/script)
 * @param senderLang - Sender's mother tongue
 * @param receiverLang - Receiver's mother tongue
 */
async function translateForChatSemantic(
  text: string,
  senderLang: string,
  receiverLang: string
): Promise<{
  senderView: string;
  receiverView: string;
  englishMeaning: string;
  isTranslated: boolean;
}> {
  if (!text.trim()) {
    return {
      senderView: '',
      receiverView: '',
      englishMeaning: '',
      isTranslated: false,
    };
  }
  
  const normSender = normalizeLanguageCode(senderLang);
  const normReceiver = normalizeLanguageCode(receiverLang);
  
  console.log(`[translateForChatSemantic] 🔄 "${text.substring(0, 40)}" | sender=${senderLang}→${normSender} | receiver=${receiverLang}→${normReceiver}`);
  
  // Use edge function with bidirectional mode
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    console.log('[translateForChatSemantic] Calling edge function...');
    
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        senderLanguage: normSender,
        receiverLanguage: normReceiver,
        mode: 'bidirectional',
      },
    });
    
    if (error) throw error;
    
    const senderView = data?.senderView || text;
    const receiverView = data?.receiverView || text;
    const englishCore = data?.englishCore || data?.englishText || text;
    const wasTranslated = receiverView !== text || englishCore !== text;
    
    if (wasTranslated) {
      console.log(`[translateForChatSemantic] ✅ Edge function success:
        Sender: "${senderView?.substring(0, 30)}"
        Receiver: "${receiverView?.substring(0, 30)}"
        English: "${englishCore?.substring(0, 30)}"`);
      
      return {
        senderView,
        receiverView,
        englishMeaning: englishCore,
        isTranslated: true,
      };
    }
  } catch (edgeError) {
    console.warn('[translateForChatSemantic] Edge function failed:', edgeError);
  }
  
  console.log('[translateForChatSemantic] ❌ Translation failed, returning original');
  return {
    senderView: text,
    receiverView: text,
    englishMeaning: text,
    isTranslated: false,
  };
}

const BILLING_PAUSE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes - pause billing
const BILLING_WARNING_MS = 2 * 60 * 1000; // 2 minutes - show billing pause warning
const LOGOUT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes - close chat and logout

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  englishMessage?: string; // English version for display
  latinMessage?: string; // Latin/romanized version when native script is shown
  isTranslated?: boolean;
  isTranslating?: boolean;
  detectedLanguage?: string;
  createdAt: string;
}

interface DraggableMiniChatWindowProps {
  chatId: string;
  sessionId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  isPartnerOnline: boolean;
  currentUserId: string;
  currentUserLanguage: string;
  userGender: "male" | "female";
  ratePerMinute: number;
  earningRatePerMinute: number;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
}

const DraggableMiniChatWindow = ({
  chatId,
  sessionId,
  partnerId,
  partnerName,
  partnerPhoto,
  partnerLanguage,
  isPartnerOnline,
  currentUserId,
  currentUserLanguage,
  userGender,
  ratePerMinute,
  earningRatePerMinute,
  onClose,
  initialPosition = { x: 20, y: 20 },
  zIndex = 50,
  onFocus
}: DraggableMiniChatWindowProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [rawInput, setRawInput] = useState(""); // What user types (Latin for non-Latin languages)
  const [newMessage, setNewMessage] = useState(""); // Native script after transliteration
  // isSending state removed - using sendingRef for non-blocking double-send prevention
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [areButtonsExpanded, setAreButtonsExpanded] = useState(false); // Action buttons minimized by default
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billingStarted, setBillingStarted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [totalEarned, setTotalEarned] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [inactiveWarning, setInactiveWarning] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [transliterationEnabled, setTransliterationEnabled] = useState(true);
  const [livePreview, setLivePreview] = useState<{ text: string; isLoading: boolean }>({ text: '', isLoading: false });
  const [meaningPreview, setMeaningPreview] = useState<string>(''); // Mother tongue preview
  const [isMeaningLoading, setIsMeaningLoading] = useState(false);
  const [detectedInputSource, setDetectedInputSource] = useState<'gboard' | 'voice' | 'keyboard' | 'mixed'>('keyboard');
  const meaningPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transliterationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ASYNC TRANSLATION: AbortController to cancel pending translation requests
  // Ensures new typing cancels old translations without blocking
  const translationAbortRef = useRef<AbortController | null>(null);
  const lastTranslatedInputRef = useRef<string>(''); // Track what was last translated
  
  // Removed typing modes - now fully auto-detect based on input type
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if translation is needed (based on mother tongue from profiles)
  const needsTranslation = !isSameLanguage(currentUserLanguage, partnerLanguage);

  // AI-powered spell check for 900+ languages
  const { 
    isChecking: isSpellChecking, 
    lastSuggestion, 
    checkSpellingDebounced,
    acceptSuggestion,
    dismissSuggestion 
  } = useSpellCheck({ 
    language: currentUserLanguage, 
    enabled: false, // Disabled in EN-mode only system
    debounceMs: 800 
  });

  // Dragging state - use left/top for absolute positioning anywhere on screen
  const [position, setPosition] = useState(() => {
    // Default to bottom-right if initialPosition is default {20, 20}
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      const defaultWidth = isMobile ? 280 : 320;
      const defaultHeight = isMobile ? 350 : 400;
      return {
        x: initialPosition.x === 20 ? window.innerWidth - defaultWidth - 20 : initialPosition.x,
        y: initialPosition.y === 20 ? window.innerHeight - defaultHeight - 20 : initialPosition.y
      };
    }
    return initialPosition;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Responsive size - smaller on mobile
  const getResponsiveSize = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      return isMobile ? { width: 280, height: 350 } : { width: 320, height: 400 };
    }
    return { width: 320, height: 400 };
  };
  
  const [size, setSize] = useState(getResponsiveSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startWidth: number; startHeight: number; startX: number; startY: number; corner: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const billingPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);
  
  // State for billing pause and activity tracking
  const [isBillingPaused, setIsBillingPaused] = useState(false);
  const [lastUserMessageTime, setLastUserMessageTime] = useState<number>(Date.now());
  const [lastPartnerMessageTime, setLastPartnerMessageTime] = useState<number>(Date.now());

  // Check block status
  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, partnerId);

  // NOTE: LibreTranslate removed - using DL-Translate only via edge function

  // Real-time typing indicator with bi-directional broadcast - FULLY ASYNC
  const {
    sendTypingIndicator: broadcastTyping,
    clearPreview: clearTypingBroadcast,
    senderNativePreview,
    partnerTyping,
    isTyping,
    isTranslating: isTypingTranslating,
  } = useRealtimeTranslation({
    currentUserId,
    currentUserLanguage,
    channelId: chatId,
    enabled: true,
  });
  
  const clearPreview = useCallback(() => {
    setMeaningPreview('');
    lastTranslatedInputRef.current = '';
    // Cancel any in-flight translation
    if (translationAbortRef.current) {
      translationAbortRef.current.abort();
      translationAbortRef.current = null;
    }
    clearTypingBroadcast();
  }, [clearTypingBroadcast]);

  // Detect input source type for better handling
  const detectInputSource = useCallback((text: string, prevText: string): 'gboard' | 'voice' | 'keyboard' | 'mixed' => {
    if (!text) return 'keyboard';
    
    const newChars = text.slice(prevText.length);
    const hasNonLatin = /[^\x00-\x7F]/.test(newChars);
    const burstSize = newChars.length;
    
    // Voice-to-text typically adds many characters at once (phrases/sentences)
    if (burstSize > 15 && text.includes(' ')) {
      console.log('[InputDetect] Voice-to-text detected (burst:', burstSize, ')');
      return 'voice';
    }
    
    // Gboard/IME: Native script input with moderate burst
    if (hasNonLatin && burstSize >= 1) {
      console.log('[InputDetect] Gboard/IME detected (native script)');
      return 'gboard';
    }
    
    // Mixed mode: Text contains both Latin and non-Latin
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasNonLatinTotal = /[^\x00-\x7F]/.test(text);
    if (hasLatin && hasNonLatinTotal) {
      console.log('[InputDetect] Mixed mode detected');
      return 'mixed';
    }
    
    return 'keyboard';
  }, []);

  // Detect script type from text
  const detectScript = useCallback((text: string): 'latin' | 'native' | 'mixed' => {
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasNonLatin = /[^\x00-\x7F]/.test(text);
    
    if (hasLatin && hasNonLatin) return 'mixed';
    if (hasNonLatin) return 'native';
    return 'latin';
  }, []);

  // AUTO-DETECT input type and generate preview in sender's MOTHER TONGUE
  // Handles: English typing, native script (Gboard/IME), romanized, voice-to-text, mixed
  // FULLY ASYNC: Runs in background, NEVER blocks typing
  // Uses AbortController to cancel previous requests when new input arrives
  const generateMeaningPreview = useCallback((inputText: string, inputSource?: string) => {
    // CRITICAL: This function NEVER blocks - all state updates are synchronous, 
    // translation happens in background
    if (!inputText.trim()) {
      setMeaningPreview('');
      setIsMeaningLoading(false);
      lastTranslatedInputRef.current = '';
      return;
    }
    
    // Skip if same text was already translated (avoid redundant calls)
    if (inputText.trim() === lastTranslatedInputRef.current) {
      setIsMeaningLoading(false);
      return;
    }
    
    // Clear previous timeout IMMEDIATELY
    if (meaningPreviewTimeoutRef.current) {
      clearTimeout(meaningPreviewTimeoutRef.current);
      meaningPreviewTimeoutRef.current = null;
    }
    
    // Cancel any in-flight translation request IMMEDIATELY
    if (translationAbortRef.current) {
      translationAbortRef.current.abort();
      translationAbortRef.current = null;
    }
    
    // Show loading state (non-blocking visual feedback)
    setIsMeaningLoading(true);
    
    // DEBOUNCE: Wait for typing pause before starting translation
    // Voice input has complete phrases, so shorter debounce
    const debounceTime = inputSource === 'voice' ? 100 : 300;
    
    // Debounce: wait for pause in typing before starting translation
    meaningPreviewTimeoutRef.current = setTimeout(() => {
      const capturedText = inputText.trim();
      const scriptType = detectScript(capturedText);
      
      // Skip if text changed during debounce (user still typing)
      if (capturedText !== inputText.trim()) {
        setIsMeaningLoading(false);
        return;
      }
      
      console.log('[MeaningPreview] Processing:', { 
        text: capturedText.substring(0, 30), 
        userLang: currentUserLanguage,
        partnerLang: partnerLanguage,
        inputSource: inputSource || 'auto',
        scriptType
      });
      
      // Create new AbortController for this request
      const abortController = new AbortController();
      translationAbortRef.current = abortController;
      
      // Run translation in background - NEVER blocks typing
      (async () => {
        // Check if already aborted before starting
        if (abortController.signal.aborted) {
          return;
        }
        
        try {
          let translatedText = '';
          
          // ALWAYS use bidirectional edge function for ALL input types
          console.log('[MeaningPreview] Using bidirectional edge function for:', capturedText.substring(0, 30));
          
          try {
            const { data, error } = await supabase.functions.invoke('translate-message', {
              body: {
                text: capturedText,
                senderLanguage: currentUserLanguage,
                receiverLanguage: partnerLanguage,
                mode: 'bidirectional',
              },
            });
            
            // Check if aborted during request
            if (abortController.signal.aborted) {
              console.log('[MeaningPreview] Request aborted, discarding result');
              return;
            }
            
            if (!error && data?.senderView) {
              translatedText = data.senderView;
              console.log('[MeaningPreview] Edge function success:', {
                senderView: translatedText.substring(0, 30),
                receiverView: data.receiverView?.substring(0, 30),
                englishCore: data.englishCore?.substring(0, 30)
              });
            } else {
              // Fallback: for native script, show as-is
              if (scriptType === 'native') {
                translatedText = capturedText;
                console.log('[MeaningPreview] Native script - showing as-is');
              } else {
                // Fallback to browser-based translation for Latin text
                const result = await translateSemantic(capturedText, 'english', currentUserLanguage);
                
                // Check abort again after fallback
                if (abortController.signal.aborted) return;
                
                if (result?.translatedText && result.translatedText !== capturedText) {
                  translatedText = result.translatedText;
                }
              }
            }
          } catch (edgeError) {
            // Check if aborted
            if (abortController.signal.aborted) return;
            
            console.warn('[MeaningPreview] Edge function error, using fallback:', edgeError);
            if (scriptType === 'native') {
              translatedText = capturedText;
            } else {
              try {
                const result = await translateSemantic(capturedText, 'english', currentUserLanguage);
                if (abortController.signal.aborted) return;
                if (result?.translatedText && result.translatedText !== capturedText) {
                  translatedText = result.translatedText;
                }
              } catch (fallbackError) {
                console.warn('[MeaningPreview] Fallback translation error:', fallbackError);
              }
            }
          }
          
          // Final abort check before updating state
          if (abortController.signal.aborted) return;
          
          if (translatedText) {
            console.log('[MeaningPreview] Setting mother tongue preview:', translatedText.substring(0, 30));
            setMeaningPreview(translatedText);
            lastTranslatedInputRef.current = capturedText;
          } else {
            setMeaningPreview('');
          }
        } catch (error) {
          if (abortController.signal.aborted) return;
          console.warn('[MeaningPreview] Background error (non-blocking):', error);
          setMeaningPreview('');
        } finally {
          if (!abortController.signal.aborted) {
            setIsMeaningLoading(false);
          }
        }
      })();
    }, debounceTime);
  }, [currentUserLanguage, partnerLanguage, detectScript]);

  // Auto-close if blocked
  useEffect(() => {
    if (isBlocked) {
      toast({
        title: "Chat Ended",
        description: isBlockedByThem 
          ? "This user has blocked you" 
          : "You have blocked this user",
        variant: "destructive"
      });
      handleClose();
    }
  }, [isBlocked]);

  // Dragging handlers - supports both mouse and touch
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    onFocus?.();
  }, [position, isMaximized, onFocus]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;
      
      // Constrain to viewport bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - (isMinimized ? 48 : size.height);
      
      setPosition({
        x: Math.max(0, Math.min(maxX, dragRef.current.startPosX + deltaX)),
        y: Math.max(0, Math.min(maxY, dragRef.current.startPosY + deltaY))
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, size, isMinimized]);

  // Resize handlers - support touch and multiple corners
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, corner: string = 'se') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    resizeRef.current = {
      startWidth: size.width,
      startHeight: size.height,
      startX: clientX,
      startY: clientY,
      corner
    };
  }, [size]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      
      const deltaX = clientX - resizeRef.current.startX;
      const deltaY = clientY - resizeRef.current.startY;
      
      const minWidth = 280;
      const minHeight = 300;
      const maxWidth = Math.min(600, window.innerWidth - 40);
      const maxHeight = Math.min(600, window.innerHeight - 40);
      
      let newWidth = resizeRef.current.startWidth;
      let newHeight = resizeRef.current.startHeight;
      let newX = position.x;
      let newY = position.y;
      
      const corner = resizeRef.current.corner;
      
      // Handle different corner resizing
      if (corner.includes('e')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, resizeRef.current.startWidth + deltaX));
      }
      if (corner.includes('w')) {
        const widthDelta = -deltaX;
        newWidth = Math.max(minWidth, Math.min(maxWidth, resizeRef.current.startWidth + widthDelta));
        if (newWidth !== resizeRef.current.startWidth) {
          newX = position.x + (resizeRef.current.startWidth - newWidth);
        }
      }
      if (corner.includes('s')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, resizeRef.current.startHeight + deltaY));
      }
      if (corner.includes('n')) {
        const heightDelta = -deltaY;
        newHeight = Math.max(minHeight, Math.min(maxHeight, resizeRef.current.startHeight + heightDelta));
        if (newHeight !== resizeRef.current.startHeight) {
          newY = position.y + (resizeRef.current.startHeight - newHeight);
        }
      }
      
      setSize({ width: newWidth, height: newHeight });
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.addEventListener("touchmove", handleResizeMove, { passive: false });
      document.addEventListener("touchend", handleResizeEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.removeEventListener("touchmove", handleResizeMove);
      document.removeEventListener("touchend", handleResizeEnd);
    };
  }, [isResizing, position]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (userGender === "male") {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (wallet) {
            setWalletBalance(wallet.balance);
          }
        } else {
          const today = new Date().toISOString().split("T")[0];
          const { data: earnings } = await supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", currentUserId)
            .gte("created_at", `${today}T00:00:00`);
          
          const total = earnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
          setTodayEarnings(total);
        }

        if (!sessionStartedRef.current) {
          sessionStartedRef.current = true;
          toast({
            title: "Chat Started",
            description: userGender === "male" 
              ? `You're being charged ₹${ratePerMinute}/min`
              : "Start chatting to earn!",
          });
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();
  }, [currentUserId, userGender, ratePerMinute, earningRatePerMinute]);

  // Load messages and subscribe
  useEffect(() => {
    loadMessages();
    const unsubscribe = subscribeToMessages();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
      unsubscribe?.();
    };
  }, [chatId]);

  // Auto-scroll
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Billing start check
  useEffect(() => {
    const hasSentMessage = messages.some(m => m.senderId === currentUserId);
    const hasReceivedMessage = messages.some(m => m.senderId !== currentUserId);
    
    // Billing starts only when BOTH parties have exchanged messages
    if (hasSentMessage && hasReceivedMessage && !billingStarted) {
      setBillingStarted(true);
      setLastActivityTime(Date.now());
      startBilling();
    }
  }, [messages, currentUserId, billingStarted]);


  // Track when both users reply to resume billing
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId === currentUserId) {
        setLastUserMessageTime(Date.now());
      } else {
        setLastPartnerMessageTime(Date.now());
      }
    }
  }, [messages, currentUserId]);

  // Resume billing when BOTH users have replied after pause
  useEffect(() => {
    if (isBillingPaused && billingStarted) {
      const now = Date.now();
      const userRepliedAfterPause = lastUserMessageTime > (lastActivityTime + BILLING_PAUSE_TIMEOUT_MS - 30000);
      const partnerRepliedAfterPause = lastPartnerMessageTime > (lastActivityTime + BILLING_PAUSE_TIMEOUT_MS - 30000);
      
      if (userRepliedAfterPause && partnerRepliedAfterPause) {
        setIsBillingPaused(false);
        setLastActivityTime(now);
        startBilling();
        toast({
          title: "Billing Resumed",
          description: "Both users are active again. Charging/earning resumed.",
        });
      }
    }
  }, [lastUserMessageTime, lastPartnerMessageTime, isBillingPaused, billingStarted, lastActivityTime]);

  // Inactivity check - pause billing at 3 mins, logout at 15 mins
  useEffect(() => {
    if (!billingStarted) return;

    const warningInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      // Show billing pause warning between 2-3 mins
      if (!isBillingPaused && timeSinceActivity >= BILLING_WARNING_MS && timeSinceActivity < BILLING_PAUSE_TIMEOUT_MS) {
        const remainingSecs = Math.ceil((BILLING_PAUSE_TIMEOUT_MS - timeSinceActivity) / 1000);
        setInactiveWarning(`Billing pauses in ${remainingSecs}s`);
      } 
      // Show logout warning after billing paused (between 3-15 mins)
      else if (isBillingPaused && timeSinceActivity < LOGOUT_TIMEOUT_MS) {
        const remainingMins = Math.ceil((LOGOUT_TIMEOUT_MS - timeSinceActivity) / 60000);
        setInactiveWarning(`Billing paused. Logout in ${remainingMins}m if no activity`);
      } else if (!isBillingPaused) {
        setInactiveWarning(null);
      }
    }, 1000);

    // Billing pause timeout (3 minutes)
    if (billingPauseTimeoutRef.current) {
      clearTimeout(billingPauseTimeoutRef.current);
    }

    if (!isBillingPaused) {
      billingPauseTimeoutRef.current = setTimeout(() => {
        // Pause billing - stop timer but DON'T close chat
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        
        setIsBillingPaused(true);
        toast({
          title: "Billing Paused",
          description: "No activity for 3 minutes. Charging/earning stopped. Chat remains open.",
        });
      }, BILLING_PAUSE_TIMEOUT_MS);
    }

    // Logout timeout (15 minutes)
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }

    logoutTimeoutRef.current = setTimeout(async () => {
      toast({
        title: "Session Ended",
        description: "No activity for 15 minutes. Logging out...",
      });
      
      try {
        await supabase
          .from("active_chat_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            end_reason: "inactivity_logout"
          })
          .eq("id", sessionId);
        
        // Logout user
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Error during inactivity logout:", error);
      }
      
      onClose();
    }, LOGOUT_TIMEOUT_MS);

    return () => {
      clearInterval(warningInterval);
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    };
  }, [lastActivityTime, billingStarted, sessionId, onClose, isBillingPaused]);

  // Monitor partner's online status and session status - auto-disconnect if partner goes offline
  useEffect(() => {
    let partnerOnlineStatus = isPartnerOnline;
    
    // Subscribe to partner's online status changes via user_status table (more accurate)
    const statusChannel = supabase
      .channel(`partner-user-status-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: `user_id=eq.${partnerId}`
        },
        async (payload: any) => {
          const newStatus = payload.new;
          const wasOnline = partnerOnlineStatus;
          
          // Check if partner went offline
          if (newStatus && newStatus.is_online === false && wasOnline) {
            console.log("Partner went offline (user_status), disconnecting...");
            toast({
              title: "Partner Disconnected",
              description: `${partnerName} went offline. You are now free to chat with others.`,
            });
            
            // End the chat session
            try {
              await supabase
                .from("active_chat_sessions")
                .update({
                  status: "ended",
                  ended_at: new Date().toISOString(),
                  end_reason: "partner_offline"
                })
                .eq("id", sessionId);
            } catch (error) {
              console.error("Error ending chat on partner offline:", error);
            }
            
            onClose();
          }
          
          partnerOnlineStatus = newStatus?.is_online ?? false;
        }
      )
      .subscribe();

    // Also subscribe to partner's profile changes as fallback
    const profileChannel = supabase
      .channel(`partner-profile-status-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${partnerId}`
        },
        async (payload: any) => {
          const newProfile = payload.new;
          
          // Check if partner went offline (last_active_at is more than 5 minutes ago)
          // Use 5 minutes instead of 2 to avoid false disconnects during active chats
          if (newProfile.last_active_at) {
            const lastActive = new Date(newProfile.last_active_at).getTime();
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            const isNowOffline = lastActive < fiveMinutesAgo;
            
            // Only disconnect if partner was online AND went offline AND no recent messages
            // Skip if there was activity in the chat within the last minute (they're still chatting)
            const recentChatActivity = Date.now() - lastActivityTime < 60 * 1000;
            
            if (partnerOnlineStatus && isNowOffline && !recentChatActivity) {
              console.log("Partner went offline (profiles), disconnecting...");
              toast({
                title: "Partner Disconnected",
                description: `${partnerName} went offline. You are now free to chat with others.`,
              });
              
              // End the chat session
              try {
                await supabase
                  .from("active_chat_sessions")
                  .update({
                    status: "ended",
                    ended_at: new Date().toISOString(),
                    end_reason: "partner_offline"
                  })
                  .eq("id", sessionId);
              } catch (error) {
                console.error("Error ending chat on partner offline:", error);
              }
              
              onClose();
            }
            
            partnerOnlineStatus = !isNowOffline;
          }
        }
      )
      .subscribe();

    // Also subscribe to session status changes - if partner ends the chat
    const sessionChannel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload: any) => {
          const session = payload.new;
          
          // If session was ended by partner, close the chat window
          if (session.status === 'ended' && session.end_reason) {
            console.log("Session ended:", session.end_reason);
            
            let message = "Chat session ended";
            if (session.end_reason === 'partner_offline') {
              message = `${partnerName} went offline`;
            } else if (session.end_reason === 'user_closed' || session.end_reason === 'user_ended') {
              message = `${partnerName} ended the chat`;
            } else if (session.end_reason === 'inactivity_timeout') {
              message = "Chat ended due to inactivity";
            }
            
            toast({
              title: "Chat Disconnected",
              description: message + ". You are now available for new chats.",
            });
            
            onClose();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [partnerId, partnerName, sessionId, isPartnerOnline, onClose, toast]);

  // UNIVERSAL OFFLINE TRANSLATION: Auto-translate messages for display
  // Uses translateUniversal for meaning-based translation (NO external APIs)
  // For RECEIVER: Always translate to receiver's mother tongue + show English meaning
  // For SENDER: Show their original message + English meaning below
  const translateMessage = useCallback(async (text: string, senderId: string, originalEnglish?: string): Promise<{
    translatedMessage?: string;
    englishMessage?: string;
    latinMessage?: string;
    senderView?: string;
    receiverView?: string;
    isTranslated?: boolean;
    detectedLanguage?: string;
  }> => {
    try {
      const isSentByMe = senderId === currentUserId;
      
      console.log('[DraggableMiniChatWindow] translateMessage with Universal Offline:', {
        text: text.substring(0, 50),
        originalEnglish: originalEnglish?.substring(0, 50),
        isSentByMe,
        senderLanguage: isSentByMe ? currentUserLanguage : partnerLanguage,
        receiverLanguage: isSentByMe ? partnerLanguage : currentUserLanguage
      });
      
      // Import utilities for Latin script handling
      const { reverseTransliterate } = await import('@/lib/libre-translate/transliterator');
      const { isLatinText: checkLatinText } = await import('@/lib/libre-translate/language-data');
      
      let displayText: string = text;
      let englishText: string | undefined = originalEnglish;
      let wasTranslated = false;
      
      // Determine source language based on sender
      const senderLanguage = isSentByMe ? currentUserLanguage : partnerLanguage;
      const receiverLanguage = isSentByMe ? partnerLanguage : currentUserLanguage;
      
      if (isSentByMe) {
        // ===========================================
        // SENDER VIEW: Show what sender typed + English meaning
        // ===========================================
        displayText = text;
        
        // MANDATORY: Generate English meaning if not available
        if (!englishText) {
          if (checkIsEnglish(currentUserLanguage)) {
            englishText = text;
          } else {
            try {
              console.log('[translateMessage] Sender: Generating English from', currentUserLanguage);
              const englishResult = await translateSemantic(text, currentUserLanguage, 'english');
              englishText = englishResult?.translatedText || text;
              console.log('[translateMessage] Sender English result:', englishText?.substring(0, 50));
            } catch (e) {
              console.error('[translateMessage] Sender English generation failed:', e);
              englishText = text;
            }
          }
        }
      } else {
        // ===========================================
        // RECEIVER VIEW: ALWAYS translate to receiver's mother tongue
        // + ALWAYS show English meaning below
        // ===========================================
        
        // Check if originalEnglish is actually English or just Latin phonetic
        const isActualEnglish = originalEnglish && originalEnglish.trim() && 
          !originalEnglish.match(/^[a-z\s]+$/i) || // Has punctuation/numbers
          originalEnglish.split(' ').some(word => 
            ['how', 'are', 'you', 'what', 'where', 'hello', 'hi', 'good', 'the', 'is', 'a', 'an', 'to', 'for', 'in', 'on', 'with'].includes(word.toLowerCase())
          ); // Contains common English words
        
        // Step 1: Translate to receiver's native language
        if (isActualEnglish && originalEnglish && originalEnglish.trim()) {
          // Best case: We have English source - translate directly to receiver's language
          console.log('[translateMessage] Receiver: Have actual English, translating to:', currentUserLanguage);
          
          if (checkIsEnglish(currentUserLanguage)) {
            // Receiver's language IS English - just show English
            displayText = originalEnglish;
          } else {
            // Translate English → Receiver's mother tongue using Universal Offline
            try {
              const result = await translateSemantic(originalEnglish, 'english', currentUserLanguage);
              displayText = result?.translatedText || text;
              wasTranslated = result?.isTranslated || (result?.translatedText !== originalEnglish);
              console.log('[translateMessage] Receiver native result:', displayText.substring(0, 50));
            } catch (e) {
              console.error('[translateMessage] Translation to receiver failed:', e);
              displayText = text;
            }
          }
          englishText = originalEnglish;
        } else {
          // No actual English available - translate from partner's language to receiver's language
          console.log('[translateMessage] Receiver: No actual English (might be phonetic), translating from', partnerLanguage, 'to', currentUserLanguage);
          
          if (!isSameLanguage(partnerLanguage, currentUserLanguage)) {
            // Different languages - need translation
            try {
              const result = await translateSemantic(text, partnerLanguage, currentUserLanguage);
              displayText = result?.translatedText || text;
              wasTranslated = result?.isTranslated || (result?.translatedText !== text);
              console.log('[translateMessage] Receiver cross-lang result:', displayText.substring(0, 50));
            } catch (e) {
              console.error('[translateMessage] Cross-language translation failed:', e);
              displayText = text;
            }
          } else {
            // Same language - no translation needed
            displayText = text;
          }
          
          // MANDATORY: Generate ACTUAL English meaning from sender's message
          // This is needed when original_english contains phonetic text
          try {
            console.log('[translateMessage] Generating actual English meaning from:', partnerLanguage);
            const englishResult = await translateSemantic(text, partnerLanguage, 'english');
            if (englishResult?.translatedText && englishResult.isTranslated) {
              englishText = englishResult.translatedText;
              console.log('[translateMessage] English MEANING result:', englishText?.substring(0, 50));
            } else if (englishResult?.translatedText && englishResult.translatedText !== text) {
              englishText = englishResult.translatedText;
            } else {
              // Fallback to showing "Translation pending" rather than phonetic
              englishText = originalEnglish || '(English pending...)';
            }
          } catch (e) {
            console.error('[translateMessage] English meaning generation failed:', e);
            englishText = originalEnglish || text;
          }
        }
      }
      
      // Generate Latin transliteration for non-Latin scripts
      let latinText: string | undefined;
      if (displayText && !checkLatinText(displayText)) {
        latinText = reverseTransliterate(displayText, currentUserLanguage);
        if (latinText === displayText || !latinText?.trim()) {
          latinText = reverseTransliterate(displayText, partnerLanguage);
          if (latinText === displayText || !latinText?.trim()) {
            latinText = undefined;
          }
        }
      }
      
      // FINAL FALLBACK: Ensure we ALWAYS have English for all 9 combinations
      if (!englishText || englishText === text) {
        // If English still equals the original text and it's not English, try one more time
        if (!checkIsEnglish(senderLanguage)) {
          try {
            const finalEnglishResult = await translateSemantic(text, senderLanguage, 'english');
            if (finalEnglishResult?.translatedText && finalEnglishResult.translatedText !== text) {
              englishText = finalEnglishResult.translatedText;
            }
          } catch {
            // Keep existing englishText
          }
        }
      }
      
      // Absolute fallback
      if (!englishText) {
        englishText = text;
      }
      
      console.log('[translateMessage] Final result:', {
        displayText: displayText.substring(0, 30),
        englishText: englishText?.substring(0, 30),
        latinText: latinText?.substring(0, 30),
        wasTranslated
      });
      
      return {
        translatedMessage: displayText,
        englishMessage: englishText,
        latinMessage: latinText,
        senderView: isSentByMe ? displayText : text,
        receiverView: isSentByMe ? undefined : displayText,
        isTranslated: wasTranslated,
        detectedLanguage: senderLanguage
      };
    } catch (error) {
      console.error('[DraggableMiniChatWindow] Translation error:', error);
      return { translatedMessage: text, englishMessage: text, isTranslated: false };
    }
  }, [partnerLanguage, currentUserLanguage, currentUserId]);

  // BIDIRECTIONAL MOTHER TONGUE: Load messages with correct views
  // DB Schema:
  //   - message: sender's mother tongue text (senderView)
  //   - translated_message: receiver's mother tongue text (receiverView)
  //   - original_english: English semantic meaning (englishCore)
  // ALL TRANSLATIONS RUN IN BACKGROUND - NEVER BLOCKS UI
  const loadMessages = async () => {
    console.log('[DraggableMiniChatWindow] loadMessages called');
    
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      // IMMEDIATE: Show messages right away with available data
      const immediateMessages = data.map((m) => {
        const isSentByMe = m.sender_id === currentUserId;
        const hasReceiverTranslation = m.translated_message && m.translated_message.length > 0;
        
        // CRITICAL: Determine display based on viewer's role
        let displayMessage: string;
        if (isSentByMe) {
          displayMessage = m.message;
        } else {
          displayMessage = hasReceiverTranslation ? m.translated_message : m.message;
        }
        
        return {
          id: m.id,
          senderId: m.sender_id,
          message: m.message,
          translatedMessage: displayMessage,
          englishMessage: m.original_english || undefined,
          latinMessage: undefined,
          isTranslated: !isSentByMe && hasReceiverTranslation,
          isTranslating: !isSentByMe && !hasReceiverTranslation, // Mark if needs translation
          createdAt: m.created_at
        };
      });
      setMessages(immediateMessages);

      // ASYNC BACKGROUND: Process translations for messages that need them
      data.forEach((m) => {
        const isSentByMe = m.sender_id === currentUserId;
        const hasReceiverTranslation = m.translated_message && m.translated_message.length > 0;
        const displayText = isSentByMe 
          ? m.message 
          : (m.translated_message || m.message);
        
        // Background: Translate partner messages that don't have translations
        if (!isSentByMe && !hasReceiverTranslation) {
          (async () => {
            try {
              const result = await translateForChatSemantic(
                m.message,
                partnerLanguage,
                currentUserLanguage
              );
              
              if (result.receiverView || result.englishMeaning) {
                setMessages(prev => prev.map(msg => 
                  msg.id === m.id 
                    ? { 
                        ...msg, 
                        translatedMessage: result.receiverView || msg.translatedMessage,
                        englishMessage: result.englishMeaning || msg.englishMessage,
                        isTranslated: true,
                        isTranslating: false 
                      } 
                    : msg
                ));
              } else {
                setMessages(prev => prev.map(msg => 
                  msg.id === m.id ? { ...msg, isTranslating: false } : msg
                ));
              }
            } catch (error) {
              console.warn('[loadMessages] Background translation failed:', error);
              setMessages(prev => prev.map(msg => 
                msg.id === m.id ? { ...msg, isTranslating: false } : msg
              ));
            }
          })();
        }
        
        // Background: Generate Latin transliteration for non-Latin scripts
        const hasNonLatin = /[^\x00-\x7F]/.test(displayText);
        if (hasNonLatin) {
          import('@/lib/libre-translate/transliterator').then(({ reverseTransliterate }) => {
            const latinText = reverseTransliterate(displayText, currentUserLanguage);
            if (latinText && latinText !== displayText) {
              setMessages(prev => prev.map(msg => 
                msg.id === m.id ? { ...msg, latinMessage: latinText } : msg
              ));
            }
          }).catch(() => {/* ignore */});
        }
      });
    }
  };

  // BIDIRECTIONAL: Subscribe to new messages with correct mother tongue views
  // ALL TRANSLATIONS RUN IN BACKGROUND - NEVER BLOCKS UI
  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`draggable-chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as any;
          
          // Skip if already exists (optimistic update)
          const exists = messages.some(msg => msg.id === m.id);
          if (exists) return;
          
          const isSentByMe = m.sender_id === currentUserId;
          const hasReceiverTranslation = m.translated_message && m.translated_message.length > 0;
          
          // BIDIRECTIONAL VIEW LOGIC:
          // When I SENT: show message (my mother tongue)
          // When PARTNER SENT: show translated_message (my mother tongue)
          let displayMessage: string;
          if (isSentByMe) {
            displayMessage = m.message;
          } else {
            displayMessage = hasReceiverTranslation ? m.translated_message : m.message;
          }
          
          const newMsg: Message = {
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            translatedMessage: displayMessage,
            englishMessage: m.original_english || undefined,
            latinMessage: undefined,
            isTranslated: !isSentByMe && hasReceiverTranslation,
            isTranslating: !isSentByMe && !hasReceiverTranslation, // Mark as translating if no translation yet
            createdAt: m.created_at
          };
          
          // IMMEDIATE: Add message to UI right away
          setMessages(prev => {
            // Remove temp messages for same sender
            const filtered = prev.filter(msg => 
              !msg.id.startsWith('temp-') || msg.senderId !== m.sender_id
            );
            return [...filtered, newMsg];
          });
          
          // Update counts and activity
          if (!isSentByMe) {
            setUnreadCount(prev => prev + (isMinimized ? 1 : 0));
            setLastActivityTime(Date.now());
            
            // ASYNC BACKGROUND: If partner's message has no translation, translate now
            if (!hasReceiverTranslation) {
              // Run translation in background - NEVER blocks
              (async () => {
                try {
                  const result = await translateForChatSemantic(
                    m.message,
                    partnerLanguage,
                    currentUserLanguage
                  );
                  
                  if (result.receiverView || result.englishMeaning) {
                    setMessages(prev => prev.map(msg => 
                      msg.id === m.id 
                        ? { 
                            ...msg, 
                            translatedMessage: result.receiverView || msg.translatedMessage,
                            englishMessage: result.englishMeaning || msg.englishMessage,
                            isTranslated: true,
                            isTranslating: false 
                          } 
                        : msg
                    ));
                  } else {
                    // Mark as done even if translation failed
                    setMessages(prev => prev.map(msg => 
                      msg.id === m.id ? { ...msg, isTranslating: false } : msg
                    ));
                  }
                } catch (error) {
                  console.warn('[subscribeToMessages] Background translation failed:', error);
                  setMessages(prev => prev.map(msg => 
                    msg.id === m.id ? { ...msg, isTranslating: false } : msg
                  ));
                }
              })();
            }
          }
          
          // ASYNC BACKGROUND: Generate Latin transliteration for non-Latin text
          const hasNonLatin = /[^\x00-\x7F]/.test(displayMessage);
          if (hasNonLatin) {
            import('@/lib/libre-translate/transliterator').then(({ reverseTransliterate }) => {
              const latinText = reverseTransliterate(displayMessage, currentUserLanguage);
              if (latinText && latinText !== displayMessage) {
                setMessages(prev => prev.map(msg => 
                  msg.id === newMsg.id ? { ...msg, latinMessage: latinText } : msg
                ));
              }
            }).catch(() => {/* ignore */});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startBilling = () => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    heartbeatRef.current = setInterval(async () => {
      try {
        await supabase.functions.invoke("chat-manager", {
          body: { action: "heartbeat", chat_id: chatId, session_id: sessionId }
        });

        // Refresh wallet balance for men
        if (userGender === "male") {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (wallet) {
            setWalletBalance(wallet.balance);
            
            // Check if balance is too low
            if (wallet.balance < ratePerMinute) {
              toast({
                title: "Low Balance",
                description: "Please recharge to continue chatting",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }, 60000);
  };

  const handleTyping = useCallback((text: string) => {
    setLastActivityTime(Date.now());
    // Send typing indicator with native script preview - broadcasts to partner
    // Uses setTimeout(0) to ensure it never blocks the input
    if (text.trim()) {
      setTimeout(() => {
        broadcastTyping(text.trim(), partnerLanguage);
      }, 0);
    }
  }, [broadcastTyping, partnerLanguage]);

  const MAX_MESSAGE_LENGTH = 10000; // Support very large messages

  // Track the current preview for this typing session - reset after each send
  const currentPreviewRef = useRef<string>('');

  // FULLY ASYNC FIRE-AND-FORGET: Send message immediately, translate in complete background
  // - Message added to UI INSTANTLY
  // - Database insert happens immediately with original text
  // - Translation runs COMPLETELY in background and updates DB asynchronously
  // - Typing is NEVER blocked - send button re-enables immediately
  // - Both sender and receiver can continue typing without ANY delay
  const sendingRef = useRef(false); // Track sending state without causing re-renders
  
  const sendMessage = async () => {
    const inputText = rawInput.trim();
    const previewSnapshot = meaningPreview;
    
    // Prevent double-send using ref (not state) to avoid blocking
    if (!inputText || sendingRef.current) return;
    sendingRef.current = true;

    if (inputText.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive"
      });
      sendingRef.current = false;
      return;
    }

    // Content moderation - quick sync check
    const { moderateMessage } = await import('@/lib/content-moderation');
    const moderationResult = moderateMessage(inputText);
    if (moderationResult.isBlocked) {
      toast({
        title: "Message Blocked",
        description: moderationResult.reason,
        variant: "destructive"
      });
      sendingRef.current = false;
      return;
    }

    // === IMMEDIATE: Clear input and add optimistic message ===
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageTimestamp = new Date().toISOString();
    
    // Clear input immediately - user can start typing next message RIGHT AWAY
    setNewMessage("");
    setRawInput("");
    setMeaningPreview("");
    setLivePreview({ text: '', isLoading: false });
    currentPreviewRef.current = '';
    clearPreview();
    setLastActivityTime(Date.now());
    
    // Clear all preview timeouts
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    if (meaningPreviewTimeoutRef.current) {
      clearTimeout(meaningPreviewTimeoutRef.current);
      meaningPreviewTimeoutRef.current = null;
    }
    if (transliterationTimeoutRef.current) {
      clearTimeout(transliterationTimeoutRef.current);
      transliterationTimeoutRef.current = null;
    }
    
    // Quick heuristic check if input looks like English or native script
    const hasNonLatin = /[^\x00-\x7F]/.test(inputText);
    const looksLikeEnglish = !hasNonLatin && /^[\x00-\x7F\s.,!?'"()-]+$/.test(inputText) && inputText.length > 2;
    
    // Determine initial display for sender - use preview if available
    let senderDisplay = inputText;
    if (previewSnapshot && previewSnapshot.trim()) {
      senderDisplay = previewSnapshot;
    }

    // Add optimistic message IMMEDIATELY
    setMessages(prev => [...prev, {
      id: tempId,
      senderId: currentUserId,
      message: inputText,
      translatedMessage: senderDisplay,
      latinMessage: undefined,
      englishMessage: looksLikeEnglish ? inputText : '(translating...)',
      isTranslated: senderDisplay !== inputText,
      isTranslating: true,
      createdAt: messageTimestamp
    }]);

    // RE-ENABLE SEND IMMEDIATELY - user can send next message right away
    sendingRef.current = false;

    // === FIRE-AND-FORGET BACKGROUND PROCESS ===
    // This runs completely independently - doesn't block anything
    (async () => {
      let messageToStore = inputText;
      let translatedForReceiver: string | null = null;
      let originalEnglishToStore: string | null = null;
      let senderNativeDisplay: string | null = null;
      let dbMessageId: string | null = null;

      // === STEP 1: INSERT TO DATABASE IMMEDIATELY with original text ===
      // Don't wait for translation - insert right away
      try {
        const { data: insertedMessage, error: insertError } = await supabase
          .from("chat_messages")
          .insert({
            chat_id: chatId,
            sender_id: currentUserId,
            receiver_id: partnerId,
            message: inputText,
            translated_message: inputText, // Will be updated after translation
            original_english: looksLikeEnglish ? inputText : null
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        dbMessageId = insertedMessage?.id;
        
        // Update temp ID to real ID in local state
        if (dbMessageId) {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, id: dbMessageId! } : m
          ));
        }
      } catch (dbError) {
        console.error("[sendMessage] Initial DB insert error:", dbError);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        return; // Stop background process if initial insert fails
      }

      // === STEP 2: TRANSLATE IN BACKGROUND (completely async) ===
      const hasNativeScript = /[^\x00-\x7F]/.test(inputText);
      const looksLikeEnglishWords = /\b(the|is|are|was|were|have|has|had|do|does|did|what|when|where|why|how|who|hello|hi|hey|thanks|you|your|me|my|we|i|am|be|and|or|but|not)\b/i.test(inputText.toLowerCase());
      const isEnglishInput = looksLikeEnglishWords && !hasNativeScript;
      
      console.log(`[sendMessage] Background translation: isEnglish=${isEnglishInput}, hasNative=${hasNativeScript}`);
      
      try {
        // Use bidirectional edge function for translation
        console.log(`[sendMessage] Bidirectional: ${currentUserLanguage} → ${partnerLanguage}`);
        
        const bidirectionalResult = await translateForChatSemantic(
          inputText, 
          currentUserLanguage, 
          partnerLanguage
        );
        
        if (bidirectionalResult.senderView || bidirectionalResult.receiverView) {
          senderNativeDisplay = bidirectionalResult.senderView;
          translatedForReceiver = bidirectionalResult.receiverView;
          originalEnglishToStore = bidirectionalResult.englishMeaning;
          
          if (senderNativeDisplay && senderNativeDisplay.trim()) {
            messageToStore = senderNativeDisplay;
          }
          
          if (!translatedForReceiver || !translatedForReceiver.trim()) {
            translatedForReceiver = messageToStore;
          }
          
          if (!originalEnglishToStore || !originalEnglishToStore.trim()) {
            originalEnglishToStore = inputText;
          }
          
          console.log(`[sendMessage] Translation complete:
            sender: "${senderNativeDisplay?.substring(0, 30)}..."
            receiver: "${translatedForReceiver?.substring(0, 30)}..."
            english: "${originalEnglishToStore?.substring(0, 30)}..."`);
          
          // Update local UI with translations
          const displayId = dbMessageId || tempId;
          setMessages(prev => prev.map(m =>
            m.id === displayId
              ? { 
                  ...m, 
                  translatedMessage: senderNativeDisplay || inputText,
                  message: senderNativeDisplay || inputText,
                  englishMessage: originalEnglishToStore,
                  isTranslated: true,
                  isTranslating: false 
                }
              : m
          ));
          
          // === STEP 3: UPDATE DATABASE with translations ===
          if (dbMessageId) {
            await supabase
              .from("chat_messages")
              .update({
                message: messageToStore || inputText,
                translated_message: translatedForReceiver || inputText,
                original_english: originalEnglishToStore || inputText
              })
              .eq('id', dbMessageId);
          }
        } else {
          // Fallback translations
          console.log('[sendMessage] Using fallback parallel translation');
          
          const translationPromises: Promise<void>[] = [];
          
          if (isEnglishInput) {
            originalEnglishToStore = inputText;
            
            if (!checkIsEnglish(currentUserLanguage)) {
              if (previewSnapshot && previewSnapshot.trim()) {
                senderNativeDisplay = previewSnapshot;
                messageToStore = previewSnapshot;
              } else {
                translationPromises.push(
                  translateSemantic(inputText, 'english', currentUserLanguage)
                    .then(result => {
                      if (result?.translatedText && result.translatedText.trim()) {
                        senderNativeDisplay = result.translatedText;
                        messageToStore = result.translatedText;
                        const displayId = dbMessageId || tempId;
                        setMessages(prev => prev.map(m =>
                          m.id === displayId
                            ? { ...m, translatedMessage: result.translatedText, message: result.translatedText, isTranslated: true }
                            : m
                        ));
                      }
                    })
                    .catch(e => console.warn('[sendMessage] Sender translation failed:', e))
                );
              }
            }
            
            if (!checkIsEnglish(partnerLanguage)) {
              translationPromises.push(
                translateSemantic(inputText, 'english', partnerLanguage)
                  .then(result => {
                    translatedForReceiver = result?.translatedText || inputText;
                  })
                  .catch(e => {
                    console.warn('[sendMessage] Receiver translation failed:', e);
                    translatedForReceiver = inputText;
                  })
              );
            } else {
              translatedForReceiver = inputText;
            }
          } else {
            messageToStore = inputText;
            
            if (!checkIsEnglish(currentUserLanguage)) {
              translationPromises.push(
                translateSemantic(inputText, currentUserLanguage, 'english')
                  .then(result => {
                    if (result?.translatedText && result.isTranslated) {
                      originalEnglishToStore = result.translatedText;
                      const displayId = dbMessageId || tempId;
                      setMessages(prev => prev.map(m =>
                        m.id === displayId
                          ? { ...m, englishMessage: result.translatedText }
                          : m
                      ));
                    }
                  })
                  .catch(e => console.warn('[sendMessage] English failed:', e))
              );
            } else {
              originalEnglishToStore = inputText;
            }
            
            if (!isSameLanguage(currentUserLanguage, partnerLanguage)) {
              translationPromises.push(
                translateSemantic(inputText, currentUserLanguage, partnerLanguage)
                  .then(result => {
                    translatedForReceiver = result?.translatedText || inputText;
                  })
                  .catch(e => {
                    console.warn('[sendMessage] Receiver translation failed:', e);
                    translatedForReceiver = inputText;
                  })
              );
            } else {
              translatedForReceiver = inputText;
            }
          }
          
          await Promise.allSettled(translationPromises);
          
          // Update DB after fallback translations
          if (dbMessageId) {
            await supabase
              .from("chat_messages")
              .update({
                message: messageToStore || inputText,
                translated_message: translatedForReceiver || inputText,
                original_english: originalEnglishToStore || inputText
              })
              .eq('id', dbMessageId);
          }
        }
        
        // Mark translation complete
        const displayId = dbMessageId || tempId;
        setMessages(prev => prev.map(m =>
          m.id === displayId ? { ...m, isTranslating: false } : m
        ));
        
      } catch (translationError) {
        console.error('[sendMessage] Translation error:', translationError);
        const displayId = dbMessageId || tempId;
        setMessages(prev => prev.map(m =>
          m.id === displayId ? { ...m, isTranslating: false } : m
        ));
      }
    })(); // Fire-and-forget IIFE
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) {
      setUnreadCount(0);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      setIsMinimized(false);
    }
  };

  const handleClose = async () => {
    try {
      await supabase
        .from("active_chat_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: "user_closed"
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error closing chat:", error);
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setIsAttachOpen(false);
    setLastActivityTime(Date.now());

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}/${chatId}/${Date.now()}.${fileExt}`;
      const bucket = fileType === 'image' ? 'profile-photos' : 'community-files';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Send message with file
      const emoji = fileType === 'image' ? '📷' : fileType === 'video' ? '🎬' : '📎';
      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: `${emoji} [${fileType.toUpperCase()}:${publicUrl}] ${file.name}`
        });

      if (messageError) throw messageError;

      toast({
        title: "File sent",
        description: `${file.name} has been sent`
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to send file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = (accept: string, fileType: 'image' | 'video' | 'document') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.dataset.fileType = fileType;
      fileInputRef.current.click();
    }
  };

  const estimatedCost = billingStarted ? (elapsedSeconds / 60) * ratePerMinute : 0;
  const estimatedEarning = billingStarted ? (elapsedSeconds / 60) * earningRatePerMinute : 0;

  // When initialPosition is {0,0}, use relative positioning for flex layout
  const useFlexLayout = initialPosition.x === 0 && initialPosition.y === 0;
  
  const windowStyle = isMaximized 
    ? { 
        position: 'fixed' as const, 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100%', 
        height: '100%',
        zIndex: zIndex + 100 
      }
    : useFlexLayout
      ? {
          position: 'relative' as const,
          width: isMinimized ? 240 : size.width, 
          height: isMinimized ? 48 : size.height,
          zIndex
        }
      : { 
          position: 'fixed' as const,
          left: position.x, 
          top: position.y, 
          width: isMinimized ? 240 : size.width, 
          height: isMinimized ? 48 : size.height,
          zIndex
        };

  return (
    <Card 
      ref={windowRef}
      style={windowStyle}
      className={cn(
        "flex flex-col shadow-2xl border-2 transition-all duration-200",
        isPartnerOnline ? "border-primary/30" : "border-muted",
        isDragging && "opacity-90",
        isMaximized && "rounded-none"
      )}
      onClick={onFocus}
    >
      {/* Inactivity Warning */}
      {inactiveWarning && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-[9px]">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>{inactiveWarning}</span>
        </div>
      )}
      
      {/* Header - Draggable with mouse and touch support */}
      <div 
        className={cn(
          "flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-transparent border-b touch-none select-none",
          !isMaximized && "cursor-move"
        )}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isMaximized && (
            <Move className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          <div className="relative">
            <Avatar className="h-7 w-7">
              <AvatarImage src={partnerPhoto || undefined} />
              <AvatarFallback className="text-xs bg-primary/20">
                {partnerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background",
              isPartnerOnline ? "bg-green-500" : "bg-muted-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium truncate">{partnerName}</p>
              {userGender === "male" && walletBalance > 0 && (
                <Badge variant="outline" className="h-3.5 text-[8px] px-1 gap-0.5">
                  <Wallet className="h-2 w-2" />₹{walletBalance.toFixed(0)}
                </Badge>
              )}
              {userGender === "female" && todayEarnings > 0 && (
                <Badge variant="outline" className="h-3.5 text-[8px] px-1 gap-0.5 border-green-500/30 text-green-600">
                  <TrendingUp className="h-2 w-2" />₹{todayEarnings.toFixed(0)}
                </Badge>
              )}
            </div>
            {billingStarted && (
              <div className="flex items-center gap-1 text-[10px]">
                <Clock className="h-2 w-2 text-muted-foreground" />
                <span className="text-muted-foreground">{formatTime(elapsedSeconds)}</span>
                {userGender === "male" ? (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <IndianRupee className="h-2 w-2 text-destructive" />
                    <span className="text-destructive">₹{estimatedCost.toFixed(1)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <TrendingUp className="h-2 w-2 text-green-500" />
                    <span className="text-green-500">+₹{estimatedEarning.toFixed(1)}</span>
                  </>
                )}
              </div>
            )}
            {!billingStarted && (
              <p className="text-[10px] text-muted-foreground">
                {userGender === "male" 
                  ? `₹${ratePerMinute}/min - Both reply to start` 
                  : "Reply to start earning"}
              </p>
            )}
          </div>
          {unreadCount > 0 && isMinimized && (
            <Badge className="h-4 min-w-[16px] text-[9px] px-1 bg-primary">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5" onMouseDown={e => e.stopPropagation()}>
          {/* Toggle button to show/hide action buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); setAreButtonsExpanded(!areButtonsExpanded); }}
            title={areButtonsExpanded ? "Hide actions" : "Show actions"}
          >
            <MoreHorizontal className="h-2.5 w-2.5" />
          </Button>
          
          {/* Expandable action buttons - hidden by default */}
          {areButtonsExpanded && (
            <>
              {/* Gift Button - only men can send */}
              {userGender === "male" && (
                <GiftSendButton
                  senderId={currentUserId}
                  receiverId={partnerId}
                  receiverName={partnerName}
                  disabled={!billingStarted}
                />
              )}
              {/* Relationship Actions (Block/Unblock/Friend/Unfriend/Stop) */}
              <MiniChatActions
                currentUserId={currentUserId}
                targetUserId={partnerId}
                targetUserName={partnerName}
                isPartnerOnline={isPartnerOnline}
                onBlock={handleClose}
                onStopChat={handleClose}
                onLogOff={handleClose}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={toggleMaximize}
                title={isMaximized ? "Restore size" : "Maximize"}
              >
                {isMaximized ? <Minimize2 className="h-2.5 w-2.5" /> : <Maximize2 className="h-2.5 w-2.5" />}
              </Button>
            </>
          )}
          
          {/* Always visible: minimize/expand and close */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={toggleMinimize}
          >
            {isMinimized ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
            onClick={handleClose}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1.5">
              {messages.length === 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-4">
                  Say hi to start! Billing begins when both reply.
                </p>
              )}
              {messages.map((msg) => {
                // Parse special message formats
                const isVoice = msg.message.startsWith('[VOICE:');
                const isImage = msg.message.includes('[IMAGE:');
                const isVideo = msg.message.includes('[VIDEO:');
                const isDocument = msg.message.includes('[DOCUMENT:');
                const isFile = isImage || isVideo || isDocument;

                // Extract URL from special format
                const extractUrl = (text: string, type: string) => {
                  const match = text.match(new RegExp(`\\[${type}:([^\\]]+)\\]`));
                  return match ? match[1] : null;
                };

                const fileUrl = isVoice 
                  ? msg.message.replace('[VOICE:', '').replace(']', '')
                  : isImage ? extractUrl(msg.message, 'IMAGE')
                  : isVideo ? extractUrl(msg.message, 'VIDEO')
                  : isDocument ? extractUrl(msg.message, 'DOCUMENT')
                  : null;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.senderId === currentUserId ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] px-2 py-1 rounded-xl text-[11px]",
                        msg.senderId === currentUserId
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      )}
                    >
                      {/* Message content - no language labels */}
                      {isVoice && fileUrl ? (
                        <div className="flex items-center gap-2">
                          <Mic className="h-3 w-3" />
                          <audio src={fileUrl} controls className="h-6 max-w-[150px]" />
                        </div>
                      ) : isImage && fileUrl ? (
                        <div className="space-y-1">
                          <img 
                            src={fileUrl} 
                            alt="Shared image" 
                            className="max-w-[200px] max-h-[150px] rounded object-cover cursor-pointer"
                            onClick={() => window.open(fileUrl, '_blank')}
                          />
                        </div>
                      ) : isVideo && fileUrl ? (
                        <div className="space-y-1">
                          <video 
                            src={fileUrl} 
                            controls 
                            className="max-w-[200px] max-h-[150px] rounded"
                          />
                        </div>
                      ) : isDocument && fileUrl ? (
                        <a 
                          href={fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 underline hover:opacity-80"
                        >
                          <FileText className="h-3 w-3" />
                          <span>View Document</span>
                        </a>
                      ) : msg.senderId === currentUserId ? (
                        // ===========================================
                        // OWN MESSAGE (SENDER VIEW)
                        // ALWAYS show English meaning for ALL 9 combinations
                        // ===========================================
                        msg.isTranslating ? (
                          <div className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="opacity-70 italic unicode-text" dir="auto">{msg.message}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {/* Primary message - mother tongue (native OR Latin based on profile) */}
                            <p className="unicode-text" dir="auto">
                              {msg.translatedMessage || msg.message}
                            </p>
                            
                            {/* English meaning - ALWAYS shown below in small letters */}
                            <p className="text-[9px] opacity-60 italic border-t border-current/10 pt-0.5 mt-0.5">
                              🌐 {msg.englishMessage || msg.message}
                            </p>
                          </div>
                        )
                      ) : msg.isTranslating ? (
                        // PARTNER MESSAGE: Translation in progress
                        <div className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="opacity-70 italic">{msg.message}</span>
                        </div>
                      ) : (
                        // ===========================================
                        // PARTNER MESSAGE (RECEIVER VIEW)
                        // ALWAYS show English meaning for ALL 9 combinations
                        // ===========================================
                        <div className="space-y-1">
                          {/* Primary message - mother tongue (native OR Latin based on profile) */}
                          <p className="unicode-text" dir="auto">
                            {msg.translatedMessage || msg.message}
                          </p>
                          
                          {/* English meaning - ALWAYS shown below in small letters */}
                          <p className="text-[9px] opacity-60 italic border-t border-current/10 pt-0.5 mt-0.5">
                            🌐 {msg.englishMessage || msg.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Partner typing indicator - shows in receiver's native language */}
              {partnerTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <TranslatedTypingIndicator
                      indicator={partnerTyping}
                      partnerName={partnerName}
                      className="text-[10px]"
                    />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area - EN MODE ONLY */}
          <div className="p-1.5 border-t space-y-1">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const fileType = (e.target.dataset.fileType || 'document') as 'image' | 'video' | 'document';
                handleFileUpload(e, fileType);
              }}
            />
            
            <div className="flex items-center gap-1">
              {/* Auto-detect indicator - shows input will be auto-detected */}
              <Badge variant="outline" className="h-6 text-[8px] px-1 shrink-0 opacity-60" title="Auto-detects English, native script, or romanized input">
                <Languages className="h-3 w-3 mr-0.5" />
                Auto
              </Badge>
              
              {/* Attach button */}
              <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1 z-[100] bg-popover border shadow-lg" side="top" align="start">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => triggerFileInput('image/*', 'image')}
                    >
                      <Image className="h-4 w-4 mr-2 text-blue-500" />
                      Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => triggerFileInput('video/*', 'video')}
                    >
                      <Video className="h-4 w-4 mr-2 text-purple-500" />
                      Video
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => triggerFileInput('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar', 'document')}
                    >
                      <FileText className="h-4 w-4 mr-2 text-orange-500" />
                      Document
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Auto-detect preview - shows mother tongue translation */}
              <div className="flex-1 relative">
                {/* Mother tongue preview - shown for any input type (Gboard, voice, keyboard, mixed) */}
                {meaningPreview && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 px-2 py-1 bg-primary/5 border border-primary/20 rounded text-sm unicode-text" dir="auto">
                    <span className="text-[8px] opacity-50 mr-1 flex items-center gap-0.5 inline-flex">
                      {detectedInputSource === 'voice' && <Mic className="h-2 w-2" />}
                      {detectedInputSource === 'gboard' && <Type className="h-2 w-2" />}
                      ({currentUserLanguage})
                    </span>
                    {meaningPreview}
                    {isMeaningLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin text-primary/50" />}
                  </div>
                )}
                {!meaningPreview && rawInput.trim() && isMeaningLoading && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 px-2 py-1 bg-muted/50 border border-muted rounded text-[10px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>
                      {detectedInputSource === 'voice' ? 'Processing voice...' : 
                       detectedInputSource === 'gboard' ? 'Processing...' :
                       `Translating to ${currentUserLanguage}...`}
                    </span>
                  </div>
                )}
                
                {/* Same language indicator */}
                {!needsTranslation && newMessage.trim() && !meaningPreview && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 px-2 py-0.5 bg-muted/50 rounded text-[9px] text-muted-foreground">
                    Same language - direct chat
                  </div>
                )}
                <Input
                  placeholder="Type, speak, or use any keyboard..."
                  value={newMessage}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const prevValue = newMessage;
                    
                    // Detect input source (Gboard, voice, keyboard, mixed)
                    const inputSource = detectInputSource(newValue, prevValue);
                    setDetectedInputSource(inputSource);
                    
                    // SYNC ONLY: Update input values immediately (NEVER blocks)
                    setRawInput(newValue);
                    setNewMessage(newValue);
                    
                    // ASYNC: Schedule preview generation in next microtask (NEVER blocks typing)
                    // Using requestAnimationFrame for smoother typing experience
                    requestAnimationFrame(() => {
                      generateMeaningPreview(newValue, inputSource);
                      handleTyping(newValue);
                    });
                  }}
                  onKeyDown={handleKeyPress}
                  lang="en"
                  dir="auto"
                  spellCheck={true}
                  autoComplete="off"
                  autoCorrect="on"
                  inputMode="text"
                  enterKeyHint="send"
                  className="h-8 text-xs w-full unicode-text"
                  disabled={isUploading}
                />
              </div>

              {/* Send button - never blocks, fires instantly */}
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Resize handles - all corners and edges */}
          {!isMaximized && (
            <>
              {/* Corner handles */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'se')}
                onTouchStart={(e) => handleResizeStart(e, 'se')}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground rotate-[-45deg]" />
              </div>
              <div
                className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                onTouchStart={(e) => handleResizeStart(e, 'sw')}
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                onTouchStart={(e) => handleResizeStart(e, 'ne')}
              />
              <div
                className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                onTouchStart={(e) => handleResizeStart(e, 'nw')}
              />
              {/* Edge handles */}
              <div
                className="absolute top-0 left-4 right-4 h-1.5 cursor-n-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'n')}
                onTouchStart={(e) => handleResizeStart(e, 'n')}
              />
              <div
                className="absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 's')}
                onTouchStart={(e) => handleResizeStart(e, 's')}
              />
              <div
                className="absolute left-0 top-4 bottom-4 w-1.5 cursor-w-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'w')}
                onTouchStart={(e) => handleResizeStart(e, 'w')}
              />
              <div
                className="absolute right-0 top-4 bottom-4 w-1.5 cursor-e-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'e')}
                onTouchStart={(e) => handleResizeStart(e, 'e')}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default DraggableMiniChatWindow;
