/**
 * Translation Router
 * Determines the best translation path based on source/target languages
 */

import type { TranslationPath } from './types';
import { 
  isLatinLanguage, 
  isLanguageSupported, 
  normalizeLanguageCode,
  isEnglish,
  isSameLanguage 
} from './languages';

/**
 * Route translation to the best available path
 */
export function route(sourceLang: string, targetLang: string): TranslationPath {
  const src = normalizeLanguageCode(sourceLang);
  const tgt = normalizeLanguageCode(targetLang);
  
  console.log(`[XenovaRouter] Routing: ${sourceLang} (${src}) → ${targetLang} (${tgt})`);
  
  // Same language - no translation needed
  if (isSameLanguage(src, tgt)) {
    console.log(`[XenovaRouter] Same language detected: ${src} = ${tgt}`);
    return 'SAME';
  }
  
  // Check if languages are supported
  const srcSupported = isLanguageSupported(src);
  const tgtSupported = isLanguageSupported(tgt);
  
  console.log(`[XenovaRouter] Support check: src(${src})=${srcSupported}, tgt(${tgt})=${tgtSupported}`);
  
  if (!srcSupported || !tgtSupported) {
    console.warn(`[XenovaRouter] Unsupported language pair: ${src} (supported=${srcSupported}) → ${tgt} (supported=${tgtSupported})`);
    return 'FALLBACK';
  }
  
  // Check script types
  const srcLatin = isLatinLanguage(src);
  const tgtLatin = isLatinLanguage(tgt);
  
  console.log(`[XenovaRouter] Script check: src(${src}) latin=${srcLatin}, tgt(${tgt}) latin=${tgtLatin}`);
  
  // Latin ↔ Latin: Use M2M-100 (faster for Latin scripts)
  if (srcLatin && tgtLatin) {
    console.log(`[XenovaRouter] Latin pair, using M2M: ${src} → ${tgt}`);
    return 'DIRECT_M2M';
  }
  
  // English ↔ Any: Direct NLLB (best quality)
  if (isEnglish(src) || isEnglish(tgt)) {
    console.log(`[XenovaRouter] English involved, using NLLB: ${src} → ${tgt}`);
    return 'DIRECT_NLLB';
  }
  
  // Native ↔ Native: Pivot through English
  console.log(`[XenovaRouter] Native pair, using pivot: ${src} → en → ${tgt}`);
  return 'PIVOT_EN';
}

/**
 * Get human-readable description of translation path
 */
export function describePath(path: TranslationPath): string {
  switch (path) {
    case 'SAME': return 'Same language (passthrough)';
    case 'DIRECT_M2M': return 'Direct M2M-100 translation';
    case 'DIRECT_NLLB': return 'Direct NLLB-200 translation';
    case 'PIVOT_EN': return 'Pivot translation via English';
    case 'FALLBACK': return 'Fallback (unsupported)';
    default: return 'Unknown';
  }
}
