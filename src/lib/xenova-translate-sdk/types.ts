/**
 * Xenova Translation SDK Types
 * Browser-based translation supporting 1000+ languages
 */

export type TranslationPath =
  | 'DIRECT_M2M'     // Latin → Latin (M2M-100)
  | 'DIRECT_NLLB'    // en ↔ any (NLLB-200)
  | 'PIVOT_EN'       // native ↔ native via English
  | 'SAME'           // Same language - passthrough
  | 'FALLBACK';      // Unsupported - return original

export type ScriptType = 'latin' | 'native';

export interface Language {
  code: string;           // ISO-639 code
  name: string;           // English name
  nativeName?: string;    // Native script name
  script: ScriptType;     // 'latin' or 'native'
  supported: boolean;     // Whether translation is supported
  models: {
    nllb: boolean;        // NLLB-200 support
    m2m: boolean;         // M2M-100 support
  };
}

export interface UserProfile {
  id: string;
  motherTongue: string;   // ISO code from languages.ts
  uiLanguage?: string;    // UI display language
  fallbackLanguage: 'en'; // Always English fallback
}

export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLang: string;
  targetLang: string;
  path: TranslationPath;
  isTranslated: boolean;
  detectedLang?: string;
  confidence?: number;
}

export interface ChatTranslationResult {
  senderView: string;      // In sender's mother tongue
  receiverView: string;    // In receiver's mother tongue
  englishCore: string;     // English semantic meaning
  originalText: string;
  path: TranslationPath;
  isTranslated: boolean;
}

export interface ModelLoadProgress {
  status: 'loading' | 'ready' | 'error';
  progress: number;        // 0-100
  model?: string;
  error?: string;
}

export interface TranslatorConfig {
  enableCache?: boolean;
  cacheTTL?: number;       // ms
  mobileMode?: boolean;    // Lower threads for mobile
  numThreads?: number;     // Override thread count
  debugMode?: boolean;
}

// Worker message types
export interface WorkerMessage {
  id: string;
  type: 'init' | 'translate' | 'detect' | 'translate_chat';
  payload: any;
}

export interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
  progress?: ModelLoadProgress;
}
