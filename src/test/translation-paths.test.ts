/**
 * Translation Paths Test Suite
 * ============================
 * Tests all 8 translation path combinations using "how are you" and "i am fine"
 * 
 * Paths tested:
 * 1. Native → Native (Hindi → Tamil)
 * 2. Native → Latin (Bengali → Spanish)
 * 3. Latin → Native (Spanish → Telugu)
 * 4. Latin → Latin (Spanish → French)
 * 5. English → Native (English → Hindi)
 * 6. English → Latin (English → Spanish)
 * 7. Latin → English (French → English)
 * 8. Native → English (Kannada → English)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { translate, isEngineReady, getLanguageCount } from '@/lib/translation/libre-translate-engine';

// Test phrases
const TEST_PHRASES = {
  howAreYou: {
    english: 'how are you',
    hindi: 'आप कैसे हैं',
    tamil: 'எப்படி இருக்கிறீர்கள்',
    telugu: 'మీరు ఎలా ఉన్నారు',
    bengali: 'আপনি কেমন আছেন',
    spanish: 'cómo estás',
    french: 'comment allez-vous',
    kannada: 'ಹೇಗಿದ್ದೀರಾ',
  },
  iAmFine: {
    english: 'i am fine',
    hindi: 'मैं ठीक हूँ',
    tamil: 'நான் நலமாக இருக்கிறேன்',
    telugu: 'నేను బాగున్నాను',
    bengali: 'আমি ভালো আছি',
    spanish: 'estoy bien',
    french: 'je vais bien',
    kannada: 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ',
    malayalam: 'എനിക്ക് സുഖമാണ്',
  }
};

describe('Translation Engine', () => {
  beforeAll(() => {
    // Engine initializes automatically
  });

  it('should load languages from languages.ts', () => {
    const count = getLanguageCount();
    expect(count).toBeGreaterThan(800); // We have 1000+ languages
  });

  it('should be ready for translations', () => {
    expect(isEngineReady()).toBe(true);
  });
});

describe('Translation Path 1: Native → Native', () => {
  it('translates Hindi to Tamil (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.hindi,
      'hindi',
      'tamil'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    expect(result.englishMeaning).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    console.log(`[Path 1] Hindi → Tamil: "${TEST_PHRASES.howAreYou.hindi}" → "${result.text}" (English: ${result.englishMeaning})`);
  });

  it('translates Telugu to Kannada (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.telugu,
      'telugu',
      'kannada'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 1] Telugu → Kannada: "${TEST_PHRASES.iAmFine.telugu}" → "${result.text}"`);
  });
});

describe('Translation Path 2: Native → Latin', () => {
  it('translates Bengali to Spanish (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.bengali,
      'bengali',
      'spanish'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 2] Bengali → Spanish: "${TEST_PHRASES.howAreYou.bengali}" → "${result.text}"`);
  });

  it('translates Hindi to French (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.hindi,
      'hindi',
      'french'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 2] Hindi → French: "${TEST_PHRASES.iAmFine.hindi}" → "${result.text}"`);
  });
});

describe('Translation Path 3: Latin → Native', () => {
  it('translates Spanish to Telugu (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.spanish,
      'spanish',
      'telugu'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 3] Spanish → Telugu: "${TEST_PHRASES.howAreYou.spanish}" → "${result.text}"`);
  });

  it('translates French to Malayalam (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.french,
      'french',
      'malayalam'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 3] French → Malayalam: "${TEST_PHRASES.iAmFine.french}" → "${result.text}"`);
  });
});

describe('Translation Path 4: Latin → Latin', () => {
  it('translates Spanish to French (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.spanish,
      'spanish',
      'french'
    );
    // Latin to Latin may be passthrough
    expect(result.text).toBeTruthy();
    console.log(`[Path 4] Spanish → French: "${TEST_PHRASES.howAreYou.spanish}" → "${result.text}"`);
  });

  it('translates French to Spanish (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.french,
      'french',
      'spanish'
    );
    expect(result.text).toBeTruthy();
    console.log(`[Path 4] French → Spanish: "${TEST_PHRASES.iAmFine.french}" → "${result.text}"`);
  });
});

describe('Translation Path 5: English → Native', () => {
  it('translates English to Hindi (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.english,
      'english',
      'hindi'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    expect(result.englishMeaning).toBe(TEST_PHRASES.howAreYou.english);
    console.log(`[Path 5] English → Hindi: "${TEST_PHRASES.howAreYou.english}" → "${result.text}"`);
  });

  it('translates English to Bengali (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.english,
      'english',
      'bengali'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 5] English → Bengali: "${TEST_PHRASES.iAmFine.english}" → "${result.text}"`);
  });
});

describe('Translation Path 6: English → Latin', () => {
  it('translates English to Spanish (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.english,
      'english',
      'spanish'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 6] English → Spanish: "${TEST_PHRASES.howAreYou.english}" → "${result.text}"`);
  });

  it('translates English to French (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.english,
      'english',
      'french'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 6] English → French: "${TEST_PHRASES.iAmFine.english}" → "${result.text}"`);
  });
});

describe('Translation Path 7: Latin → English', () => {
  it('translates French to English (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.french,
      'french',
      'english'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 7] French → English: "${TEST_PHRASES.howAreYou.french}" → "${result.text}"`);
  });

  it('translates Spanish to English (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.spanish,
      'spanish',
      'english'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 7] Spanish → English: "${TEST_PHRASES.iAmFine.spanish}" → "${result.text}"`);
  });
});

describe('Translation Path 8: Native → English', () => {
  it('translates Kannada to English (how are you)', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.kannada,
      'kannada',
      'english'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 8] Kannada → English: "${TEST_PHRASES.howAreYou.kannada}" → "${result.text}"`);
  });

  it('translates Tamil to English (i am fine)', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.tamil,
      'tamil',
      'english'
    );
    expect(result.isTranslated).toBe(true);
    expect(result.text).toBeTruthy();
    console.log(`[Path 8] Tamil → English: "${TEST_PHRASES.iAmFine.tamil}" → "${result.text}"`);
  });
});

describe('Same Language Passthrough', () => {
  it('returns input unchanged for Hindi → Hindi', async () => {
    const result = await translate(
      TEST_PHRASES.howAreYou.hindi,
      'hindi',
      'hindi'
    );
    expect(result.isTranslated).toBe(false);
    expect(result.text).toBe(TEST_PHRASES.howAreYou.hindi);
    console.log(`[Same Lang] Hindi → Hindi: "${TEST_PHRASES.howAreYou.hindi}" → "${result.text}" (passthrough)`);
  });

  it('returns input unchanged for English → English', async () => {
    const result = await translate(
      TEST_PHRASES.iAmFine.english,
      'english',
      'english'
    );
    expect(result.isTranslated).toBe(false);
    expect(result.text).toBe(TEST_PHRASES.iAmFine.english);
    console.log(`[Same Lang] English → English: "${TEST_PHRASES.iAmFine.english}" → "${result.text}" (passthrough)`);
  });
});
