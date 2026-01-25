/**
 * Profile-Aware Translation Service
 * ===================================
 * 
 * Integrates user profiles with the translation engine.
 * Fetches mother tongue from user profiles and applies bidirectional translation.
 * 
 * OFFLINE ONLY - NO EXTERNAL APIs - NO NLLB-200 - NO HARDCODING
 * Uses English as semantic bridge between all languages
 * Supports ALL 1000+ languages from languages.ts
 */

import { supabase } from '@/integrations/supabase/client';
import { languages, type Language } from '@/data/languages';
import {
  translate,
  translateForChat,
  generateLivePreview,
  getInstantPreview,
  getEnglishMeaning,
  normalizeLanguage,
  isEnglish,
  isLatinScript,
  isSameLanguage,
  isRTL,
  initializeEngine,
  isEngineReady,
  type LibreTranslateResult,
  type BidirectionalMessage,
  type LivePreview,
} from './libre-translate-engine';

// ============================================================
// TYPES
// ============================================================

export interface UserLanguageProfile {
  userId: string;
  motherTongue: string;          // Primary language from profile
  preferredLanguage?: string;    // Fallback language
  scriptType: 'native' | 'latin';
  gender?: 'male' | 'female';
}

export interface ChatParticipants {
  sender: UserLanguageProfile;
  receiver: UserLanguageProfile;
}

export interface ProfileTranslationResult extends LibreTranslateResult {
  senderProfile: UserLanguageProfile;
  receiverProfile?: UserLanguageProfile;
}

export interface ProfileChatMessage extends BidirectionalMessage {
  senderProfile: UserLanguageProfile;
  receiverProfile: UserLanguageProfile;
}

// ============================================================
// LANGUAGE CACHE - Avoids repeated DB calls
// ============================================================

const languageCache = new Map<string, { language: string; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

function getCachedLanguage(userId: string): string | null {
  const cached = languageCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.language;
  }
  return null;
}

function setCachedLanguage(userId: string, language: string): void {
  languageCache.set(userId, { language, timestamp: Date.now() });
}

export function invalidateLanguageCache(userId: string): void {
  languageCache.delete(userId);
}

export function clearLanguageCache(): void {
  languageCache.clear();
}

// ============================================================
// LANGUAGE DATABASE - Built from languages.ts (1000+ languages)
// ============================================================

interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
}

const languageByName = new Map<string, LanguageInfo>();
const languageByCode = new Map<string, LanguageInfo>();
const languageByNativeName = new Map<string, LanguageInfo>();

// Initialize from languages.ts
function initializeLanguageDatabase(): void {
  languages.forEach((lang: Language) => {
    const info: LanguageInfo = {
      code: lang.code.toLowerCase(),
      name: lang.name.toLowerCase(),
      nativeName: lang.nativeName,
      script: lang.script || 'Latin',
      rtl: lang.rtl || false,
    };
    
    languageByName.set(info.name, info);
    languageByCode.set(info.code, info);
    languageByNativeName.set(lang.nativeName.toLowerCase(), info);
  });
  
  console.log(`[ProfileTranslation] Loaded ${languageByName.size} languages from languages.ts`);
}

// Initialize on module load
initializeLanguageDatabase();

// ============================================================
// PROFILE LANGUAGE FETCHING
// ============================================================

/**
 * Get user's mother tongue from their profile
 * Checks profiles, male_profiles, and female_profiles tables
 * Falls back to 'english' if not found
 */
export async function getUserMotherTongue(userId: string): Promise<string> {
  // Check cache first
  const cached = getCachedLanguage(userId);
  if (cached) return cached;
  
  try {
    // Try main profiles table first
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && profile) {
      const language = normalizeLanguage(
        profile.primary_language || profile.preferred_language || 'english'
      );
      setCachedLanguage(userId, language);
      return language;
    }
    
    // Fallback: check male_profiles
    const { data: maleProfile } = await supabase
      .from('male_profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (maleProfile) {
      const language = normalizeLanguage(
        maleProfile.primary_language || maleProfile.preferred_language || 'english'
      );
      setCachedLanguage(userId, language);
      return language;
    }
    
    // Fallback: check female_profiles
    const { data: femaleProfile } = await supabase
      .from('female_profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (femaleProfile) {
      const language = normalizeLanguage(
        femaleProfile.primary_language || femaleProfile.preferred_language || 'english'
      );
      setCachedLanguage(userId, language);
      return language;
    }
    
    // Default fallback
    return 'english';
  } catch (err) {
    console.error('[ProfileTranslation] Error fetching profile language:', err);
    return 'english';
  }
}

/**
 * Get mother tongues for both sender and receiver
 */
export async function getChatParticipantLanguages(
  senderId: string,
  receiverId: string
): Promise<{ senderLanguage: string; receiverLanguage: string }> {
  const [senderLanguage, receiverLanguage] = await Promise.all([
    getUserMotherTongue(senderId),
    getUserMotherTongue(receiverId),
  ]);
  
  return { senderLanguage, receiverLanguage };
}

/**
 * Create a user language profile from userId
 */
export async function createUserProfile(userId: string): Promise<UserLanguageProfile> {
  const motherTongue = await getUserMotherTongue(userId);
  const scriptType = isLatinScript(motherTongue) ? 'latin' : 'native';
  
  return {
    userId,
    motherTongue,
    scriptType,
  };
}

/**
 * Create chat participants from user IDs
 */
export async function createChatParticipants(
  senderId: string,
  receiverId: string
): Promise<ChatParticipants> {
  const [sender, receiver] = await Promise.all([
    createUserProfile(senderId),
    createUserProfile(receiverId),
  ]);
  
  return { sender, receiver };
}

// ============================================================
// PROFILE-AWARE TRANSLATION
// ============================================================

/**
 * Translate text using sender's profile language
 */
export async function translateWithProfile(
  text: string,
  senderId: string,
  targetLanguage: string
): Promise<ProfileTranslationResult> {
  const senderProfile = await createUserProfile(senderId);
  const result = await translate(text, senderProfile.motherTongue, targetLanguage);
  
  return {
    ...result,
    senderProfile,
  };
}

/**
 * Translate text between two users using their profile languages
 */
export async function translateBetweenUsers(
  text: string,
  senderId: string,
  receiverId: string
): Promise<ProfileTranslationResult> {
  const { sender, receiver } = await createChatParticipants(senderId, receiverId);
  const result = await translate(text, sender.motherTongue, receiver.motherTongue);
  
  return {
    ...result,
    senderProfile: sender,
    receiverProfile: receiver,
  };
}

/**
 * Process chat message for bidirectional display
 * Uses both sender and receiver profile languages
 */
export async function processChatMessage(
  input: string,
  senderId: string,
  receiverId: string
): Promise<ProfileChatMessage> {
  const { sender, receiver } = await createChatParticipants(senderId, receiverId);
  const message = await translateForChat(input, sender.motherTongue, receiver.motherTongue);
  
  return {
    ...message,
    senderProfile: sender,
    receiverProfile: receiver,
  };
}

/**
 * Generate live preview using profile languages
 */
export async function generateProfileLivePreview(
  input: string,
  senderId: string,
  receiverId: string
): Promise<LivePreview> {
  const { senderLanguage, receiverLanguage } = await getChatParticipantLanguages(
    senderId,
    receiverId
  );
  
  return generateLivePreview(input, senderLanguage, receiverLanguage);
}

/**
 * Get instant preview in user's mother tongue
 */
export async function getProfileInstantPreview(
  text: string,
  userId: string
): Promise<string> {
  const motherTongue = await getUserMotherTongue(userId);
  return getInstantPreview(text, motherTongue);
}

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

/**
 * Get language info by name, code, or native name
 */
export function getLanguageInfo(lang: string): LanguageInfo | null {
  const normalized = lang.toLowerCase().trim();
  
  return (
    languageByName.get(normalized) ||
    languageByCode.get(normalized) ||
    languageByNativeName.get(normalized) ||
    null
  );
}

/**
 * Get all supported languages
 */
export function getAllSupportedLanguages(): LanguageInfo[] {
  return Array.from(languageByName.values());
}

/**
 * Get supported language count
 */
export function getSupportedLanguageCount(): number {
  return languageByName.size;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(lang: string): boolean {
  return getLanguageInfo(lang) !== null;
}

/**
 * Get language script type
 */
export function getLanguageScript(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.script || 'Latin';
}

/**
 * Check if language is RTL
 */
export function isLanguageRTL(lang: string): boolean {
  const info = getLanguageInfo(lang);
  return info?.rtl || false;
}

// ============================================================
// ENGINE INITIALIZATION
// ============================================================

export async function initializeProfileTranslation(): Promise<void> {
  if (!isEngineReady()) {
    await initializeEngine();
  }
  console.log(`[ProfileTranslation] Ready with ${getSupportedLanguageCount()} languages`);
}

export { isEngineReady };

// ============================================================
// RE-EXPORTS for convenience
// ============================================================

export {
  translate,
  translateForChat,
  generateLivePreview,
  getInstantPreview,
  getEnglishMeaning,
  normalizeLanguage,
  isEnglish,
  isLatinScript,
  isSameLanguage,
  isRTL,
} from './libre-translate-engine';
