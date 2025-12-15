/**
 * Optimized Auth Hook
 * 
 * Provides fast authentication with:
 * - Session caching
 * - Parallel data fetching
 * - Preloaded user context
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserContext {
  isAdmin: boolean;
  isFemale: boolean;
  tutorialCompleted: boolean;
  profile: {
    gender?: string;
    full_name?: string;
    approval_status?: string;
  } | null;
}

interface OptimizedAuthState {
  user: User | null;
  session: Session | null;
  userContext: UserContext | null;
  isLoading: boolean;
  isInitialized: boolean;
}

// Cache for user context to avoid refetching
const userContextCache = new Map<string, { data: UserContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useOptimizedAuth() {
  const [state, setState] = useState<OptimizedAuthState>({
    user: null,
    session: null,
    userContext: null,
    isLoading: true,
    isInitialized: false,
  });

  // Fetch user context in parallel
  const fetchUserContext = useCallback(async (userId: string): Promise<UserContext> => {
    // Check cache first
    const cached = userContextCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch all data in parallel
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

    const context: UserContext = {
      isAdmin: !!adminResult.data,
      tutorialCompleted: !!tutorialResult.data?.completed,
      isFemale: profileResult.data?.gender?.toLowerCase() === 'female' || !!femaleResult.data,
      profile: profileResult.data ? {
        gender: profileResult.data.gender ?? undefined,
        full_name: profileResult.data.full_name ?? undefined,
        approval_status: femaleResult.data?.approval_status ?? profileResult.data.approval_status ?? undefined,
      } : null,
    };

    // Cache the result
    userContextCache.set(userId, { data: context, timestamp: Date.now() });

    return context;
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Get session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          // Fetch user context in parallel with setting session
          const context = await fetchUserContext(session.user.id);
          
          if (!mounted) return;
          
          setState({
            user: session.user,
            session,
            userContext: context,
            isLoading: false,
            isInitialized: true,
          });
        } else {
          setState({
            user: null,
            session: null,
            userContext: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isInitialized: true,
          }));
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          // Don't block - update state immediately, then fetch context
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            isLoading: false,
          }));

          // Fetch context in background
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const context = await fetchUserContext(session.user.id);
              setState(prev => ({
                ...prev,
                userContext: context,
              }));
            } catch (e) {
              console.error('Context fetch error:', e);
            }
          }, 0);
        } else {
          setState({
            user: null,
            session: null,
            userContext: null,
            isLoading: false,
            isInitialized: true,
          });
          // Clear cache on logout
          userContextCache.clear();
        }
      }
    );

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserContext]);

  // Memoized return value
  return useMemo(() => ({
    ...state,
    clearCache: () => userContextCache.clear(),
  }), [state]);
}

// Preload user context on login
export async function preloadUserContext(userId: string) {
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

  return {
    isAdmin: !!adminResult.data,
    tutorialCompleted: !!tutorialResult.data?.completed,
    isFemale: profileResult.data?.gender?.toLowerCase() === 'female' || !!femaleResult.data,
    profile: profileResult.data,
    femaleProfile: femaleResult.data,
  };
}
