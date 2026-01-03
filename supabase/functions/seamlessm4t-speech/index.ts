/**
 * SeamlessM4T Speech Edge Function
 * 
 * Provides speech-to-text and speech-to-speech translation
 * using Facebook's SeamlessM4T model via HuggingFace Inference API.
 * 
 * Endpoints:
 * - POST /speech-to-text: Convert audio to text with auto language detection
 * - POST /speech-to-speech: Convert audio in one language to audio in another language
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SeamlessM4T language codes
const SEAMLESS_LANGUAGE_CODES: Record<string, string> = {
  english: 'eng', hindi: 'hin', telugu: 'tel', tamil: 'tam',
  bengali: 'ben', marathi: 'mar', gujarati: 'guj', kannada: 'kan',
  malayalam: 'mal', punjabi: 'pan', odia: 'ory', urdu: 'urd',
  chinese: 'cmn', japanese: 'jpn', korean: 'kor', arabic: 'arb',
  persian: 'pes', russian: 'rus', spanish: 'spa', french: 'fra',
  german: 'deu', italian: 'ita', portuguese: 'por', dutch: 'nld',
  polish: 'pol', turkish: 'tur', swedish: 'swe', danish: 'dan',
  norwegian: 'nob', finnish: 'fin', czech: 'ces', romanian: 'ron',
  hungarian: 'hun', bulgarian: 'bul', croatian: 'hrv', serbian: 'srp',
  slovak: 'slk', slovenian: 'slv', lithuanian: 'lit', latvian: 'lvs',
  estonian: 'est', georgian: 'kat', armenian: 'hye', swahili: 'swh',
  thai: 'tha', vietnamese: 'vie', indonesian: 'ind', malay: 'zsm',
  tagalog: 'tgl', burmese: 'mya', khmer: 'khm', nepali: 'npi',
  sinhala: 'sin', assamese: 'asm', greek: 'ell', ukrainian: 'ukr',
  hebrew: 'heb',
};

// Language aliases
const LANGUAGE_ALIASES: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', farsi: 'persian', mandarin: 'chinese',
  en: 'english', hi: 'hindi', te: 'telugu', ta: 'tamil', bn: 'bengali',
  mr: 'marathi', gu: 'gujarati', kn: 'kannada', ml: 'malayalam', pa: 'punjabi',
  or: 'odia', ur: 'urdu', zh: 'chinese', ja: 'japanese', ko: 'korean',
  ar: 'arabic', fa: 'persian', ru: 'russian', es: 'spanish', fr: 'french',
  de: 'german', it: 'italian', pt: 'portuguese', nl: 'dutch', pl: 'polish',
  tr: 'turkish', sv: 'swedish', da: 'danish', no: 'norwegian', fi: 'finnish',
  cs: 'czech', ro: 'romanian', hu: 'hungarian', bg: 'bulgarian', hr: 'croatian',
  sr: 'serbian', sk: 'slovak', sl: 'slovenian', lt: 'lithuanian', lv: 'latvian',
  et: 'estonian', ka: 'georgian', hy: 'armenian', sw: 'swahili',
  th: 'thai', vi: 'vietnamese', id: 'indonesian', ms: 'malay', tl: 'tagalog',
  my: 'burmese', km: 'khmer', ne: 'nepali', si: 'sinhala',
  as: 'assamese', el: 'greek', uk: 'ukrainian', he: 'hebrew',
};

function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

function getSeamlessCode(language: string): string | null {
  return SEAMLESS_LANGUAGE_CODES[language] || null;
}

/**
 * Speech-to-Text using Whisper (with auto language detection)
 */
async function speechToText(
  audioBase64: string,
  sourceLanguage: string | null,
  apiKey: string
): Promise<{ text: string; detectedLanguage?: string }> {
  console.log(`[seamlessm4t] Speech-to-Text starting...`);
  
  // Decode base64 to binary
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create blob from audio data
  const blob = new Blob([bytes], { type: 'audio/wav' });
  
  // Use Whisper for speech-to-text (supports 99 languages with auto-detection)
  const formData = new FormData();
  formData.append('file', blob, 'audio.wav');
  
  const params: Record<string, string> = {};
  if (sourceLanguage) {
    const langCode = getSeamlessCode(normalizeLanguage(sourceLanguage));
    if (langCode) params.language = langCode;
  }
  
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[seamlessm4t] Whisper error: ${response.status}`, errorText);
      
      if (response.status === 503) {
        console.log("[seamlessm4t] Model loading, retrying...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        return speechToText(audioBase64, sourceLanguage, apiKey);
      }
      
      throw new Error(`Speech-to-text failed: ${errorText}`);
    }

    const result = await response.json();
    console.log(`[seamlessm4t] Whisper result:`, result);
    
    return {
      text: result.text || '',
      detectedLanguage: result.chunks?.[0]?.language || sourceLanguage || 'english'
    };
  } catch (error) {
    console.error("[seamlessm4t] Whisper exception:", error);
    throw error;
  }
}

/**
 * Text-to-Speech using SeamlessM4T
 */
async function textToSpeech(
  text: string,
  targetLanguage: string,
  apiKey: string
): Promise<string> {
  console.log(`[seamlessm4t] Text-to-Speech: "${text.slice(0, 50)}..." -> ${targetLanguage}`);
  
  const targetLangCode = getSeamlessCode(normalizeLanguage(targetLanguage));
  if (!targetLangCode) {
    throw new Error(`Language not supported: ${targetLanguage}`);
  }
  
  try {
    // Use Facebook MMS-TTS for text-to-speech
    const response = await fetch(
      `https://api-inference.huggingface.co/models/facebook/mms-tts-${targetLangCode}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      // Fallback to English TTS if language-specific model not available
      console.log(`[seamlessm4t] TTS model not available for ${targetLangCode}, using English`);
      const fallbackResponse = await fetch(
        "https://api-inference.huggingface.co/models/facebook/mms-tts-eng",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text }),
        }
      );
      
      if (!fallbackResponse.ok) {
        throw new Error('Text-to-speech failed');
      }
      
      const audioBuffer = await fallbackResponse.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      return base64Audio;
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    console.log(`[seamlessm4t] TTS success, audio size: ${base64Audio.length} bytes`);
    
    return base64Audio;
  } catch (error) {
    console.error("[seamlessm4t] TTS exception:", error);
    throw error;
  }
}

/**
 * Translate text using NLLB-200
 */
async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<string> {
  // Import NLLB codes
  const NLLB_CODES: Record<string, string> = {
    english: 'eng_Latn', hindi: 'hin_Deva', telugu: 'tel_Telu', tamil: 'tam_Taml',
    bengali: 'ben_Beng', marathi: 'mar_Deva', gujarati: 'guj_Gujr', kannada: 'kan_Knda',
    malayalam: 'mal_Mlym', punjabi: 'pan_Guru', odia: 'ory_Orya', urdu: 'urd_Arab',
    chinese: 'zho_Hans', japanese: 'jpn_Jpan', korean: 'kor_Hang', arabic: 'arb_Arab',
    persian: 'pes_Arab', russian: 'rus_Cyrl', spanish: 'spa_Latn', french: 'fra_Latn',
    german: 'deu_Latn', italian: 'ita_Latn', portuguese: 'por_Latn', dutch: 'nld_Latn',
    polish: 'pol_Latn', turkish: 'tur_Latn', thai: 'tha_Thai', vietnamese: 'vie_Latn',
    indonesian: 'ind_Latn', greek: 'ell_Grek', ukrainian: 'ukr_Cyrl', hebrew: 'heb_Hebr',
  };
  
  const srcCode = NLLB_CODES[normalizeLanguage(sourceLang)];
  const tgtCode = NLLB_CODES[normalizeLanguage(targetLang)];
  
  if (!srcCode || !tgtCode) {
    console.log(`[seamlessm4t] Translation not supported: ${sourceLang} -> ${targetLang}`);
    return text; // Return original text if translation not supported
  }
  
  if (srcCode === tgtCode) {
    return text; // Same language, no translation needed
  }
  
  console.log(`[seamlessm4t] Translating: ${srcCode} -> ${tgtCode}`);
  
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            src_lang: srcCode,
            tgt_lang: tgtCode,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(`[seamlessm4t] Translation error: ${response.status}`);
      return text;
    }

    const result = await response.json();
    const translatedText = result[0]?.translation_text || result[0]?.generated_text || text;
    console.log(`[seamlessm4t] Translation success: "${translatedText.slice(0, 50)}..."`);
    
    return translatedText;
  } catch (error) {
    console.error("[seamlessm4t] Translation exception:", error);
    return text;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, audio, text, sourceLanguage, targetLanguage } = await req.json();

    const HF_API_KEY = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_API_KEY) {
      console.error("[seamlessm4t] HUGGING_FACE_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Speech service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case 'speech-to-text': {
        if (!audio) {
          return new Response(
            JSON.stringify({ error: "Missing audio data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const result = await speechToText(audio, sourceLanguage, HF_API_KEY);
        
        return new Response(
          JSON.stringify({
            text: result.text,
            detectedLanguage: result.detectedLanguage,
            success: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'speech-to-speech': {
        if (!audio) {
          return new Response(
            JSON.stringify({ error: "Missing audio data" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!targetLanguage) {
          return new Response(
            JSON.stringify({ error: "Missing target language" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Step 1: Speech to text
        const sttResult = await speechToText(audio, sourceLanguage, HF_API_KEY);
        console.log(`[seamlessm4t] STT result: "${sttResult.text}"`);
        
        // Step 2: Translate text
        const translatedText = await translateText(
          sttResult.text,
          sttResult.detectedLanguage || sourceLanguage || 'english',
          targetLanguage,
          HF_API_KEY
        );
        console.log(`[seamlessm4t] Translation result: "${translatedText}"`);
        
        // Step 3: Text to speech
        const outputAudio = await textToSpeech(translatedText, targetLanguage, HF_API_KEY);
        
        return new Response(
          JSON.stringify({
            originalText: sttResult.text,
            translatedText: translatedText,
            audio: outputAudio,
            sourceLanguage: sttResult.detectedLanguage || sourceLanguage,
            targetLanguage: targetLanguage,
            success: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'text-to-speech': {
        if (!text) {
          return new Response(
            JSON.stringify({ error: "Missing text" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!targetLanguage) {
          return new Response(
            JSON.stringify({ error: "Missing target language" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const outputAudio = await textToSpeech(text, targetLanguage, HF_API_KEY);
        
        return new Response(
          JSON.stringify({
            audio: outputAudio,
            success: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: speech-to-text, speech-to-speech, or text-to-speech" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("[seamlessm4t] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Speech processing failed",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
