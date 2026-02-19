/**
 * Visibility rules for matching (language-based)
 */

import { isIndianLanguage, INDIAN_LANGUAGES } from "@/data/supportedLanguages";

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
}

interface VisibilityResult {
  visibleWomen: WomanProfile[];
  hiddenCount: number;
}

export function filterWomenByNLLBRules(
  women: WomanProfile[],
  manLanguage: string
): VisibilityResult {
  const manHasIndianLanguage = isIndianLanguage(manLanguage);
  const indianLanguageNames = INDIAN_LANGUAGES.map(l => l.name.toLowerCase());

  const eligibleWomen = women.filter(woman =>
    woman.isOnline && woman.aiVerified && woman.isInShift
  );

  if (manHasIndianLanguage) {
    const sameLanguageWomen = eligibleWomen.filter(woman =>
      woman.motherTongue.toLowerCase() === manLanguage.toLowerCase()
    );
    const indianWomen = eligibleWomen.filter(woman =>
      isIndianLanguage(woman.motherTongue)
    );
    const visibleWomen = sameLanguageWomen.length > 0 ? sameLanguageWomen : indianWomen;
    return {
      visibleWomen,
      hiddenCount: women.length - visibleWomen.length,
    };
  } else {
    const indianWomen = eligibleWomen.filter(woman =>
      indianLanguageNames.includes(woman.motherTongue.toLowerCase())
    );
    return {
      visibleWomen: indianWomen,
      hiddenCount: women.length - indianWomen.length,
    };
  }
}

export function shouldShowProfile(
  woman: WomanProfile,
  manLanguage: string
): boolean {
  if (!woman.isOnline || !woman.aiVerified || !woman.isInShift) return false;

  const manHasIndianLanguage = isIndianLanguage(manLanguage);

  if (manHasIndianLanguage) {
    return woman.motherTongue.toLowerCase() === manLanguage.toLowerCase() || isIndianLanguage(woman.motherTongue);
  } else {
    const womanHasIndianLanguage = isIndianLanguage(woman.motherTongue);
    return womanHasIndianLanguage;
  }
}

export function getVisibilityWeight(woman: WomanProfile, manLanguage: string): number {
  if (woman.motherTongue.toLowerCase() === manLanguage.toLowerCase()) return 100;
  if (isIndianLanguage(woman.motherTongue)) return 50;
  return 10;
}

export function getVisibilityExplanation(manLanguage: string): string {
  const manHasIndianLanguage = isIndianLanguage(manLanguage);
  if (manHasIndianLanguage) {
    return `Showing women who speak ${manLanguage} (priority) and other Indian languages`;
  }
  return `Showing women who speak Indian languages`;
}
