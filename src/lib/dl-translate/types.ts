/**
 * DL-Translate TypeScript Types
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * Supports 200+ languages with auto-detection and bidirectional chat translation
 */

// Translation result - complete translation response
export interface TranslationResult {
  text: string;                    // Translated/converted text
  originalText: string;            // Original input text
  source: string;                  // Source language name
  target: string;                  // Target language name
  sourceCode?: string;             // Source language code
  targetCode?: string;             // Target language code
  isTranslated: boolean;           // Whether translation occurred
  detectedLanguage?: string;       // Auto-detected source language
  detectedScript?: string;         // Detected script type
  mode: 'translate' | 'convert' | 'passthrough';  // What operation was performed
}

// Language info - complete language metadata
export interface LanguageInfo {
  name: string;                    // Normalized language name (lowercase)
  code: string;                    // ISO language code
  native?: string;                 // Native script name
  script?: string;                 // Script name (e.g., "Devanagari")
  rtl?: boolean;                   // Right-to-left language
}

// Chat translation options - for bidirectional chat
export interface ChatTranslationOptions {
  senderLanguage: string;          // Sender's mother tongue
  receiverLanguage: string;        // Receiver's mother tongue
  senderMessage: string;           // Original message from sender
}

// Script detection result - auto-detection output
export interface ScriptDetectionResult {
  script: string;                  // Script name (e.g., "Devanagari", "Latin")
  language: string;                // Detected language
  isLatin: boolean;                // Whether text is Latin script
  confidence: number;              // Detection confidence (0-1)
}

// Chat message - for multilingual chat display
export interface ChatMessage {
  id: string;
  senderId: string;
  senderLanguage: string;
  originalMessage: string;         // In sender's native script
  translatedMessage?: string;      // In receiver's native language
  isTranslated: boolean;
  detectedLanguage?: string;
  timestamp: string;
}

// Live preview - real-time typing preview
export interface LivePreview {
  inputText: string;               // What user is typing (Latin)
  previewText: string;             // Converted to native script
  isConverting: boolean;           // Loading state
  targetLanguage: string;          // User's native language
}

// Translation cache entry
export interface CacheEntry {
  result: TranslationResult;
  timestamp: number;
  hits: number;
}

// Translator configuration
export interface TranslatorConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;               // Cache TTL in milliseconds
  maxRetries?: number;
  timeout?: number;
  debugMode?: boolean;
}

// Batch translation item
export interface BatchTranslationItem {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

// Batch translation result
export interface BatchTranslationResult {
  results: TranslationResult[];
  successCount: number;
  failureCount: number;
  totalTime: number;
}
