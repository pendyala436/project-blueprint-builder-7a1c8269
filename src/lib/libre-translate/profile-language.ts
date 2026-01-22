/**
 * Profile Language Service
 * =========================
 * 
 * Fetches mother tongue (primary_language) from user profiles in Supabase.
 * Uses caching to minimize database calls.
 */

import { supabase } from '@/integrations/supabase/client';

// Cache for user languages to avoid repeated DB calls
const languageCache = new Map<string, { language: string; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

/**
 * Get user's mother tongue (primary_language) from their profile
 * Falls back to preferred_language if primary is not set
 */
export async function getUserMotherTongue(userId: string): Promise<string> {
  // Check cache first
  const cached = languageCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.language;
  }

  try {
    // Try main profiles table first
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ProfileLanguage] Error fetching profile:', error);
    }

    if (profile) {
      const language = profile.primary_language || profile.preferred_language || 'english';
      languageCache.set(userId, { language, timestamp: Date.now() });
      return language;
    }

    // Fallback: check male_profiles
    const { data: maleProfile } = await supabase
      .from('male_profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .maybeSingle();

    if (maleProfile) {
      const language = maleProfile.primary_language || maleProfile.preferred_language || 'english';
      languageCache.set(userId, { language, timestamp: Date.now() });
      return language;
    }

    // Fallback: check female_profiles
    const { data: femaleProfile } = await supabase
      .from('female_profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .maybeSingle();

    if (femaleProfile) {
      const language = femaleProfile.primary_language || femaleProfile.preferred_language || 'english';
      languageCache.set(userId, { language, timestamp: Date.now() });
      return language;
    }

    // Default fallback
    return 'english';
  } catch (err) {
    console.error('[ProfileLanguage] Exception:', err);
    return 'english';
  }
}

/**
 * Get mother tongues for both sender and receiver
 * Returns cached values when available for efficiency
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
 * Prefetch and cache languages for multiple users
 * Useful when loading chat lists
 */
export async function prefetchUserLanguages(userIds: string[]): Promise<void> {
  const uncachedIds = userIds.filter(id => {
    const cached = languageCache.get(id);
    return !cached || Date.now() - cached.timestamp >= CACHE_TTL;
  });

  if (uncachedIds.length === 0) return;

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, primary_language, preferred_language')
      .in('user_id', uncachedIds);

    if (profiles) {
      profiles.forEach(p => {
        const language = p.primary_language || p.preferred_language || 'english';
        languageCache.set(p.user_id, { language, timestamp: Date.now() });
      });
    }
  } catch (err) {
    console.error('[ProfileLanguage] Prefetch error:', err);
  }
}

/**
 * Clear cached language for a user (e.g., after profile update)
 */
export function invalidateUserLanguageCache(userId: string): void {
  languageCache.delete(userId);
}

/**
 * Clear all cached languages
 */
export function clearLanguageCache(): void {
  languageCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getLanguageCacheStats(): { size: number } {
  return { size: languageCache.size };
}
