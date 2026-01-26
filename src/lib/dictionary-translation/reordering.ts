/**
 * Sentence Reordering Module
 * ==========================
 * 
 * Handles word order transformations between languages with different
 * syntactic structures (SVO, SOV, VSO, etc.)
 */

import type { Token, SentenceChunk, WordOrder } from './types';
import { getWordOrder, getLanguageGrammar, adjectivesAfterNouns } from './grammar-rules';
import { detectPOS, getLemma } from './morphology';

// ============================================================
// TOKENIZATION
// ============================================================

/**
 * Tokenize text into words with basic POS tagging
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  // Split keeping punctuation and whitespace
  const segments = text.split(/(\s+|[.,!?;:'"()\[\]{}])/);
  
  let index = 0;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    
    const isWord = /^[a-zA-ZÀ-ÿ\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u4E00-\u9FFF]+$/u.test(segment);
    
    const context = {
      previous: segments[i - 2],
      next: segments[i + 2],
    };
    
    const pos = isWord ? detectPOS(segment, context) : 'unknown';
    const lemma = isWord ? getLemma(segment, pos) : segment;
    
    tokens.push({
      text: segment,
      normalized: segment.toLowerCase(),
      pos,
      lemma,
      features: {},
      index,
      isWord,
    });
    
    index++;
  }
  
  return tokens;
}

/**
 * Identify subject, verb, object in a simple sentence
 */
export function identifySVO(tokens: Token[]): { subject?: Token; verb?: Token; object?: Token } {
  let subject: Token | undefined;
  let verb: Token | undefined;
  let object: Token | undefined;
  
  const wordTokens = tokens.filter(t => t.isWord);
  
  // Simple heuristic: first noun/pronoun is subject, first verb after is verb, noun after verb is object
  for (const token of wordTokens) {
    if (!subject && (token.pos === 'noun' || token.pos === 'pronoun')) {
      subject = token;
    } else if (subject && !verb && token.pos === 'verb') {
      verb = token;
    } else if (verb && !object && token.pos === 'noun') {
      object = token;
    }
  }
  
  return { subject, verb, object };
}

// ============================================================
// REORDERING FUNCTIONS
// ============================================================

/**
 * Reorder tokens from SVO to SOV
 * Example: "I love cats" -> "I cats love"
 */
export function reorderSVOtoSOV(tokens: Token[]): Token[] {
  const { subject, verb, object } = identifySVO(tokens);
  
  if (!subject || !verb) {
    return tokens; // Can't reorder without subject and verb
  }
  
  const result: Token[] = [];
  let verbInserted = false;
  
  for (const token of tokens) {
    // Skip the verb initially
    if (token === verb) {
      continue;
    }
    
    result.push(token);
    
    // Insert verb after object (or at end if no object)
    if (token === object && !verbInserted) {
      result.push(verb);
      verbInserted = true;
    }
  }
  
  // If verb wasn't inserted (no object), add at end
  if (!verbInserted) {
    // Find last word position
    const lastWordIndex = result.map((t, i) => t.isWord ? i : -1).filter(i => i >= 0).pop() || result.length - 1;
    result.splice(lastWordIndex + 1, 0, verb);
  }
  
  return result;
}

/**
 * Reorder tokens from SOV to SVO
 * Example: "I cats love" -> "I love cats"
 */
export function reorderSOVtoSVO(tokens: Token[]): Token[] {
  // For SOV, verb is at end - move it after subject
  const wordTokens = tokens.filter(t => t.isWord);
  
  // Find verb (typically last or near-last word token in SOV)
  let verbIndex = -1;
  for (let i = wordTokens.length - 1; i >= 0; i--) {
    if (wordTokens[i].pos === 'verb') {
      verbIndex = tokens.indexOf(wordTokens[i]);
      break;
    }
  }
  
  if (verbIndex === -1) return tokens;
  
  // Find subject (first noun/pronoun)
  let subjectIndex = -1;
  for (const token of tokens) {
    if (token.pos === 'noun' || token.pos === 'pronoun') {
      subjectIndex = tokens.indexOf(token);
      break;
    }
  }
  
  if (subjectIndex === -1 || subjectIndex >= verbIndex) return tokens;
  
  const result = [...tokens];
  const [verb] = result.splice(verbIndex, 1);
  
  // Insert after subject and its modifiers
  let insertPos = subjectIndex + 1;
  while (insertPos < result.length && result[insertPos].pos === 'adjective') {
    insertPos++;
  }
  
  result.splice(insertPos, 0, verb);
  return result;
}

/**
 * Reorder tokens from SVO to VSO
 * Example: "I love cats" -> "love I cats"
 */
export function reorderSVOtoVSO(tokens: Token[]): Token[] {
  const { verb } = identifySVO(tokens);
  if (!verb) return tokens;
  
  const verbIndex = tokens.indexOf(verb);
  const result = [...tokens];
  const [verbToken] = result.splice(verbIndex, 1);
  
  // Insert verb at beginning (after any initial punctuation/whitespace)
  let insertPos = 0;
  while (insertPos < result.length && !result[insertPos].isWord) {
    insertPos++;
  }
  
  result.splice(insertPos, 0, verbToken);
  return result;
}

/**
 * Move adjectives after nouns (for languages like Spanish, French)
 */
export function moveAdjectivesAfterNouns(tokens: Token[]): Token[] {
  const result: Token[] = [];
  let i = 0;
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    // Check if this is an adjective followed by a noun
    if (token.pos === 'adjective' && i + 1 < tokens.length) {
      // Look ahead for noun (skipping whitespace)
      let nounIndex = i + 1;
      while (nounIndex < tokens.length && !tokens[nounIndex].isWord) {
        result.push(tokens[nounIndex]);
        nounIndex++;
      }
      
      if (nounIndex < tokens.length && tokens[nounIndex].pos === 'noun') {
        // Swap: put noun before adjective
        result.push(tokens[nounIndex]);
        result.push({ ...token, text: ' ' + token.text }); // Add space before adjective
        i = nounIndex + 1;
        continue;
      }
    }
    
    result.push(token);
    i++;
  }
  
  return result;
}

/**
 * Move adjectives before nouns (for languages like English, German)
 */
export function moveAdjectivesBeforeNouns(tokens: Token[]): Token[] {
  const result: Token[] = [];
  let i = 0;
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    // Check if this is a noun followed by an adjective
    if (token.pos === 'noun' && i + 1 < tokens.length) {
      // Look ahead for adjective (skipping whitespace)
      let adjIndex = i + 1;
      while (adjIndex < tokens.length && !tokens[adjIndex].isWord) {
        adjIndex++;
      }
      
      if (adjIndex < tokens.length && tokens[adjIndex].pos === 'adjective') {
        // Swap: put adjective before noun
        result.push(tokens[adjIndex]);
        result.push({ ...token, text: ' ' + token.text });
        i = adjIndex + 1;
        continue;
      }
    }
    
    result.push(token);
    i++;
  }
  
  return result;
}

// ============================================================
// MAIN REORDERING FUNCTION
// ============================================================

/**
 * Reorder sentence from source language structure to target language structure
 */
export function reorderSentence(
  tokens: Token[],
  sourceLanguage: string,
  targetLanguage: string
): Token[] {
  const sourceOrder = getWordOrder(sourceLanguage);
  const targetOrder = getWordOrder(targetLanguage);
  
  // If same word order, no reordering needed
  if (sourceOrder === targetOrder) {
    let result = tokens;
    
    // But still handle adjective placement
    const sourceAdjAfter = adjectivesAfterNouns(sourceLanguage);
    const targetAdjAfter = adjectivesAfterNouns(targetLanguage);
    
    if (sourceAdjAfter !== targetAdjAfter) {
      result = targetAdjAfter ? moveAdjectivesAfterNouns(result) : moveAdjectivesBeforeNouns(result);
    }
    
    return result;
  }
  
  let result = tokens;
  
  // Apply word order transformation
  if (sourceOrder === 'SVO' && targetOrder === 'SOV') {
    result = reorderSVOtoSOV(result);
  } else if (sourceOrder === 'SOV' && targetOrder === 'SVO') {
    result = reorderSOVtoSVO(result);
  } else if (sourceOrder === 'SVO' && targetOrder === 'VSO') {
    result = reorderSVOtoVSO(result);
  }
  // Add more transformations as needed
  
  // Handle adjective placement
  const targetAdjAfter = adjectivesAfterNouns(targetLanguage);
  if (targetAdjAfter) {
    result = moveAdjectivesAfterNouns(result);
  }
  
  return result;
}

/**
 * Convert tokens back to string
 */
export function tokensToString(tokens: Token[]): string {
  return tokens.map(t => t.text).join('');
}

/**
 * Reorder text string
 */
export function reorderText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): { text: string; wasReordered: boolean } {
  const sourceOrder = getWordOrder(sourceLanguage);
  const targetOrder = getWordOrder(targetLanguage);
  
  if (sourceOrder === targetOrder && adjectivesAfterNouns(sourceLanguage) === adjectivesAfterNouns(targetLanguage)) {
    return { text, wasReordered: false };
  }
  
  const tokens = tokenize(text);
  const reordered = reorderSentence(tokens, sourceLanguage, targetLanguage);
  const result = tokensToString(reordered);
  
  return {
    text: result,
    wasReordered: result !== text,
  };
}

/**
 * Split complex sentence into simpler chunks
 */
export function chunkSentence(text: string): string[] {
  // Split on common subordinating conjunctions and punctuation
  const delimiters = /(?:,\s*(?:which|who|that|when|where|while|although|because|if|unless|until|since|after|before))|(?:[.;!?])/gi;
  
  const chunks = text.split(delimiters).filter(chunk => chunk.trim().length > 0);
  
  if (chunks.length === 0) {
    return [text];
  }
  
  return chunks.map(c => c.trim());
}

/**
 * Reconstruct sentence from chunks
 */
export function reconstructFromChunks(chunks: string[], connector: string = ' '): string {
  return chunks.join(connector);
}
