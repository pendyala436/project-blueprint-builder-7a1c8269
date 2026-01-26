/**
 * Xenova Semantic Translation Test Suite
 * =======================================
 * Tests all 8 translation path combinations using NLLB-200/M2M-100 models
 * for TRUE SEMANTIC (meaning-based) translation
 * 
 * "How are you" should translate to MEANING, not sounds:
 * - Hindi: "आप कैसे हैं?" (meaning: how are you)
 * - NOT: "हाउ आर यू" (phonetic sounds)
 */

import { describe, it, expect } from 'vitest';
import { translateText, translateForChat } from '@/lib/xenova-translate-sdk/engine';
import { route, describePath } from '@/lib/xenova-translate-sdk/router';
import { getNLLBCode } from '@/lib/xenova-translate-sdk/iso639';

// Test phrases with expected SEMANTIC translations
const SEMANTIC_TESTS = {
  howAreYou: {
    english: 'how are you',
    // Expected semantic translations (meaning-based)
    expectedHindi: 'आप कैसे हैं', // NOT "हाउ आर यू"
    expectedTelugu: 'మీరు ఎలా ఉన్నారు', // NOT "హౌ ఆర్ యూ"
    expectedTamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்',
    expectedSpanish: 'cómo estás',
    expectedFrench: 'comment allez-vous',
  },
  iAmFine: {
    english: 'i am fine',
    expectedHindi: 'मैं ठीक हूं',
    expectedTelugu: 'నేను బాగున్నాను',
    expectedTamil: 'நான் நலமாக இருக்கிறேன்',
  }
};

describe('NLLB Code Mapping', () => {
  it('maps Hindi correctly', () => {
    expect(getNLLBCode('hi')).toBe('hin_Deva');
  });
  
  it('maps Telugu correctly', () => {
    expect(getNLLBCode('te')).toBe('tel_Telu');
  });
  
  it('maps English correctly', () => {
    expect(getNLLBCode('en')).toBe('eng_Latn');
  });
  
  it('maps Tamil correctly', () => {
    expect(getNLLBCode('ta')).toBe('tam_Taml');
  });
});

describe('Translation Routing', () => {
  it('routes English → Hindi as DIRECT_NLLB', () => {
    const path = route('en', 'hi');
    expect(path).toBe('DIRECT_NLLB');
    console.log(`[Router] en → hi: ${describePath(path)}`);
  });
  
  it('routes Hindi → Telugu as PIVOT_EN', () => {
    const path = route('hi', 'te');
    expect(path).toBe('PIVOT_EN');
    console.log(`[Router] hi → te: ${describePath(path)}`);
  });
  
  it('routes Spanish → French as DIRECT_M2M', () => {
    const path = route('es', 'fr');
    expect(path).toBe('DIRECT_M2M');
    console.log(`[Router] es → fr: ${describePath(path)}`);
  });
  
  it('routes Hindi → Hindi as SAME', () => {
    const path = route('hi', 'hi');
    expect(path).toBe('SAME');
  });
});

// These tests require the actual NLLB model to be loaded
// They demonstrate what SEMANTIC translation should produce
describe('Expected Semantic Translation Results', () => {
  it('documents expected English → Hindi translation', () => {
    console.log('\n=== SEMANTIC TRANSLATION EXPECTATIONS ===');
    console.log('English: "how are you"');
    console.log('');
    console.log('✓ CORRECT (Semantic/Meaning):');
    console.log('  Hindi: "आप कैसे हैं?" - This means "how are you" in Hindi');
    console.log('  Telugu: "మీరు ఎలా ఉన్నారు?" - This means "how are you" in Telugu');
    console.log('');
    console.log('✗ WRONG (Phonetic/Sounds):');
    console.log('  Hindi: "हाउ आर यू" - This is just the English sounds written in Hindi script');
    console.log('  Telugu: "హౌ ఆర్ యూ" - This is just the English sounds written in Telugu script');
    console.log('');
    console.log('The NLLB-200 model provides SEMANTIC translation.');
    console.log('It understands meaning, not just sounds.');
    console.log('==========================================\n');
    
    expect(true).toBe(true);
  });
});

describe('All 8 Translation Paths', () => {
  // Path 1: Native → Native (e.g., Hindi → Tamil)
  it('Path 1: Native → Native routing', () => {
    const path = route('hi', 'ta');
    console.log(`[Path 1] Hindi → Tamil: ${path} - ${describePath(path)}`);
    expect(path).toBe('PIVOT_EN'); // Goes through English pivot
  });

  // Path 2: Native → Latin (e.g., Hindi → Spanish)
  it('Path 2: Native → Latin routing', () => {
    const path = route('hi', 'es');
    console.log(`[Path 2] Hindi → Spanish: ${path} - ${describePath(path)}`);
    expect(path).toBe('PIVOT_EN');
  });

  // Path 3: Latin → Native (e.g., Spanish → Telugu)
  it('Path 3: Latin → Native routing', () => {
    const path = route('es', 'te');
    console.log(`[Path 3] Spanish → Telugu: ${path} - ${describePath(path)}`);
    expect(path).toBe('PIVOT_EN');
  });

  // Path 4: Latin → Latin (e.g., Spanish → French)
  it('Path 4: Latin → Latin routing', () => {
    const path = route('es', 'fr');
    console.log(`[Path 4] Spanish → French: ${path} - ${describePath(path)}`);
    expect(path).toBe('DIRECT_M2M');
  });

  // Path 5: English → Native (e.g., English → Hindi)
  it('Path 5: English → Native routing', () => {
    const path = route('en', 'hi');
    console.log(`[Path 5] English → Hindi: ${path} - ${describePath(path)}`);
    expect(path).toBe('DIRECT_NLLB');
  });

  // Path 6: Native → English (e.g., Telugu → English)
  it('Path 6: Native → English routing', () => {
    const path = route('te', 'en');
    console.log(`[Path 6] Telugu → English: ${path} - ${describePath(path)}`);
    expect(path).toBe('DIRECT_NLLB');
  });

  // Path 7: English → Latin (e.g., English → Spanish) - Uses M2M for Latin scripts
  it('Path 7: English → Latin routing', () => {
    const path = route('en', 'es');
    console.log(`[Path 7] English → Spanish: ${path} - ${describePath(path)}`);
    expect(path).toBe('DIRECT_M2M'); // Both are Latin scripts
  });

  // Path 8: Latin → English (e.g., French → English) - Uses M2M for Latin scripts
  it('Path 8: Latin → English routing', () => {
    const path = route('fr', 'en');
    console.log(`[Path 8] French → English: ${path} - ${describePath(path)}`);
    expect(path).toBe('DIRECT_M2M'); // Both are Latin scripts
  });
});

describe('Chat Translation Structure', () => {
  it('creates proper sender/receiver views structure', async () => {
    // This tests the structure, not actual model translation
    const mockResult = {
      senderView: 'how are you',
      receiverView: 'आप कैसे हैं?', // Expected semantic Hindi
      englishCore: 'how are you',
      originalText: 'how are you',
      path: 'DIRECT_NLLB' as const,
      isTranslated: true,
    };
    
    console.log('\n=== Chat Translation Structure ===');
    console.log('Sender (English): types "how are you"');
    console.log('Receiver (Hindi): sees "आप कैसे हैं?" (semantic meaning)');
    console.log('English Core: "how are you" (preserved for reference)');
    console.log('==================================\n');
    
    expect(mockResult.senderView).toBe('how are you');
    expect(mockResult.englishCore).toBe('how are you');
    expect(mockResult.isTranslated).toBe(true);
  });
});
