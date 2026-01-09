/**
 * Universal Semantic Translation API
 * ===================================
 * 
 * Meaning-only pivot logic that:
 * - Works for 10, 50, 386, or 1000+ languages automatically
 * - Uses English as the semantic bridge
 * - No hard-coded language lists
 * - Deterministic and scalable
 * 
 * Translation Policy:
 * - If source or target is English → direct translation
 * - If both are non-English → English semantic pivot
 * - If both use Latin script and direct path exists → allow direct
 * - Otherwise → always use English as semantic bridge
 */

import { loadEngine, type TranslationEngine, type Language } from './engine';

// ============================================================
// CONSTANTS
// ============================================================

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
 * Universal semantic translation function
 * 
 * Rules:
 * - Preserves meaning, intent, and context
 * - NOT word-by-word translation
 * - Uses English as semantic pivot for non-English pairs
 * - Automatically scales to any number of languages
 */
export async function semanticTranslate(
  text: string,
  source: string,
  target: string
): Promise<SemanticTranslationResult> {
  const trimmedText = text.trim();
  
  // Empty text handling
  if (!trimmedText) {
    return {
      text: '',
      originalText: '',
      isTranslated: false,
      sourceLanguage: source,
      targetLanguage: target,
      confidence: 0,
    };
  }

  const engine = await loadEngine();
  const langs = engine.getLanguages();

  const srcLang = findLanguage(langs, source);
  const tgtLang = findLanguage(langs, target);

  // Language not supported
  if (!srcLang || !tgtLang) {
    return {
      text: trimmedText,
      originalText: trimmedText,
      isTranslated: false,
      sourceLanguage: source,
      targetLanguage: target,
      confidence: 0,
      error: !srcLang ? `Source language not supported: ${source}` : `Target language not supported: ${target}`,
    };
  }

  // Same language - no translation needed
  if (srcLang.code === tgtLang.code) {
    return {
      text: trimmedText,
      originalText: trimmedText,
      isTranslated: false,
      sourceLanguage: srcLang.name,
      targetLanguage: tgtLang.name,
      confidence: 1.0,
    };
  }

  const sourceIsEnglish = isEnglishLanguage(srcLang);
  const targetIsEnglish = isEnglishLanguage(tgtLang);

  let result: string;
  let englishPivot: string | undefined;

  try {
    if (sourceIsEnglish) {
      // English → Any: direct translation
      const translator = engine.getTranslator(ENGLISH_CODE, tgtLang.code);
      if (!translator) {
        throw new Error('No translator from English available');
      }
      result = await translator.translateMeaning(trimmedText);
    } else if (targetIsEnglish) {
      // Any → English: direct translation
      const translator = engine.getTranslator(srcLang.code, ENGLISH_CODE);
      if (!translator) {
        throw new Error('No translator to English available');
      }
      result = await translator.translateMeaning(trimmedText);
    } else if (srcLang.script === 'Latin' && tgtLang.script === 'Latin') {
      // Latin → Latin: direct translation (no pivot needed)
      const translator = engine.getTranslator(srcLang.code, tgtLang.code);
      if (!translator) {
        throw new Error('No translator available for Latin pair');
      }
      result = await translator.translateMeaning(trimmedText);
    } else {
      // Non-English with Native scripts: ALWAYS use English as semantic pivot
      const toEnglish = engine.getTranslator(srcLang.code, ENGLISH_CODE);
      const fromEnglish = engine.getTranslator(ENGLISH_CODE, tgtLang.code);
      
      if (!toEnglish || !fromEnglish) {
        throw new Error('English pivot not available');
      }
      
      // Step 1: Source → English (extract meaning)
      englishPivot = await toEnglish.translateMeaning(trimmedText);
      
      // Step 2: English → Target (render meaning)
      result = await fromEnglish.translateMeaning(englishPivot);
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
    console.error('[SemanticTranslate] Translation failed:', error);
    return {
      text: trimmedText,
      originalText: trimmedText,
      isTranslated: false,
      sourceLanguage: srcLang.name,
      targetLanguage: tgtLang.name,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

// ============================================================
// BATCH TRANSLATION
// ============================================================

/**
 * Translate multiple texts in parallel
 */
export async function semanticTranslateBatch(
  texts: string[],
  source: string,
  target: string
): Promise<SemanticTranslationResult[]> {
  return Promise.all(
    texts.map(text => semanticTranslate(text, source, target))
  );
}

// ============================================================
// BIDIRECTIONAL TRANSLATION
// ============================================================

export interface BidirectionalResult {
  forward: SemanticTranslationResult;
  reverse: SemanticTranslationResult;
}

/**
 * Translate text bidirectionally (A→B and B→A)
 * Useful for chat applications
 */
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
// LANGUAGE UTILITIES
// ============================================================

/**
 * Get all supported languages dynamically
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
 * Get total language count
 */
export async function getLanguageCount(): Promise<number> {
  const engine = await loadEngine();
  return engine.getLanguages().length;
}

/**
 * Check if a language is supported
 */
export async function isLanguageSupported(language: string): Promise<boolean> {
  const engine = await loadEngine();
  return engine.getLanguage(language) !== null;
}

/**
 * Check if a translation pair is supported
 */
export async function isPairSupported(source: string, target: string): Promise<boolean> {
  const engine = await loadEngine();
  return engine.getTranslator(source, target) !== null;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findLanguage(languages: Language[], query: string): Language | null {
  const normalized = query.toLowerCase().trim();
  
  // Try exact match by code
  const byCode = languages.find(l => l.code.toLowerCase() === normalized);
  if (byCode) return byCode;
  
  // Try exact match by name
  const byName = languages.find(l => l.name.toLowerCase() === normalized);
  if (byName) return byName;
  
  // Try partial match by name
  const byPartial = languages.find(l => 
    l.name.toLowerCase().includes(normalized) ||
    normalized.includes(l.name.toLowerCase())
  );
  if (byPartial) return byPartial;
  
  return null;
}

function isEnglishLanguage(lang: Language): boolean {
  return lang.code === ENGLISH_CODE || lang.name === ENGLISH_NAME;
}

// ============================================================
// EXPORTS
// ============================================================

export default semanticTranslate;
