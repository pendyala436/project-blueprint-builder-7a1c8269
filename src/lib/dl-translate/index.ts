/**
 * DL-Translate - Server-Side Only
 * ================================
 * All translation via Edge Function (translate-message)
 * 
 * Features:
 * 1. Auto-detect source language
 * 2. Translate between any language pair (200+ languages)
 * 3. Convert Latin typing to native script
 * 4. Same language optimization (no translation needed)
 * 
 * @example
 * ```tsx
 * import { useDLTranslate } from '@/lib/dl-translate';
 * 
 * const { translate, translateForChat, convertToNative } = useDLTranslate();
 * 
 * // Translate text
 * const result = await translate('Hello', 'english', 'hindi');
 * console.log(result.text); // "नमस्ते"
 * 
 * // Chat translation
 * const chatResult = await translateForChat('How are you?', {
 *   senderLanguage: 'english',
 *   receiverLanguage: 'hindi'
 * });
 * ```
 */

// Types
export type {
  TranslationResult,
  ChatTranslationOptions,
} from './useDLTranslate';

// React hook (server-side translation)
export { useDLTranslate } from './useDLTranslate';
export { useDLTranslate as default } from './useDLTranslate';

// Re-export server translation hook
export { useServerTranslation } from '@/hooks/useServerTranslation';
export type { UseServerTranslationOptions, UseServerTranslationReturn } from '@/hooks/useServerTranslation';
