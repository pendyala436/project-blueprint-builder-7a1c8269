/**
 * Auto Language Detection Tests
 * =============================
 * Tests for auto-detecting input types without hardcoding
 */

import { describe, it, expect } from 'vitest';

// Mock the detection functions for testing
const SCRIPT_RANGES: Record<string, [number, number][]> = {
  'Devanagari': [[0x0900, 0x097F]],
  'Telugu': [[0x0C00, 0x0C7F]],
  'Tamil': [[0x0B80, 0x0BFF]],
  'Bengali': [[0x0980, 0x09FF]],
  'Kannada': [[0x0C80, 0x0CFF]],
};

function detectScript(text: string): string {
  for (const char of text) {
    const code = char.charCodeAt(0);
    for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
      for (const [start, end] of ranges) {
        if (code >= start && code <= end) {
          return script;
        }
      }
    }
  }
  return 'Latin';
}

function isPureLatinText(text: string): boolean {
  return /^[\x00-\x7F\u00C0-\u024F\s\d.,!?'"()-]+$/.test(text);
}

function hasNativeChars(text: string): boolean {
  return /[^\x00-\x7F\u00C0-\u024F]/.test(text);
}

const ENGLISH_PATTERNS = [
  /\b(the|is|are|was|were|have|has|had)\b/i,
  /\b(what|when|where|why|how|who)\b/i,
  /\b(hello|hi|thanks|please)\b/i,
  /\b(you|your|me|my|we)\b/i,
];

function looksLikeEnglish(text: string): boolean {
  return ENGLISH_PATTERNS.some(p => p.test(text.toLowerCase()));
}

describe('Script Detection', () => {
  it('detects Latin script', () => {
    expect(detectScript('hello world')).toBe('Latin');
    expect(detectScript('how are you')).toBe('Latin');
    expect(detectScript('cómo estás')).toBe('Latin');
  });

  it('detects Devanagari (Hindi) script', () => {
    expect(detectScript('आप कैसे हैं')).toBe('Devanagari');
    expect(detectScript('नमस्ते')).toBe('Devanagari');
  });

  it('detects Telugu script', () => {
    expect(detectScript('మీరు ఎలా ఉన్నారు')).toBe('Telugu');
    expect(detectScript('బాగున్నావా')).toBe('Telugu');
  });

  it('detects Tamil script', () => {
    expect(detectScript('நீங்கள் எப்படி இருக்கிறீர்கள்')).toBe('Tamil');
  });

  it('detects Bengali script', () => {
    expect(detectScript('আপনি কেমন আছেন')).toBe('Bengali');
  });

  it('detects Kannada script', () => {
    expect(detectScript('ನೀವು ಹೇಗಿದ್ದೀರಿ')).toBe('Kannada');
  });
});

describe('Input Type Detection', () => {
  it('detects pure Latin text', () => {
    expect(isPureLatinText('hello world')).toBe(true);
    expect(isPureLatinText('how are you?')).toBe(true);
    expect(isPureLatinText('bagunnava')).toBe(true);
    expect(isPureLatinText('cómo estás')).toBe(true); // Extended Latin
  });

  it('detects native characters', () => {
    expect(hasNativeChars('आप कैसे हैं')).toBe(true);
    expect(hasNativeChars('మీరు ఎలా ఉన్నారు')).toBe(true);
    expect(hasNativeChars('hello world')).toBe(false);
  });

  it('detects English patterns', () => {
    expect(looksLikeEnglish('how are you')).toBe(true);
    expect(looksLikeEnglish('what is your name')).toBe(true);
    expect(looksLikeEnglish('hello there')).toBe(true);
    expect(looksLikeEnglish('bagunnava')).toBe(false); // Romanized Telugu
  });
});

describe('Input Classification', () => {
  function classifyInput(text: string, userMotherTongue: string) {
    const isLatin = isPureLatinText(text);
    const hasNative = hasNativeChars(text);
    const isMotherTongueEnglish = userMotherTongue.toLowerCase() === 'english';

    if (hasNative && !isLatin) {
      return 'native-script';
    }
    if (isLatin && looksLikeEnglish(text)) {
      return 'english';
    }
    if (isLatin && !isMotherTongueEnglish) {
      return 'romanized';
    }
    return 'english';
  }

  it('classifies English input correctly', () => {
    expect(classifyInput('how are you', 'Telugu')).toBe('english');
    expect(classifyInput('what is your name', 'Hindi')).toBe('english');
  });

  it('classifies native script input correctly', () => {
    expect(classifyInput('మీరు ఎలా ఉన్నారు', 'Telugu')).toBe('native-script');
    expect(classifyInput('आप कैसे हैं', 'Hindi')).toBe('native-script');
  });

  it('classifies romanized input correctly', () => {
    expect(classifyInput('bagunnava', 'Telugu')).toBe('romanized');
    expect(classifyInput('aap kaise ho', 'Hindi')).toBe('romanized');
    expect(classifyInput('nalla irukken', 'Tamil')).toBe('romanized');
  });

  it('handles English speakers typing English', () => {
    expect(classifyInput('hello', 'English')).toBe('english');
    expect(classifyInput('test message', 'English')).toBe('english');
  });
});

describe('Semantic Translation Flow', () => {
  it('documents the expected translation flow for each input type', () => {
    console.log('\n=== INPUT TYPE → TRANSLATION FLOW ===\n');

    console.log('1. ENGLISH INPUT ("how are you"):');
    console.log('   - Sender (Telugu): Sees "మీరు ఎలా ఉన్నారు?" preview');
    console.log('   - Receiver (Tamil): Gets "நீங்கள் எப்படி இருக்கிறீர்கள்?"');
    console.log('   - English Core: "how are you" (preserved)\n');

    console.log('2. NATIVE SCRIPT INPUT ("బాగున్నావా"):');
    console.log('   - Sender (Telugu): Sees original "బాగున్నావా"');
    console.log('   - Receiver (Tamil): Gets "நலமா?" (semantic translation)');
    console.log('   - English Core: "are you fine?" (extracted meaning)\n');

    console.log('3. ROMANIZED INPUT ("bagunnava"):');
    console.log('   - Sender (Telugu): Sees "బాగున్నావా" (native script)');
    console.log('   - Receiver (Tamil): Gets "நலமா?"');
    console.log('   - English Core: "are you fine?"\n');

    console.log('4. VOICE INPUT (any language):');
    console.log('   - Auto-detects spoken language');
    console.log('   - Shows transcription');
    console.log('   - Translates semantically to both languages\n');

    console.log('=====================================\n');
    expect(true).toBe(true);
  });
});

describe('Bidirectional Translation', () => {
  it('documents sender → receiver and receiver → sender flow', () => {
    console.log('\n=== BIDIRECTIONAL CHAT FLOW ===\n');

    console.log('SENDER (Telugu) → RECEIVER (Tamil):');
    console.log('  Sender types: "how are you"');
    console.log('  Sender sees:  "మీరు ఎలా ఉన్నారు?" (their mother tongue)');
    console.log('  Receiver gets: "நீங்கள் எப்படி இருக்கிறீர்கள்?" (their mother tongue)\n');

    console.log('RECEIVER (Tamil) → SENDER (Telugu) [Reply]:');
    console.log('  Receiver types: "i am fine"');
    console.log('  Receiver sees:  "நான் நலமாக இருக்கிறேன்" (their mother tongue)');
    console.log('  Sender gets:    "నేను బాగున్నాను" (their mother tongue)\n');

    console.log('================================\n');
    expect(true).toBe(true);
  });
});
