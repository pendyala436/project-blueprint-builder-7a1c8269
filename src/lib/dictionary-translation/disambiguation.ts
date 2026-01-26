/**
 * Word Sense Disambiguation (WSD) Module
 * =======================================
 * 
 * Database-driven word sense disambiguation.
 * All disambiguation data is loaded from Supabase - no hardcoded data.
 */

import type { DisambiguationContext } from './types';
import { 
  loadWordSenses, 
  getWordSenses, 
  isAmbiguousWordFromDB,
  initializeDatabaseTranslation,
} from './database-loader';

// ============================================================
// DISAMBIGUATION FUNCTIONS (Database-driven)
// ============================================================

/**
 * Check if a word is ambiguous (has multiple senses)
 */
export function isAmbiguousWord(word: string): boolean {
  return isAmbiguousWordFromDB(word);
}

/**
 * Get all senses for a word
 */
export function getWordSenseData(word: string): Array<{
  senseId: string;
  meaning: string;
  contextClues: string[];
  translations: Record<string, string>;
}> | null {
  return getWordSenses(word);
}

/**
 * Disambiguate a word based on context
 */
export function disambiguateWord(
  word: string,
  context: DisambiguationContext
): { senseId: string; translation: string | null; confidence: number } | null {
  const senses = getWordSenses(word);
  if (!senses || senses.length === 0) return null;
  
  // If only one sense, return it with high confidence
  if (senses.length === 1) {
    return {
      senseId: senses[0].senseId,
      translation: null,
      confidence: 0.9,
    };
  }
  
  // Build context text for matching
  const contextText = [
    ...context.surroundingWords,
    context.sentence,
    context.previousSentence || '',
  ].join(' ').toLowerCase();
  
  // Score each sense based on context clues
  const scores: Array<{ sense: typeof senses[0]; score: number }> = [];
  
  for (const sense of senses) {
    let score = 0;
    
    // Check how many context clues match
    for (const clue of sense.contextClues) {
      if (contextText.includes(clue.toLowerCase())) {
        score += 1;
      }
    }
    
    // Domain bonus if specified
    if (context.domain) {
      const domainKeywords: Record<string, string[]> = {
        sports: ['game', 'player', 'team', 'score', 'win', 'lose', 'ball', 'match'],
        finance: ['money', 'account', 'payment', 'bank', 'credit', 'loan', 'deposit'],
        casual: ['friend', 'chat', 'fun', 'like', 'love', 'hi', 'hello'],
        food: ['eat', 'food', 'taste', 'cook', 'restaurant', 'meal', 'dish'],
        weather: ['rain', 'sun', 'cold', 'hot', 'weather', 'temperature', 'climate'],
      };
      
      const keywords = domainKeywords[context.domain] || [];
      if (keywords.some(k => contextText.includes(k))) {
        if (sense.contextClues.some(c => keywords.includes(c.toLowerCase()))) {
          score += 2;
        }
      }
    }
    
    scores.push({ sense, score });
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  // If no context clues matched, return first sense as default
  if (scores[0].score === 0) {
    return {
      senseId: senses[0].senseId,
      translation: null,
      confidence: 0.5,
    };
  }
  
  const topSense = scores[0];
  const confidence = Math.min(0.95, 0.5 + (topSense.score * 0.1));
  
  return {
    senseId: topSense.sense.senseId,
    translation: null,
    confidence,
  };
}

/**
 * Get translation for a specific word sense
 */
export function getTranslationForSense(
  word: string,
  senseId: string,
  targetLanguage: string
): string | null {
  const senses = getWordSenses(word);
  if (!senses) return null;
  
  const sense = senses.find(s => s.senseId === senseId);
  if (!sense) return null;
  
  const langKey = targetLanguage.toLowerCase();
  return sense.translations[langKey] || null;
}

/**
 * Disambiguate and translate a word in one step
 */
export function disambiguateAndTranslate(
  word: string,
  context: DisambiguationContext,
  targetLanguage: string
): { translation: string; senseId: string; confidence: number } | null {
  const result = disambiguateWord(word, context);
  if (!result) return null;
  
  const translation = getTranslationForSense(word, result.senseId, targetLanguage);
  if (!translation) return null;
  
  return {
    translation,
    senseId: result.senseId,
    confidence: result.confidence,
  };
}

/**
 * Get list of all ambiguous words in cache
 */
export function getAllAmbiguousWords(): string[] {
  // This would require exposing the cache keys from database-loader
  // For now, return empty array - the database is the source of truth
  return [];
}

/**
 * Initialize word sense data from database
 */
export async function initializeWordSenses(): Promise<void> {
  await loadWordSenses();
}
