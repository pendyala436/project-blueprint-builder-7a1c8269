import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  isIndianLanguage, 
  getNLLB200Code, 
  INDIAN_NLLB200_LANGUAGES, 
  NON_INDIAN_NLLB200_LANGUAGES,
  ALL_NLLB200_LANGUAGES 
} from '@/data/nllb200Languages';

// Super user balance bypass is handled at the database level via RPC functions

export interface MatchableUser {
  userId: string;
  fullName: string;
  age: number | null;
  photoUrl: string | null;
  motherTongue: string;
  languageCode: string | null;
  country: string | null;
  isOnline: boolean;
  isBusy: boolean;
  currentChatCount: number;
  walletBalance: number;
  hasRecharged: boolean;
  isSameLanguage: boolean;
  isNllbSupported: boolean;
  requiresTranslation: boolean;
  isEarningEligible: boolean;
}

export interface MatchingResult {
  sameLanguageUsers: MatchableUser[];
  translatedUsers: MatchableUser[];
  allUsers: MatchableUser[];
  requiresTranslation: boolean;
}

export interface MatchingConfig {
  userLanguage: string;
  userCountry: string;
  userGender: 'male' | 'female';
  requireWalletBalance?: boolean;
}

/**
 * Core Matching Service Hook
 * 
 * Implements the matching rules:
 * 1. Language-Based Matching:
 *    - When a user selects a language, show users speaking same language
 *    - Users must be: Online, Freely available, Load-balanced
 * 2. Fallback for non-Indian users:
 *    - If no same-language users available, auto-connect to NLLB-200 Indian users
 * 3. Auto-Translation:
 *    - If source == target language: No translation
 *    - If source != target: Enable NLLB-200 auto-translation
 */
export const useMatchingService = () => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check if a language is supported by NLLB-200
   */
  const isNllbSupported = useCallback((languageName: string): boolean => {
    const normalizedName = languageName.toLowerCase().trim();
    return ALL_NLLB200_LANGUAGES.some(
      lang => lang.name.toLowerCase() === normalizedName
    );
  }, []);

  /**
   * Determine if translation is required between two languages
   */
  const requiresTranslation = useCallback((sourceLanguage: string, targetLanguage: string): boolean => {
    const normalizedSource = sourceLanguage.toLowerCase().trim();
    const normalizedTarget = targetLanguage.toLowerCase().trim();
    
    // Same language = no translation needed
    if (normalizedSource === normalizedTarget) {
      return false;
    }
    
    // Different languages = translation required
    return true;
  }, []);

  /**
   * Fetch available women for male dashboard
   * Implements: Language matching + NLLB fallback for non-Indian men
   */
  const fetchMatchableWomen = useCallback(async (config: MatchingConfig): Promise<MatchingResult> => {
    setIsLoading(true);
    
    try {
      const { userLanguage, userCountry } = config;
      const isUserIndian = userCountry.toLowerCase() === 'india';
      const userHasIndianLanguage = isIndianLanguage(userLanguage);

      // Get all NLLB language names for filtering
      const nllbLanguageNames = new Set(
        ALL_NLLB200_LANGUAGES.map(l => l.name.toLowerCase())
      );
      const indianLanguageNames = new Set(
        INDIAN_NLLB200_LANGUAGES.map(l => l.name.toLowerCase())
      );

      // Fetch online women
      const { data: onlineStatuses } = await supabase
        .from("user_status")
        .select("user_id, last_seen")
        .eq("is_online", true);

      if (!onlineStatuses || onlineStatuses.length === 0) {
        return { sameLanguageUsers: [], translatedUsers: [], allUsers: [], requiresTranslation: false };
      }

      const onlineUserIds = onlineStatuses.map(s => s.user_id);

      // Fetch female profiles with earning eligibility
      const { data: femaleProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, country, primary_language, preferred_language, age, ai_approved, approval_status, is_earning_eligible")
        .in("user_id", onlineUserIds)
        .eq("gender", "Female")
        .eq("approval_status", "approved");

      if (!femaleProfiles || femaleProfiles.length === 0) {
        return { sameLanguageUsers: [], translatedUsers: [], allUsers: [], requiresTranslation: false };
      }

      const femaleUserIds = femaleProfiles.map(p => p.user_id);

      // Fetch availability, wallets, and languages in parallel
      const [availabilityData, walletsData, languagesData] = await Promise.all([
        supabase.from("women_availability").select("user_id, is_available, current_chat_count, max_concurrent_chats").in("user_id", femaleUserIds),
        supabase.from("wallets").select("user_id, balance").in("user_id", femaleUserIds),
        supabase.from("user_languages").select("user_id, language_name, language_code").in("user_id", femaleUserIds)
      ]);

      const availabilityMap = new Map(availabilityData.data?.map(a => [a.user_id, a]) || []);
      const walletMap = new Map(walletsData.data?.map(w => [w.user_id, Number(w.balance)]) || []);
      const languageMap = new Map(languagesData.data?.map(l => [l.user_id, { name: l.language_name, code: l.language_code }]) || []);

      const sameLanguageUsers: MatchableUser[] = [];
      const translatedUsers: MatchableUser[] = [];

      for (const profile of femaleProfiles) {
        const langData = languageMap.get(profile.user_id);
        const womanLanguage = langData?.name || profile.primary_language || profile.preferred_language || "Unknown";
        const languageCode = langData?.code || getNLLB200Code(womanLanguage);
        
        const availability = availabilityMap.get(profile.user_id);
        const walletBalance = walletMap.get(profile.user_id) || 0;
        
        // Check availability
        const isBusy = availability 
          ? availability.current_chat_count >= availability.max_concurrent_chats 
          : false;
        const isAvailable = availability?.is_available !== false;

        // Skip unavailable or busy users
        if (!isAvailable || isBusy) continue;

        // Check language compatibility
        const isSameLanguage = womanLanguage.toLowerCase() === userLanguage.toLowerCase();
        const isWomanNllbSupported = nllbLanguageNames.has(womanLanguage.toLowerCase());
        const needsTranslation = requiresTranslation(userLanguage, womanLanguage);

        const user: MatchableUser = {
          userId: profile.user_id,
          fullName: profile.full_name || "Anonymous",
          age: profile.age,
          photoUrl: profile.photo_url,
          motherTongue: womanLanguage,
          languageCode,
          country: profile.country,
          isOnline: true,
          isBusy,
          currentChatCount: availability?.current_chat_count || 0,
          walletBalance,
          hasRecharged: walletBalance > 0,
          isSameLanguage,
          isNllbSupported: isWomanNllbSupported,
          requiresTranslation: needsTranslation,
          isEarningEligible: profile.is_earning_eligible || false,
        };

        // STRICT LANGUAGE MATCHING: Only show same-language users
        // If user speaks Malayalam, show ONLY Malayalam speakers - NOT Telugu/Hindi/etc
        if (isSameLanguage) {
          sameLanguageUsers.push(user);
        }
        // NOTE: Removed cross-language matching - users must speak the same language
      }

      // Sort: Badged (earning eligible) women first, then by load balancing
      const sortByBadgeAndLoad = (a: MatchableUser, b: MatchableUser) => {
        // First: earning eligible (badged) women on top
        if (a.isEarningEligible !== b.isEarningEligible) {
          return a.isEarningEligible ? -1 : 1;
        }
        // Second: by chat count (lower first = less load)
        return a.currentChatCount - b.currentChatCount;
      };

      sameLanguageUsers.sort(sortByBadgeAndLoad);

      // STRICT: Only return same-language users - no cross-language matching
      return {
        sameLanguageUsers,
        translatedUsers: [], // No cross-language matching
        allUsers: sameLanguageUsers, // Only same language
        requiresTranslation: false // Never requires translation - same language only
      };
    } catch (error) {
      console.error("Error in fetchMatchableWomen:", error);
      return { sameLanguageUsers: [], translatedUsers: [], allUsers: [], requiresTranslation: false };
    } finally {
      setIsLoading(false);
    }
  }, [requiresTranslation]);

  /**
   * Fetch available men for female dashboard
   * Shows men who have recharged wallet and speak NLLB-200 supported language
   * Uses only real authenticated users from database - no sample/mock data
   */
  const fetchMatchableMen = useCallback(async (config: MatchingConfig): Promise<MatchingResult> => {
    setIsLoading(true);
    
    try {
      const { userLanguage } = config;

      // Get all NLLB language names
      const nllbLanguageNames = new Set(
        ALL_NLLB200_LANGUAGES.map(l => l.name.toLowerCase())
      );

      // Fetch online men from user_status
      const { data: onlineStatuses } = await supabase
        .from("user_status")
        .select("user_id, last_seen")
        .eq("is_online", true);

      const matchableMen: MatchableUser[] = [];

      // Process only real authenticated users
      if (onlineStatuses && onlineStatuses.length > 0) {
        const onlineUserIds = onlineStatuses.map(s => s.user_id);

        // Fetch male profiles with photos
        const { data: maleProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, country, primary_language, preferred_language, age")
          .in("user_id", onlineUserIds)
          .or("gender.eq.male,gender.eq.Male")
          .not("photo_url", "is", null)
          .neq("photo_url", "");

        if (maleProfiles && maleProfiles.length > 0) {
          const maleUserIds = maleProfiles.map(p => p.user_id);

          // Fetch wallets, languages, and active chat counts in parallel
          const [walletsData, languagesData, chatCountsData] = await Promise.all([
            supabase.from("wallets").select("user_id, balance").in("user_id", maleUserIds),
            supabase.from("user_languages").select("user_id, language_name, language_code").in("user_id", maleUserIds),
            supabase.from("active_chat_sessions").select("man_user_id").in("man_user_id", maleUserIds).eq("status", "active")
          ]);

          const walletMap = new Map(walletsData.data?.map(w => [w.user_id, Number(w.balance)]) || []);
          const languageMap = new Map(languagesData.data?.map(l => [l.user_id, { name: l.language_name, code: l.language_code }]) || []);
          
          // Count active chats per man
          const chatCountMap = new Map<string, number>();
          chatCountsData.data?.forEach(chat => {
            const count = chatCountMap.get(chat.man_user_id) || 0;
            chatCountMap.set(chat.man_user_id, count + 1);
          });

          for (const profile of maleProfiles) {
            const langData = languageMap.get(profile.user_id);
            const manLanguage = langData?.name || profile.primary_language || profile.preferred_language || "Unknown";
            const languageCode = langData?.code || getNLLB200Code(manLanguage);
            const walletBalance = walletMap.get(profile.user_id) || 0;
            const currentChatCount = chatCountMap.get(profile.user_id) || 0;

            // Skip users without NLLB-200 supported language
            if (!nllbLanguageNames.has(manLanguage.toLowerCase())) continue;

            // Skip users without wallet balance (unless super user - handled on connection)
            // Regular users must have recharged
            if (walletBalance <= 0) continue;

            // Skip users who are already at max chats (3)
            if (currentChatCount >= 3) continue;

            // STRICT LANGUAGE MATCHING: Only show same-language users
            const isSameLanguage = manLanguage.toLowerCase() === userLanguage.toLowerCase();
            
            // Skip users who don't speak the same language
            if (!isSameLanguage) continue;

            matchableMen.push({
              userId: profile.user_id,
              fullName: profile.full_name || "Anonymous",
              age: profile.age,
              photoUrl: profile.photo_url,
              motherTongue: manLanguage,
              languageCode,
              country: profile.country,
              isOnline: true,
              isBusy: currentChatCount >= 3,
              currentChatCount,
              walletBalance,
              hasRecharged: walletBalance > 0,
              isSameLanguage: true, // Always true now
              isNllbSupported: nllbLanguageNames.has(manLanguage.toLowerCase()),
              requiresTranslation: false, // Never - same language only
              isEarningEligible: false,
            });
          }
        }
      }

      // Note: Only real authenticated users are shown - no sample/mock data
      // STRICT: All users are same-language (filtered above)

      const sortByPriority = (a: MatchableUser, b: MatchableUser) => {
        // First by availability (fewer chats = more available)
        if (a.currentChatCount !== b.currentChatCount) {
          return a.currentChatCount - b.currentChatCount;
        }
        // Then by wallet balance (higher first - more serious users)
        return b.walletBalance - a.walletBalance;
      };

      matchableMen.sort(sortByPriority);

      // STRICT: Only return same-language users
      return {
        sameLanguageUsers: matchableMen,
        translatedUsers: [], // No cross-language matching
        allUsers: matchableMen,
        requiresTranslation: false
      };
    } catch (error) {
      console.error("Error in fetchMatchableMen:", error);
      return { sameLanguageUsers: [], translatedUsers: [], allUsers: [], requiresTranslation: false };
    } finally {
      setIsLoading(false);
    }
  }, [requiresTranslation]);

  /**
   * Find best available match with load balancing
   */
  const findBestMatch = useCallback(async (
    config: MatchingConfig,
    excludeUserIds: string[] = []
  ): Promise<MatchableUser | null> => {
    const result = config.userGender === 'male' 
      ? await fetchMatchableWomen(config)
      : await fetchMatchableMen(config);

    const availableUsers = result.allUsers.filter(
      u => !u.isBusy && !excludeUserIds.includes(u.userId)
    );

    if (availableUsers.length === 0) return null;

    // Return user with lowest load (already sorted)
    return availableUsers[0];
  }, [fetchMatchableWomen, fetchMatchableMen]);

  return {
    isLoading,
    isNllbSupported,
    requiresTranslation,
    fetchMatchableWomen,
    fetchMatchableMen,
    findBestMatch,
  };
};

export default useMatchingService;
