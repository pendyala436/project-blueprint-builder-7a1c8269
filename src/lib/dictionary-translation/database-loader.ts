/**
 * Database Loader for Dictionary Translation
 * ============================================
 * 
 * Loads translation data from Supabase database.
 * No hardcoded data - everything comes from the database.
 */

import { supabase } from '@/integrations/supabase/client';
import type { IdiomEntry, LanguageGrammar, WordOrder } from './types';

// ============================================================
// CACHE MANAGEMENT
// ============================================================

interface LoadState {
  loaded: boolean;
  loading: boolean;
  lastUpdate: number;
}

const idiomCache = new Map<string, IdiomEntry>();
const grammarCache = new Map<string, LanguageGrammar>();
const wordSenseCache = new Map<string, Array<{
  senseId: string;
  meaning: string;
  contextClues: string[];
  translations: Record<string, string>;
}>>();

const loadState: Record<string, LoadState> = {
  idioms: { loaded: false, loading: false, lastUpdate: 0 },
  grammar: { loaded: false, loading: false, lastUpdate: 0 },
  wordSenses: { loaded: false, loading: false, lastUpdate: 0 },
};

const CACHE_TTL = 300000; // 5 minutes

// ============================================================
// IDIOM LOADING
// ============================================================

export async function loadIdioms(): Promise<void> {
  if (loadState.idioms.loading) return;
  if (loadState.idioms.loaded && Date.now() - loadState.idioms.lastUpdate < CACHE_TTL) return;
  
  loadState.idioms.loading = true;
  
  try {
    const { data, error } = await supabase
      .from('translation_idioms')
      .select('*')
      .limit(5000);
    
    if (error) {
      console.warn('[DatabaseLoader] Failed to load idioms:', error);
      loadState.idioms.loading = false;
      return;
    }
    
    if (data) {
      idiomCache.clear();
      data.forEach((row: any) => {
        const entry: IdiomEntry = {
          phrase: row.phrase,
          normalizedPhrase: row.normalized_phrase,
          meaning: row.meaning,
          translations: row.translations || {},
          category: row.category || 'idiom',
          register: row.register || 'neutral',
        };
        idiomCache.set(entry.normalizedPhrase.toLowerCase(), entry);
      });
      console.log(`[DatabaseLoader] Loaded ${idiomCache.size} idioms from database`);
    }
    
    loadState.idioms.loaded = true;
    loadState.idioms.lastUpdate = Date.now();
  } catch (err) {
    console.warn('[DatabaseLoader] Error loading idioms:', err);
  } finally {
    loadState.idioms.loading = false;
  }
}

export function getIdiom(phrase: string): IdiomEntry | null {
  return idiomCache.get(phrase.toLowerCase().trim()) || null;
}

export function getAllIdioms(): IdiomEntry[] {
  return Array.from(idiomCache.values());
}

export function findIdiomInText(text: string): { idiom: IdiomEntry; start: number; end: number } | null {
  const lowerText = text.toLowerCase();
  for (const [normalized, entry] of idiomCache) {
    const idx = lowerText.indexOf(normalized);
    if (idx !== -1) {
      return { idiom: entry, start: idx, end: idx + normalized.length };
    }
  }
  return null;
}

// ============================================================
// GRAMMAR RULES LOADING
// ============================================================

export async function loadGrammarRules(): Promise<void> {
  if (loadState.grammar.loading) return;
  if (loadState.grammar.loaded && Date.now() - loadState.grammar.lastUpdate < CACHE_TTL) return;
  
  loadState.grammar.loading = true;
  
  try {
    const { data, error } = await supabase
      .from('translation_grammar_rules')
      .select('*');
    
    if (error) {
      console.warn('[DatabaseLoader] Failed to load grammar rules:', error);
      loadState.grammar.loading = false;
      return;
    }
    
    if (data) {
      grammarCache.clear();
      data.forEach((row: any) => {
        const entry: LanguageGrammar = {
          code: row.language_code,
          name: row.language_name,
          wordOrder: (row.word_order || 'SVO') as WordOrder,
          hasGender: row.has_gender || false,
          hasArticles: row.has_articles || false,
          adjectivePosition: row.adjective_position || 'before',
          usesPostpositions: row.uses_postpositions || false,
          subjectDropping: row.subject_dropping || false,
          hasCases: row.has_cases || false,
          hasHonorific: row.has_honorific || false,
          sentenceEndParticle: row.sentence_end_particle,
        };
        grammarCache.set(row.language_code.toLowerCase(), entry);
        // Also index by language name
        grammarCache.set(row.language_name.toLowerCase(), entry);
      });
      console.log(`[DatabaseLoader] Loaded ${grammarCache.size / 2} grammar rules from database`);
    }
    
    loadState.grammar.loaded = true;
    loadState.grammar.lastUpdate = Date.now();
  } catch (err) {
    console.warn('[DatabaseLoader] Error loading grammar rules:', err);
  } finally {
    loadState.grammar.loading = false;
  }
}

export function getGrammarRule(language: string): LanguageGrammar | null {
  return grammarCache.get(language.toLowerCase().trim()) || null;
}

export function getWordOrderForLanguage(language: string): WordOrder {
  const grammar = getGrammarRule(language);
  return grammar?.wordOrder || 'SVO';
}

// ============================================================
// WORD SENSE LOADING
// ============================================================

export async function loadWordSenses(): Promise<void> {
  if (loadState.wordSenses.loading) return;
  if (loadState.wordSenses.loaded && Date.now() - loadState.wordSenses.lastUpdate < CACHE_TTL) return;
  
  loadState.wordSenses.loading = true;
  
  try {
    const { data, error } = await supabase
      .from('translation_word_senses')
      .select('*');
    
    if (error) {
      console.warn('[DatabaseLoader] Failed to load word senses:', error);
      loadState.wordSenses.loading = false;
      return;
    }
    
    if (data) {
      wordSenseCache.clear();
      data.forEach((row: any) => {
        const word = row.word.toLowerCase();
        const sense = {
          senseId: row.sense_id,
          meaning: row.meaning,
          contextClues: row.context_clues || [],
          translations: row.translations || {},
        };
        
        if (!wordSenseCache.has(word)) {
          wordSenseCache.set(word, []);
        }
        wordSenseCache.get(word)!.push(sense);
      });
      console.log(`[DatabaseLoader] Loaded word senses for ${wordSenseCache.size} words from database`);
    }
    
    loadState.wordSenses.loaded = true;
    loadState.wordSenses.lastUpdate = Date.now();
  } catch (err) {
    console.warn('[DatabaseLoader] Error loading word senses:', err);
  } finally {
    loadState.wordSenses.loading = false;
  }
}

export function getWordSenses(word: string): Array<{
  senseId: string;
  meaning: string;
  contextClues: string[];
  translations: Record<string, string>;
}> | null {
  return wordSenseCache.get(word.toLowerCase().trim()) || null;
}

export function isAmbiguousWordFromDB(word: string): boolean {
  const senses = wordSenseCache.get(word.toLowerCase().trim());
  return senses !== null && senses !== undefined && senses.length > 1;
}

// ============================================================
// INITIALIZATION
// ============================================================

let initPromise: Promise<void> | null = null;

export async function initializeDatabaseTranslation(): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    console.log('[DatabaseLoader] Initializing dictionary translation data...');
    
    await Promise.all([
      loadIdioms(),
      loadGrammarRules(),
      loadWordSenses(),
    ]);
    
    console.log('[DatabaseLoader] Dictionary translation data initialized');
  })();
  
  return initPromise;
}

export function isDataLoaded(): boolean {
  return loadState.idioms.loaded && loadState.grammar.loaded && loadState.wordSenses.loaded;
}

export function getLoadStatus(): Record<string, boolean> {
  return {
    idioms: loadState.idioms.loaded,
    grammar: loadState.grammar.loaded,
    wordSenses: loadState.wordSenses.loaded,
  };
}

// ============================================================
// REFRESH DATA
// ============================================================

export async function refreshAllData(): Promise<void> {
  loadState.idioms.loaded = false;
  loadState.grammar.loaded = false;
  loadState.wordSenses.loaded = false;
  initPromise = null;
  
  await initializeDatabaseTranslation();
}
