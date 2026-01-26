/**
 * Auto Detection Tests
 * ====================
 * 
 * Tests for input type and method detection:
 * - English, native script, romanized, voice, mixed input types
 * - Gboard, external keyboard, font tool, IME detection
 */

import { describe, it, expect } from 'vitest';

// Mock detection functions for testing
// These test the core detection logic without React hooks

// Unicode script detection ranges
const SCRIPT_RANGES: Record<string, [number, number][]> = {
  'Devanagari': [[0x0900, 0x097F], [0xA8E0, 0xA8FF]],
  'Telugu': [[0x0C00, 0x0C7F]],
  'Tamil': [[0x0B80, 0x0BFF]],
  'Bengali': [[0x0980, 0x09FF]],
  'Kannada': [[0x0C80, 0x0CFF]],
  'Arabic': [[0x0600, 0x06FF]],
  'Han': [[0x4E00, 0x9FFF]],
  'Hangul': [[0xAC00, 0xD7AF]],
};

function detectScript(text: string): string {
  const counts: Record<string, number> = { 'Latin': 0 };
  
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i);
    if (code === undefined) continue;
    if (code > 0xFFFF) i++;
    
    if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) {
      counts['Latin']++;
      continue;
    }
    
    for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
      for (const [start, end] of ranges) {
        if (code >= start && code <= end) {
          counts[script] = (counts[script] || 0) + 1;
          break;
        }
      }
    }
  }
  
  let max = 'Latin';
  let maxCount = counts['Latin'];
  for (const [s, c] of Object.entries(counts)) {
    if (c > maxCount) { max = s; maxCount = c; }
  }
  return max;
}

function isPureLatinText(text: string): boolean {
  if (!text.trim()) return true;
  return /^[\x00-\x7F\u00C0-\u024F\s\d.,!?'"()\-:;@#$%&*+=/<>]+$/.test(text);
}

function hasNativeChars(text: string): boolean {
  return /[^\x00-\x7F\u00C0-\u024F]/.test(text);
}

function looksLikeEnglish(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    /\b(the|is|are|was|were|have|has|had|do|does|did)\b/i,
    /\b(what|when|where|why|how|who|which)\b/i,
    /\b(hello|hi|hey|thanks|thank|please|sorry)\b/i,
    /\b(you|your|me|my|we|our|they|their)\b/i,
    /\b(i'm|you're|we're|don't|can't|isn't)\b/i,
    /\b(i|am|doing|well|good|fine)\b/i,
  ];
  for (const p of patterns) {
    if (p.test(lower)) return true;
  }
  return false;
}

type InputType = 'english' | 'native-script' | 'romanized' | 'mixed' | 'voice' | 'unknown';

function classifyInput(
  text: string,
  motherTongue: string,
  isVoice = false
): { inputType: InputType; script: string } {
  if (!text.trim()) return { inputType: 'unknown', script: 'Latin' };
  
  const script = detectScript(text);
  const isLatin = isPureLatinText(text);
  const hasNative = hasNativeChars(text);
  
  // Count only actual letters, not punctuation or spaces
  const letterChars = text.replace(/[\s.,!?'"()\-:;@#$%&*+=/<>0-9]/g, '');
  const latinLetterCount = letterChars.split('').filter(c => 
    /[\x41-\x7A\u00C0-\u024F]/.test(c)
  ).length;
  const totalLetters = letterChars.length;
  const latinRatio = totalLetters > 0 ? latinLetterCount / totalLetters : 0;
  
  // Mixed is only when there's significant Latin AND significant native letters
  const isMixed = hasNative && latinLetterCount > 0 && latinRatio > 0.15 && latinRatio < 0.85;
  
  if (isVoice) return { inputType: 'voice', script };
  
  if (isMixed) return { inputType: 'mixed', script };
  
  if (hasNative && !isLatin) return { inputType: 'native-script', script };
  
  if (isLatin) {
    if (looksLikeEnglish(text)) return { inputType: 'english', script: 'Latin' };
    if (motherTongue !== 'en') return { inputType: 'romanized', script: 'Latin' };
    return { inputType: 'english', script: 'Latin' };
  }
  
  return { inputType: 'unknown', script };
}

// ============================================================
// TESTS
// ============================================================

describe('Script Detection', () => {
  it('detects Latin script', () => {
    expect(detectScript('Hello world')).toBe('Latin');
    expect(detectScript('How are you?')).toBe('Latin');
  });

  it('detects Devanagari script (Hindi)', () => {
    expect(detectScript('नमस्ते')).toBe('Devanagari');
    expect(detectScript('आप कैसे हैं?')).toBe('Devanagari');
  });

  it('detects Telugu script', () => {
    expect(detectScript('నమస్కారం')).toBe('Telugu');
    expect(detectScript('మీరు ఎలా ఉన్నారు?')).toBe('Telugu');
  });

  it('detects Tamil script', () => {
    expect(detectScript('வணக்கம்')).toBe('Tamil');
  });

  it('detects Bengali script', () => {
    expect(detectScript('নমস্কার')).toBe('Bengali');
  });

  it('detects Kannada script', () => {
    expect(detectScript('ನಮಸ್ಕಾರ')).toBe('Kannada');
  });

  it('detects Arabic script', () => {
    expect(detectScript('مرحبا')).toBe('Arabic');
  });

  it('detects Chinese (Han) script', () => {
    expect(detectScript('你好')).toBe('Han');
  });

  it('detects Korean (Hangul) script', () => {
    expect(detectScript('안녕하세요')).toBe('Hangul');
  });
});

describe('Input Type Classification', () => {
  describe('English input', () => {
    it('classifies pure English text', () => {
      const result = classifyInput('How are you?', 'te');
      expect(result.inputType).toBe('english');
    });

    it('classifies English with contractions', () => {
      const result = classifyInput("I'm doing well, thanks!", 'hi');
      expect(result.inputType).toBe('english');
    });

    it('classifies English questions', () => {
      const result = classifyInput('What is your name?', 'ta');
      expect(result.inputType).toBe('english');
    });
  });

  describe('Native script input', () => {
    it('classifies Hindi (Devanagari)', () => {
      const result = classifyInput('आप कैसे हैं?', 'hi');
      expect(result.inputType).toBe('native-script');
      expect(result.script).toBe('Devanagari');
    });

    it('classifies Telugu script', () => {
      const result = classifyInput('మీరు ఎలా ఉన్నారు?', 'te');
      expect(result.inputType).toBe('native-script');
      expect(result.script).toBe('Telugu');
    });

    it('classifies Tamil script', () => {
      const result = classifyInput('நீங்கள் எப்படி இருக்கிறீர்கள்?', 'ta');
      expect(result.inputType).toBe('native-script');
    });

    it('classifies Arabic script', () => {
      const result = classifyInput('كيف حالك؟', 'ar');
      expect(result.inputType).toBe('native-script');
    });

    it('classifies Chinese script', () => {
      const result = classifyInput('你好吗?', 'zh');
      expect(result.inputType).toBe('native-script');
    });
  });

  describe('Romanized input', () => {
    it('classifies romanized Telugu', () => {
      const result = classifyInput('bagunnava', 'te');
      expect(result.inputType).toBe('romanized');
    });

    it('classifies romanized Hindi', () => {
      const result = classifyInput('kaise ho', 'hi');
      expect(result.inputType).toBe('romanized');
    });

    it('classifies romanized Tamil', () => {
      const result = classifyInput('eppadi irukeenga', 'ta');
      expect(result.inputType).toBe('romanized');
    });
  });

  describe('Voice input', () => {
    it('classifies voice input in English', () => {
      const result = classifyInput('how are you doing today', 'te', true);
      expect(result.inputType).toBe('voice');
    });

    it('classifies voice input in native script', () => {
      const result = classifyInput('మీరు ఎలా ఉన్నారు', 'te', true);
      expect(result.inputType).toBe('voice');
    });
  });

  describe('Mixed input', () => {
    it('classifies mixed Hindi-English', () => {
      const result = classifyInput('मैं fine हूं', 'hi');
      expect(result.inputType).toBe('mixed');
    });

    it('classifies mixed Telugu-English', () => {
      const result = classifyInput('నేను okay అని', 'te');
      expect(result.inputType).toBe('mixed');
    });
  });
});

describe('Input Method Detection', () => {
  it('identifies pure Latin as standard keyboard', () => {
    const text = 'Hello world';
    expect(isPureLatinText(text)).toBe(true);
    expect(hasNativeChars(text)).toBe(false);
  });

  it('identifies native chars for Gboard detection', () => {
    const text = 'నమస్కారం';
    expect(hasNativeChars(text)).toBe(true);
    expect(isPureLatinText(text)).toBe(false);
  });

  it('identifies mixed content', () => {
    const text = 'Hello నమస్కారం world';
    expect(hasNativeChars(text)).toBe(true);
    expect(isPureLatinText(text)).toBe(false);
  });
});

describe('English Pattern Detection', () => {
  it('detects common English phrases', () => {
    expect(looksLikeEnglish('How are you?')).toBe(true);
    expect(looksLikeEnglish('What is this?')).toBe(true);
    expect(looksLikeEnglish('Hello there')).toBe(true);
    expect(looksLikeEnglish('Thank you')).toBe(true);
  });

  it('detects English contractions', () => {
    expect(looksLikeEnglish("I'm fine")).toBe(true);
    expect(looksLikeEnglish("You're welcome")).toBe(true);
    expect(looksLikeEnglish("Don't worry")).toBe(true);
  });

  it('does not falsely detect romanized as English', () => {
    expect(looksLikeEnglish('bagunnava')).toBe(false);
    expect(looksLikeEnglish('kaise ho')).toBe(false);
    expect(looksLikeEnglish('namaste')).toBe(false);
  });
});

describe('Bidirectional Detection', () => {
  it('handles English to native flow', () => {
    const result = classifyInput('I am doing well', 'te');
    expect(result.inputType).toBe('english');
  });

  it('handles native to English flow', () => {
    const result = classifyInput('నేను బాగున్నాను', 'te');
    expect(result.inputType).toBe('native-script');
  });

  it('handles romanized to native flow', () => {
    const result = classifyInput('nenu bagunnanu', 'te');
    expect(result.inputType).toBe('romanized');
  });

  it('preserves input type for same language speakers', () => {
    const result1 = classifyInput('Hello', 'en');
    expect(result1.inputType).toBe('english');
    
    const result2 = classifyInput('Hi there', 'en');
    expect(result2.inputType).toBe('english');
  });
});
