/**
 * Universal Semantic Translation Hook
 * ====================================
 * 
 * React hook for semantic (meaning-based) translation that:
 * - Dynamically discovers available languages
 * - Works for any number of languages
 * - Uses English as semantic pivot
 * - NO hard-coded language lists
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadEngine, type Language, type TranslationEngine } from '@/lib/translation/engine';
import { 
  semanticTranslate, 
  semanticTranslateBatch,
  getSupportedLanguages,
  type SemanticTranslationResult,
  type LanguageInfo,
} from '@/lib/translation/semantic-translate';

// ============================================================
// HOOK STATE TYPES
// ============================================================

interface UseSemanticTranslationState {
  // Engine state
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Languages (dynamically discovered)
  languages: LanguageInfo[];
  languageCount: number;
  
  // Translation functions
  translate: (text: string, source: string, target: string) => Promise<SemanticTranslationResult>;
  translateBatch: (texts: string[], source: string, target: string) => Promise<SemanticTranslationResult[]>;
  
  // Language utilities
  getLanguage: (codeOrName: string) => LanguageInfo | null;
  isLanguageSupported: (language: string) => boolean;
  isEnglish: (language: string) => boolean;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useSemanticTranslation(): UseSemanticTranslationState {
  const [engine, setEngine] = useState<TranslationEngine | null>(null);
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    let mounted = true;

    const initEngine = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const loadedEngine = await loadEngine();
        const loadedLanguages = await getSupportedLanguages();
        
        if (mounted) {
          setEngine(loadedEngine);
          setLanguages(loadedLanguages);
        }
      } catch (err) {
        console.error('[useSemanticTranslation] Failed to initialize:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load translation engine');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initEngine();

    return () => {
      mounted = false;
    };
  }, []);

  // Memoized translate function
  const translate = useCallback(async (
    text: string, 
    source: string, 
    target: string
  ): Promise<SemanticTranslationResult> => {
    return semanticTranslate(text, source, target);
  }, []);

  // Memoized batch translate function
  const translateBatch = useCallback(async (
    texts: string[], 
    source: string, 
    target: string
  ): Promise<SemanticTranslationResult[]> => {
    return semanticTranslateBatch(texts, source, target);
  }, []);

  // Get language by code or name
  const getLanguage = useCallback((codeOrName: string): LanguageInfo | null => {
    const normalized = codeOrName.toLowerCase().trim();
    return languages.find(l => 
      l.code.toLowerCase() === normalized || 
      l.name.toLowerCase() === normalized
    ) || null;
  }, [languages]);

  // Check if language is supported
  const isLanguageSupported = useCallback((language: string): boolean => {
    return getLanguage(language) !== null;
  }, [getLanguage]);

  // Check if language is English
  const isEnglish = useCallback((language: string): boolean => {
    const lang = getLanguage(language);
    return lang?.code === 'en' || lang?.name === 'english';
  }, [getLanguage]);

  // Memoized return value
  return useMemo(() => ({
    isReady: engine !== null && !isLoading,
    isLoading,
    error,
    languages,
    languageCount: languages.length,
    translate,
    translateBatch,
    getLanguage,
    isLanguageSupported,
    isEnglish,
  }), [
    engine, 
    isLoading, 
    error, 
    languages, 
    translate, 
    translateBatch, 
    getLanguage, 
    isLanguageSupported, 
    isEnglish
  ]);
}

// ============================================================
// SIMPLE TRANSLATION HOOK
// ============================================================

interface UseTranslateState {
  result: SemanticTranslationResult | null;
  isTranslating: boolean;
  error: string | null;
  translate: (text: string) => Promise<void>;
  clear: () => void;
}

/**
 * Simple hook for translating between two fixed languages
 */
export function useTranslate(
  sourceLanguage: string,
  targetLanguage: string
): UseTranslateState {
  const [result, setResult] = useState<SemanticTranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResult(null);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const translationResult = await semanticTranslate(text, sourceLanguage, targetLanguage);
      setResult(translationResult);
      
      if (translationResult.error) {
        setError(translationResult.error);
      }
    } catch (err) {
      console.error('[useTranslate] Translation failed:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      setResult(null);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceLanguage, targetLanguage]);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isTranslating, error, translate, clear };
}

// ============================================================
// CHAT TRANSLATION HOOK
// ============================================================

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderLanguage: string;
  translatedText?: string;
}

interface UseChatTranslationState {
  translateForReceiver: (message: ChatMessage, receiverLanguage: string) => Promise<string>;
  translateReply: (replyText: string, senderLanguage: string, receiverLanguage: string) => Promise<string>;
  isReady: boolean;
}

/**
 * Hook for bidirectional chat translation
 */
export function useChatTranslation(): UseChatTranslationState {
  const { isReady } = useSemanticTranslation();

  const translateForReceiver = useCallback(async (
    message: ChatMessage, 
    receiverLanguage: string
  ): Promise<string> => {
    if (message.senderLanguage === receiverLanguage) {
      return message.text;
    }

    const result = await semanticTranslate(
      message.text, 
      message.senderLanguage, 
      receiverLanguage
    );
    
    return result.text;
  }, []);

  const translateReply = useCallback(async (
    replyText: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<string> => {
    if (senderLanguage === receiverLanguage) {
      return replyText;
    }

    // Reply goes: receiver's language → sender's language
    const result = await semanticTranslate(replyText, receiverLanguage, senderLanguage);
    return result.text;
  }, []);

  return { translateForReceiver, translateReply, isReady };
}

export default useSemanticTranslation;
