/**
 * useChatPipeline Hook
 * =====================
 * 
 * React hook for using the chat translation pipeline.
 * Provides easy access to message processing with loading states.
 * 
 * @example
 * ```tsx
 * const { processMessage, preview, isProcessing, error } = useChatPipeline({
 *   senderLanguage: 'english',
 *   receiverLanguage: 'telugu'
 * });
 * 
 * // Process and send a message
 * const result = await processMessage('hello');
 * console.log(result.sender.main);   // "hello"
 * console.log(result.receiver.main); // "హలో"
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { processChatMessage, getTypingPreview, type MessageViews } from '@/lib/chat-pipeline';

interface UseChatPipelineOptions {
  senderLanguage: string;
  receiverLanguage: string;
  previewDebounceMs?: number;
}

interface UseChatPipelineReturn {
  // Process a message (for sending)
  processMessage: (text: string) => Promise<MessageViews>;
  
  // Update preview while typing
  updatePreview: (text: string) => void;
  
  // Current preview state
  preview: { main: string; english: string } | null;
  
  // Loading states
  isProcessing: boolean;
  isPreviewing: boolean;
  
  // Error state
  error: Error | null;
  
  // Clear preview
  clearPreview: () => void;
}

export function useChatPipeline({
  senderLanguage,
  receiverLanguage,
  previewDebounceMs = 300
}: UseChatPipelineOptions): UseChatPipelineReturn {
  const [preview, setPreview] = useState<{ main: string; english: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Process a complete message (for sending)
  const processMessage = useCallback(async (text: string): Promise<MessageViews> => {
    setError(null);
    setIsProcessing(true);
    
    try {
      const result = await processChatMessage(text, senderLanguage, receiverLanguage);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Processing failed');
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [senderLanguage, receiverLanguage]);

  // Update preview (debounced)
  const updatePreview = useCallback((text: string) => {
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (!text.trim()) {
      setPreview(null);
      setIsPreviewing(false);
      return;
    }
    
    setIsPreviewing(true);
    
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await getTypingPreview(text, senderLanguage, receiverLanguage);
        setPreview({ main: result.preview, english: result.english });
      } catch (err) {
        console.error('[useChatPipeline] Preview error:', err);
        setPreview({ main: text, english: '' });
      } finally {
        setIsPreviewing(false);
      }
    }, previewDebounceMs);
  }, [senderLanguage, receiverLanguage, previewDebounceMs]);

  // Clear preview
  const clearPreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setPreview(null);
    setIsPreviewing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    processMessage,
    updatePreview,
    preview,
    isProcessing,
    isPreviewing,
    error,
    clearPreview
  };
}

export default useChatPipeline;
