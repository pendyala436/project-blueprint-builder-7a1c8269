/**
 * Translation Client - Main Thread Only
 * =====================================
 * Direct translation using main thread to avoid worker build issues.
 * Uses async/await pattern for non-blocking behavior.
 */

/**
 * Translate text (main thread)
 */
export async function translateInWorker(
  text: string,
  source: string,
  target: string
): Promise<any> {
  console.log('[TranslationClient] 🔄 Translating:', { text: text.substring(0, 20), source, target });
  
  try {
    const { translateText } = await import('./engine');
    const { normalizeLanguageCode } = await import('./languages');
    const result = await translateText(text, normalizeLanguageCode(source), normalizeLanguageCode(target));
    console.log('[TranslationClient] ✅ Translation complete');
    return result;
  } catch (err) {
    console.error('[TranslationClient] Translation error:', err);
    throw err;
  }
}

/**
 * Chat translation (main thread)
 */
export async function translateChatInWorker(
  text: string,
  senderLang: string,
  receiverLang: string
): Promise<any> {
  console.log('[TranslationClient] 🔄 Chat translating');
  
  try {
    const { translateForChat } = await import('./engine');
    const { normalizeLanguageCode } = await import('./languages');
    const result = await translateForChat(text, normalizeLanguageCode(senderLang), normalizeLanguageCode(receiverLang));
    console.log('[TranslationClient] ✅ Chat translation complete');
    return result;
  } catch (err) {
    console.error('[TranslationClient] Chat translation error:', err);
    throw err;
  }
}

/**
 * Get English meaning (main thread)
 */
export async function toEnglishInWorker(
  text: string,
  source: string
): Promise<string> {
  console.log('[TranslationClient] 🔄 Getting English meaning');
  
  try {
    const { getEnglishMeaning } = await import('./engine');
    const { normalizeLanguageCode } = await import('./languages');
    const result = await getEnglishMeaning(text, normalizeLanguageCode(source));
    console.log('[TranslationClient] ✅ English translation complete');
    return result;
  } catch (err) {
    console.error('[TranslationClient] English translation error:', err);
    throw err;
  }
}

/**
 * Detect language (main thread with quick fallback)
 */
export async function detectInWorker(
  text: string
): Promise<{ language: string; confidence: number }> {
  console.log('[TranslationClient] 🔄 Detecting language');
  
  // Quick regex-based detection for ASCII (likely English)
  const hasNonAscii = /[^\x00-\x7F]/.test(text);
  if (!hasNonAscii) {
    console.log('[TranslationClient] ✅ Quick detection: English (ASCII text)');
    return { language: 'en', confidence: 0.8 };
  }
  
  try {
    const { detectLanguage } = await import('./engine');
    const result = await detectLanguage(text);
    console.log('[TranslationClient] ✅ Detection complete:', result.language);
    return result;
  } catch (err) {
    console.warn('[TranslationClient] Detection failed, defaulting to English:', err);
    return { language: 'en', confidence: 0.5 };
  }
}

/**
 * No-op for backwards compatibility
 */
export function terminateWorker(): void {
  // No worker to terminate
}

/**
 * No-op for backwards compatibility
 */
export function resetWorker(): void {
  // No worker to reset
}
