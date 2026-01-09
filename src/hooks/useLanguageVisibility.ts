/**
 * useLanguageVisibility Hook
 * 
 * Implements language-based visibility rules for men viewing women.
 * 
 * VISIBILITY RULES:
 * 1. Woman must be online
 * 2. Woman must have passed AI verification
 * 3. Woman must be active/in shift
 * 4. Language matching:
 *    - If man selects Indian language: sees women with same mother tongue
 *    - If man selects non-Indian language: sees ONLY women with Indian languages (worldwide)
 */

import { isIndianLanguage, INDIAN_LANGUAGES } from "@/data/profileLanguages";

export type ProfileVisibility = "low" | "medium" | "high" | "very_high";

export interface WomanProfile {
  userId: string;
  fullName: string;
  age: number | null;
  photoUrl: string | null;
  motherTongue: string;
  country: string | null;
  isOnline: boolean;
  isBusy: boolean;
  currentChatCount: number;
  aiVerified: boolean;
  isInShift: boolean;
  profileVisibility?: ProfileVisibility;
}

/**
 * Get visibility weight for sorting (higher = more visible)
 */
export function getVisibilityWeight(visibility: ProfileVisibility | undefined): number {
  switch (visibility) {
    case "very_high": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 3; // default to high
  }
}

/**
 * Check if profile should be shown based on visibility setting
 * Returns a probability-based filter (for randomized visibility)
 */
export function shouldShowProfile(visibility: ProfileVisibility | undefined): boolean {
  const rand = Math.random();
  switch (visibility) {
    case "very_high": return true; // Always shown
    case "high": return rand < 0.9; // 90% chance
    case "medium": return rand < 0.6; // 60% chance
    case "low": return rand < 0.3; // 30% chance
    default: return true;
  }
}

export interface VisibilityResult {
  visibleWomen: WomanProfile[];
  sameLanguageWomen: WomanProfile[];
  otherLanguageWomen: WomanProfile[];
  manHasIndianLanguage: boolean;
  manLanguage: string;
}

/**
 * Filter women based on language visibility rules
 */
export function filterWomenByLanguageRules(
  women: WomanProfile[],
  manLanguage: string
): VisibilityResult {
  const manHasIndianLanguage = isIndianLanguage(manLanguage);
  
  // Get all Indian language names for comparison
  const indianLanguageNames = INDIAN_LANGUAGES.map(l => l.name.toLowerCase());
  
  // Filter women who meet basic requirements
  const eligibleWomen = women.filter(woman => 
    woman.isOnline &&
    woman.aiVerified &&
    woman.isInShift
  );

  let visibleWomen: WomanProfile[] = [];
  let sameLanguageWomen: WomanProfile[] = [];
  let otherLanguageWomen: WomanProfile[] = [];

  if (manHasIndianLanguage) {
    // RULE: Man with Indian language sees women with same mother tongue
    // Plus can see other Indian language women (for fallback matching)
    
    sameLanguageWomen = eligibleWomen.filter(woman =>
      woman.motherTongue.toLowerCase() === manLanguage.toLowerCase()
    );
    
    // Other women who speak any language (for fallback)
    otherLanguageWomen = eligibleWomen.filter(woman =>
      woman.motherTongue.toLowerCase() !== manLanguage.toLowerCase()
    );
    
    visibleWomen = [...sameLanguageWomen, ...otherLanguageWomen];
  } else {
    // RULE: Man with non-Indian language sees ONLY women with Indian languages
    // Never sees women with non-Indian languages, even if they share his language
    
    const indianWomen = eligibleWomen.filter(woman =>
      isIndianLanguage(woman.motherTongue)
    );
    
    // For non-Indian language men, "same language" section shows Indian women 
    // who speak the same language as him (rare but possible)
    sameLanguageWomen = indianWomen.filter(woman =>
      woman.motherTongue.toLowerCase() === manLanguage.toLowerCase()
    );
    
    // Other languages = all other Indian language women
    otherLanguageWomen = indianWomen.filter(woman =>
      woman.motherTongue.toLowerCase() !== manLanguage.toLowerCase()
    );
    
    visibleWomen = indianWomen;
  }

  return {
    visibleWomen,
    sameLanguageWomen,
    otherLanguageWomen,
    manHasIndianLanguage,
    manLanguage,
  };
}

/**
 * Check if a specific woman is visible to a man based on language rules
 */
export function isWomanVisibleToMan(
  woman: WomanProfile,
  manLanguage: string
): { visible: boolean; reason: string } {
  // Check basic requirements
  if (!woman.isOnline) {
    return { visible: false, reason: "Woman is offline" };
  }
  
  if (!woman.aiVerified) {
    return { visible: false, reason: "Woman has not passed AI verification" };
  }
  
  if (!woman.isInShift) {
    return { visible: false, reason: "Woman is not currently in shift" };
  }

  const manHasIndianLanguage = isIndianLanguage(manLanguage);

  if (manHasIndianLanguage) {
    // Man with Indian language - can see all eligible women
    // Priority given to same language, but all are visible
    return { visible: true, reason: "Indian language man - all eligible women visible" };
  } else {
    // Man with non-Indian language - can ONLY see Indian language women
    const womanHasIndianLanguage = isIndianLanguage(woman.motherTongue);
    
    if (womanHasIndianLanguage) {
      return { visible: true, reason: "Non-Indian man matched with Indian language woman" };
    } else {
      return { visible: false, reason: "Non-Indian language men can only see Indian language women" };
    }
  }
}

/**
 * Get visibility explanation for UI display
 */
export function getVisibilityExplanation(manLanguage: string): string {
  const manHasIndianLanguage = isIndianLanguage(manLanguage);
  
  if (manHasIndianLanguage) {
    return `Showing women who speak ${manLanguage} and other languages. Priority given to same language matches.`;
  } else {
    return `As a ${manLanguage} speaker, you'll be matched with women who speak Indian languages. They can communicate with you using our auto-translation feature.`;
  }
}

// =========================================================
// BACKWARD COMPATIBILITY EXPORTS
// =========================================================
export const filterWomenByNLLBRules = filterWomenByLanguageRules;
