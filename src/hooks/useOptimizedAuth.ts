/**
 * Preload User Context
 * 
 * Standalone function to fetch user context in parallel on login.
 * Used by AuthScreen to determine post-login routing.
 * 
 * NOTE: The auth state singleton lives in useAuthReady.ts — do NOT
 * create a second onAuthStateChange listener here.
 */

import { supabase } from '@/integrations/supabase/client';

interface PreloadedUserContext {
  isAdmin: boolean;
  isFemale: boolean;
  tutorialCompleted: boolean;
  profile: {
    gender?: string | null;
    full_name?: string | null;
    approval_status?: string | null;
  } | null;
  femaleProfile: {
    user_id: string;
    approval_status: string;
  } | null;
}

// Cache for user context to avoid refetching within the same session
const userContextCache = new Map<string, { data: PreloadedUserContext; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds — keep short so role/approval changes propagate quickly

/**
 * Preload user context on login — fetches admin role, tutorial progress,
 * profile, and female profile in parallel.
 */
export async function preloadUserContext(userId: string): Promise<PreloadedUserContext> {
  // Check cache first
  const cached = userContextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const [adminResult, tutorialResult, profileResult, femaleResult] = await Promise.all([
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle(),
    supabase
      .from('tutorial_progress')
      .select('completed')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('gender, full_name, approval_status')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('female_profiles')
      .select('user_id, approval_status')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const context: PreloadedUserContext = {
    isAdmin: !!adminResult.data,
    tutorialCompleted: !!tutorialResult.data?.completed,
    isFemale: profileResult.data?.gender?.toLowerCase() === 'female' || !!femaleResult.data,
    profile: profileResult.data ?? null,
    femaleProfile: femaleResult.data ?? null,
  };

  // Cache the result
  userContextCache.set(userId, { data: context, timestamp: Date.now() });

  return context;
}

/** Clear cached user context (call on logout) */
export function clearUserContextCache(): void {
  userContextCache.clear();
}
