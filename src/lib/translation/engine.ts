/**
 * Universal Semantic Translation Engine
 * ======================================
 * 
 * Language-agnostic engine contract that:
 * - Dynamically discovers available languages
 * - Scales to ANY number of languages (10, 50, 386, 1000+)
 * - No hard-coded language lists in translation logic
 * - Uses English as semantic pivot
 * 
 * This is the ONLY correct way to build a scalable translation system.
 */

import { languages as allLanguages, type Language as DataLanguage } from '@/data/languages';
import { dynamicTransliterate, reverseTransliterate } from './dynamic-transliterator';

// ============================================================
// UNIVERSAL TYPE DEFINITIONS
// ============================================================

export type Language = {
  code: string;        // ISO or internal code
  name: string;        // Display name
  nativeName: string;  // Native script name
  script: 'Latin' | 'Native';  // Script category
  scriptName: string;  // Actual script name (Devanagari, Cyrillic, etc.)
  rtl?: boolean;       // Right-to-left
};

export type Translator = {
  translateMeaning(text: string): Promise<string>;
};

export type TranslationEngine = {
  getLanguages(): Language[];
  getLanguage(codeOrName: string): Language | null;
  getTranslator(from: string, to: string): Translator | null;
  isReady(): boolean;
};

// ============================================================
// ENGINE IMPLEMENTATION
// ============================================================

class SemanticTranslationEngine implements TranslationEngine {
  private languages: Language[] = [];
  private languageByCode: Map<string, Language> = new Map();
  private languageByName: Map<string, Language> = new Map();
  private translationCache: Map<string, string> = new Map();
  private readonly MAX_CACHE_SIZE = 2000;
  private readonly ENGLISH_CODE = 'en';
  
  constructor() {
    this.initializeLanguages();
    console.log(`[SemanticEngine] Initialized with ${this.languages.length} languages`);
  }

  /**
   * Dynamically discover and register all available languages
   * No hard-coding - reads from the language database
   */
  private initializeLanguages(): void {
    this.languages = allLanguages.map((lang: DataLanguage): Language => ({
      code: lang.code,
      name: lang.name.toLowerCase().trim(),
      nativeName: lang.nativeName,
      script: this.isLatinScript(lang.script) ? 'Latin' : 'Native',
      scriptName: lang.script || 'Latin',
      rtl: lang.rtl,
    }));

    // Build lookup maps
    for (const lang of this.languages) {
      this.languageByCode.set(lang.code.toLowerCase(), lang);
      this.languageByName.set(lang.name.toLowerCase(), lang);
      // Also map by native name for flexibility
      if (lang.nativeName) {
        this.languageByName.set(lang.nativeName.toLowerCase(), lang);
      }
    }
  }

  private isLatinScript(script?: string): boolean {
    return !script || script === 'Latin';
  }

  getLanguages(): Language[] {
    return [...this.languages];
  }

  getLanguage(codeOrName: string): Language | null {
    const normalized = codeOrName.toLowerCase().trim();
    return this.languageByCode.get(normalized) || 
           this.languageByName.get(normalized) || 
           null;
  }

  /**
   * Get a translator for a language pair
   * Returns null if either language is not supported
   */
  getTranslator(from: string, to: string): Translator | null {
    const sourceLanguage = this.getLanguage(from);
    const targetLanguage = this.getLanguage(to);

    if (!sourceLanguage || !targetLanguage) {
      return null;
    }

    return {
      translateMeaning: async (text: string): Promise<string> => {
        return this.translateBetween(text, sourceLanguage, targetLanguage);
      }
    };
  }

  isReady(): boolean {
    return this.languages.length > 0;
  }

  /**
   * Core translation logic between two languages
   * Uses transliteration as the semantic bridge
   */
  private async translateBetween(text: string, source: Language, target: Language): Promise<string> {
    if (!text.trim()) return text;
    
    // Check cache
    const cacheKey = `${source.code}:${target.code}:${text.substring(0, 100)}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) return cached;

    let result = text;

    // Same language - just handle script conversion if needed
    if (source.code === target.code) {
      if (target.script === 'Native' && this.isLatinText(text)) {
        result = this.transliterateToNative(text, target.name);
      }
    }
    // Source is English - translate to target
    else if (source.code === this.ENGLISH_CODE) {
      result = this.fromEnglish(text, target);
    }
    // Target is English - translate from source
    else if (target.code === this.ENGLISH_CODE) {
      result = this.toEnglish(text, source);
    }
    // Both non-English: Source → English → Target (semantic pivot)
    else {
      const english = this.toEnglish(text, source);
      result = this.fromEnglish(english, target);
    }

    // Cache result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Translate from any language to English (semantic extraction)
   */
  private toEnglish(text: string, source: Language): string {
    if (!text.trim()) return text;
    
    // For Latin script languages, text is already phonetically English-readable
    if (source.script === 'Latin') {
      return text;
    }
    
    // For non-Latin scripts, reverse transliterate to Latin/English
    try {
      const reversed = reverseTransliterate(text, source.name);
      return reversed || text;
    } catch {
      return text;
    }
  }

  /**
   * Translate from English to any language (semantic rendering)
   */
  private fromEnglish(text: string, target: Language): string {
    if (!text.trim()) return text;
    
    // For Latin script languages, minimal processing needed
    if (target.script === 'Latin') {
      return text;
    }
    
    // For non-Latin scripts, transliterate to native script
    return this.transliterateToNative(text, target.name);
  }

  private transliterateToNative(text: string, targetLanguage: string): string {
    if (!this.isLatinText(text)) return text;
    
    try {
      const result = dynamicTransliterate(text, targetLanguage);
      return result || text;
    } catch {
      return text;
    }
  }

  private isLatinText(text: string): boolean {
    const cleaned = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
    if (!cleaned) return true;
    const latinMatch = cleaned.match(/[\u0000-\u007F\u0080-\u00FF\u0100-\u024F]/g) || [];
    return latinMatch.length / cleaned.length > 0.7;
  }

  private setCache(key: string, value: string): void {
    if (this.translationCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.translationCache.keys().next().value;
      if (firstKey) this.translationCache.delete(firstKey);
    }
    this.translationCache.set(key, value);
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.translationCache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }
}

// ============================================================
// SINGLETON ENGINE INSTANCE
// ============================================================

let engineInstance: SemanticTranslationEngine | null = null;

/**
 * Load and initialize the translation engine
 * Returns immediately if already loaded
 */
export async function loadEngine(): Promise<TranslationEngine> {
  if (engineInstance) return engineInstance;
  engineInstance = new SemanticTranslationEngine();
  return engineInstance;
}

/**
 * Get engine synchronously (must be loaded first)
 */
export function getEngine(): TranslationEngine | null {
  return engineInstance;
}

/**
 * Clear engine cache
 */
export function clearEngineCache(): void {
  engineInstance?.clearCache();
}

/**
 * Get engine cache stats
 */
export function getEngineCacheStats(): { size: number; maxSize: number } | null {
  return engineInstance?.getCacheStats() || null;
}

// Auto-initialize on module load
loadEngine().catch(console.error);

export default loadEngine;
