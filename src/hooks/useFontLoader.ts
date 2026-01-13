import { useEffect, useCallback, useRef } from 'react';
import { loadFontsForText, loadFontsForLanguage, preloadBaseFonts } from '@/lib/fonts';

/**
 * Hook to automatically load fonts based on text content
 * 
 * @param text - Text that needs font support
 * @returns Object with loading state and manual load function
 */
export function useFontLoader(text?: string) {
  const loadedRef = useRef(new Set<string>());
  
  // Load fonts when text changes
  useEffect(() => {
    if (!text || text.length === 0) return;
    
    // Skip if we've already processed this exact text
    const textHash = text.slice(0, 100); // Use first 100 chars as hash
    if (loadedRef.current.has(textHash)) return;
    
    loadFontsForText(text).then(() => {
      loadedRef.current.add(textHash);
    });
  }, [text]);
  
  const loadForLanguage = useCallback(async (langCode: string) => {
    if (loadedRef.current.has(`lang:${langCode}`)) return;
    await loadFontsForLanguage(langCode);
    loadedRef.current.add(`lang:${langCode}`);
  }, []);
  
  return { loadForLanguage };
}

/**
 * Hook to preload base fonts on app start
 * Call this once at the app root level
 */
export function useBaseFontPreload() {
  useEffect(() => {
    preloadBaseFonts();
  }, []);
}

/**
 * Hook to load fonts for chat messages
 * Optimized for real-time chat with debouncing
 */
export function useChatFontLoader() {
  const pendingTexts = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const loadFontsForMessage = useCallback((text: string) => {
    pendingTexts.current.push(text);
    
    // Debounce font loading to batch multiple messages
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const combined = pendingTexts.current.join(' ');
      pendingTexts.current = [];
      loadFontsForText(combined);
    }, 50); // 50ms debounce
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return { loadFontsForMessage };
}
