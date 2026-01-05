/**
 * Phonetic Transliterator
 * 
 * Re-exports ICU-style transliteration for 200+ languages.
 * 
 * Example: "emi chesthunnavu" → "ఏమి చేస్తున్నావు" (Telugu)
 * 
 * Supports: All NLLB-200 languages with proper script mappings
 */

// Re-export from ICU transliterator
export { 
  icuTransliterate as phoneticTransliterate,
  isICUTransliterationSupported as isPhoneticTransliterationSupported,
  getICUSupportedLanguages as getSupportedPhoneticLanguages,
  convertNumerals,
  getScriptType,
} from './icu-transliterator';

