/**
 * Language Grammar Rules
 * =======================
 * 
 * Database-driven grammar rules.
 * All grammar data is loaded from Supabase - no hardcoded data.
 */

import type { LanguageGrammar, WordOrder } from './types';
import { 
  loadGrammarRules, 
  getGrammarRule, 
  getWordOrderForLanguage,
} from './database-loader';

// ============================================================
// DEFAULT GRAMMAR (Used when database data not available)
// ============================================================

const DEFAULT_GRAMMAR: LanguageGrammar = {
  code: 'en',
  name: 'Default',
  wordOrder: 'SVO',
  hasGender: false,
  hasArticles: false,
  adjectivePosition: 'before',
  usesPostpositions: false,
  subjectDropping: false,
  hasCases: false,
  hasHonorific: false,
};

// ============================================================
// GRAMMAR LOOKUP FUNCTIONS (Database-driven)
// ============================================================

/**
 * Get grammar rules for a language
 */
export function getLanguageGrammar(language: string): LanguageGrammar {
  const grammar = getGrammarRule(language);
  return grammar || DEFAULT_GRAMMAR;
}

/**
 * Get word order for a language
 */
export function getWordOrder(language: string): WordOrder {
  return getWordOrderForLanguage(language);
}

/**
 * Check if reordering is needed between two languages
 */
export function needsReordering(sourceLanguage: string, targetLanguage: string): boolean {
  const sourceOrder = getWordOrder(sourceLanguage);
  const targetOrder = getWordOrder(targetLanguage);
  return sourceOrder !== targetOrder;
}

/**
 * Check if language uses SOV word order
 */
export function isSOVLanguage(language: string): boolean {
  return getWordOrder(language) === 'SOV';
}

/**
 * Check if language uses VSO word order
 */
export function isVSOLanguage(language: string): boolean {
  return getWordOrder(language) === 'VSO';
}

/**
 * Check if adjectives come after nouns
 */
export function adjectiveFollowsNoun(language: string): boolean {
  const grammar = getLanguageGrammar(language);
  return grammar.adjectivePosition === 'after';
}

/**
 * Alias for adjectiveFollowsNoun for backward compatibility
 */
export function adjectivesAfterNouns(language: string): boolean {
  return adjectiveFollowsNoun(language);
}

/**
 * Check if language uses postpositions
 */
export function usesPostpositions(language: string): boolean {
  const grammar = getLanguageGrammar(language);
  return grammar.usesPostpositions;
}

/**
 * Check if language has grammatical gender
 */
export function hasGrammaticalGender(language: string): boolean {
  const grammar = getLanguageGrammar(language);
  return grammar.hasGender;
}

/**
 * Check if language uses cases
 */
export function hasCaseSystem(language: string): boolean {
  const grammar = getLanguageGrammar(language);
  return grammar.hasCases;
}

/**
 * Check if language allows subject dropping (pro-drop)
 */
export function allowsSubjectDropping(language: string): boolean {
  const grammar = getLanguageGrammar(language);
  return grammar.subjectDropping;
}

/**
 * Initialize grammar rules from database
 */
export async function initializeGrammarRules(): Promise<void> {
  await loadGrammarRules();
}

// Re-export types
export type { LanguageGrammar, WordOrder };
