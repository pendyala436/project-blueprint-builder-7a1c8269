/**
 * Universal Semantic Translation API
 * ===================================
 * 
 * Meaning-based translation that:
 * - Works for ALL languages dynamically (386+)
 * - Uses English as semantic pivot
 * - NO hard-coded language lists
 * - NO external APIs
 * - NO NLLB-200
 * - Browser-only
 * 
 * Translation Policy:
 * - If source = target → passthrough
 * - If source or target is English → direct path
 * - If both non-English → English semantic pivot
 */

import { loadEngine, type TranslationEngine, type Language } from './engine';

// Constants
const ENGLISH_CODE = 'en';
const ENGLISH_NAME = 'english';

// ============================================================
// RESULT TYPES
// ============================================================

export interface SemanticTranslationResult {
  text: string;
  originalText: string;
  isTranslated: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  englishPivot?: string;
  confidence: number;
  error?: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: 'Latin' | 'Native';
  scriptName: string;
  rtl?: boolean;
}

// ============================================================
// CORE SEMANTIC TRANSLATION
// ============================================================

/**
 * Universal semantic translation
 * 
 * Rules:
 * - Preserves meaning, intent, and context
 * - NOT word-by-word translation
 * - Uses English as semantic pivot for non-English pairs
 * - Scales to ANY number of languages automatically
 */
export async function semanticTranslate(
  text: string,
  source: string,
  target: string
): Promise<SemanticTranslationResult> {
  const trimmedText = text.trim();
  
  // Empty text
  if (!trimmedText) {
    return createResult('', '', false, source, target, 0);
  }

  const engine = await loadEngine();
  const languages = engine.getLanguages();

  const srcLang = findLanguage(languages, source);
  const tgtLang = findLanguage(languages, target);

  // Language not supported
  if (!srcLang) {
    return createResult(trimmedText, trimmedText, false, source, target, 0, 
      `Source language not found: ${source}`);
  }
  
  if (!tgtLang) {
    return createResult(trimmedText, trimmedText, false, source, target, 0,
      `Target language not found: ${target}`);
  }

  // Same language - no translation needed
  if (srcLang.code === tgtLang.code) {
    return createResult(trimmedText, trimmedText, false, srcLang.name, tgtLang.name, 1.0);
  }

  const sourceIsEnglish = isEnglish(srcLang);
  const targetIsEnglish = isEnglish(tgtLang);

  let result: string;
  let englishPivot: string | undefined;

  try {
    const translator = engine.getTranslator(srcLang.code, tgtLang.code);
    
    if (!translator) {
      return createResult(trimmedText, trimmedText, false, srcLang.name, tgtLang.name, 0,
        'No translator available for this pair');
    }

    if (sourceIsEnglish || targetIsEnglish) {
      // Direct path when English is involved
      result = await translator.translateMeaning(trimmedText);
    } else if (srcLang.script === 'Latin' && tgtLang.script === 'Latin') {
      // Latin → Latin: direct
      result = await translator.translateMeaning(trimmedText);
    } else {
      // Non-English pair: Use English as semantic pivot
      const toEnglish = engine.getTranslator(srcLang.code, ENGLISH_CODE);
      const fromEnglish = engine.getTranslator(ENGLISH_CODE, tgtLang.code);
      
      if (!toEnglish || !fromEnglish) {
        result = await translator.translateMeaning(trimmedText);
      } else {
        // Step 1: Source → English (extract meaning)
        englishPivot = await toEnglish.translateMeaning(trimmedText);
        
        // Step 2: English → Target (render meaning)
        result = await fromEnglish.translateMeaning(englishPivot);
      }
    }

    return {
      text: result,
      originalText: trimmedText,
      isTranslated: result !== trimmedText,
      sourceLanguage: srcLang.name,
      targetLanguage: tgtLang.name,
      englishPivot,
      confidence: 0.85,
    };
  } catch (error) {
    console.error('[SemanticTranslate] Error:', error);
    return createResult(trimmedText, trimmedText, false, srcLang.name, tgtLang.name, 0,
      error instanceof Error ? error.message : 'Translation failed');
  }
}

// ============================================================
// BATCH TRANSLATION
// ============================================================

export async function semanticTranslateBatch(
  texts: string[],
  source: string,
  target: string
): Promise<SemanticTranslationResult[]> {
  return Promise.all(texts.map(text => semanticTranslate(text, source, target)));
}

// ============================================================
// BIDIRECTIONAL TRANSLATION
// ============================================================

export interface BidirectionalResult {
  forward: SemanticTranslationResult;
  reverse: SemanticTranslationResult;
}

export async function semanticTranslateBidirectional(
  text: string,
  languageA: string,
  languageB: string
): Promise<BidirectionalResult> {
  const [forward, reverse] = await Promise.all([
    semanticTranslate(text, languageA, languageB),
    semanticTranslate(text, languageB, languageA),
  ]);

  return { forward, reverse };
}

// ============================================================
// LANGUAGE UTILITIES - DYNAMIC DISCOVERY
// ============================================================

/**
 * Get ALL supported languages dynamically
 * No hard-coded count - returns whatever the engine discovers
 */
export async function getSupportedLanguages(): Promise<LanguageInfo[]> {
  const engine = await loadEngine();
  return engine.getLanguages().map(lang => ({
    code: lang.code,
    name: lang.name,
    nativeName: lang.nativeName,
    script: lang.script,
    scriptName: lang.scriptName,
    rtl: lang.rtl,
  }));
}

/**
 * Get total language count (dynamic)
 */
export async function getLanguageCount(): Promise<number> {
  const engine = await loadEngine();
  return engine.getLanguageCount();
}

/**
 * Check if language is supported
 */
export async function isLanguageSupported(language: string): Promise<boolean> {
  const engine = await loadEngine();
  return engine.getLanguage(language) !== null;
}

/**
 * Check if translation pair is supported
 */
export async function isPairSupported(source: string, target: string): Promise<boolean> {
  const engine = await loadEngine();
  return engine.getTranslator(source, target) !== null;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findLanguage(languages: Language[], query: string): Language | null {
  if (!query) return null;
  const normalized = query.toLowerCase().trim();
  
  // Try code match
  const byCode = languages.find(l => l.code.toLowerCase() === normalized);
  if (byCode) return byCode;
  
  // Try name match
  const byName = languages.find(l => l.name.toLowerCase() === normalized);
  if (byName) return byName;
  
  // Try partial match
  const byPartial = languages.find(l => 
    l.name.includes(normalized) || normalized.includes(l.name)
  );
  
  return byPartial || null;
}

function isEnglish(lang: Language): boolean {
  return lang.code === ENGLISH_CODE || lang.name === ENGLISH_NAME;
}

function createResult(
  text: string,
  originalText: string,
  isTranslated: boolean,
  sourceLanguage: string,
  targetLanguage: string,
  confidence: number,
  error?: string
): SemanticTranslationResult {
  return {
    text,
    originalText,
    isTranslated,
    sourceLanguage,
    targetLanguage,
    confidence,
    error,
  };
}

export default semanticTranslate;
