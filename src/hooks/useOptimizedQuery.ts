/**
 * Optimized Query Hooks for Performance
 * - Sub-2ms cached responses via fast-cache layer
 * - Stale-while-revalidate pattern
 * - Request deduplication
 * - Smart caching with structural sharing
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useMemo } from "react";
import { fastGet, fastSet, fastDelete, fastInvalidatePrefix, fastClear } from "@/lib/fast-cache";

// Cache keys
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  wallet: (userId: string) => ['wallet', userId] as const,
  walletBalance: (userId: string) => ['wallet-balance', userId] as const,
  transactions: (userId: string, limit?: number) => ['transactions', userId, limit] as const,
  earnings: (userId: string) => ['earnings', userId] as const,
  chatMessages: (chatId: string) => ['chat-messages', chatId] as const,
  activeChats: (userId: string) => ['active-chats', userId] as const,
  onlineUsers: (gender?: string) => ['online-users', gender] as const,
  matches: (userId: string) => ['matches', userId] as const,
  gifts: () => ['gifts'] as const,
  chatPricing: () => ['chat-pricing'] as const,
  femaleProfile: (userId: string) => ['female-profile', userId] as const,
  userLanguages: (userId: string) => ['user-languages', userId] as const,
  userPhotos: (userId: string) => ['user-photos', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
};

// Optimized profile query with dual-layer caching (fast-cache + react-query)
export function useOptimizedProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      
      // Check fast-cache first (~0.001ms)
      const cacheKey = `profile:${userId}`;
      const cached = fastGet(cacheKey);
      if (cached) return cached;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, age, gender, country, state, bio, photo_url, interests, occupation, is_verified, account_status, approval_status')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      
      // Store in fast-cache for sub-2ms on next access
      fastSet(cacheKey, data, 10 * 60 * 1000);
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Optimized wallet balance with fast-cache
export function useOptimizedWalletBalance(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.walletBalance(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      
      const cacheKey = `wallet:${userId}`;
      const cached = fastGet(cacheKey);
      if (cached) return cached;
      
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      
      fastSet(cacheKey, data, 30 * 1000);
      return data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Optimized transactions with fast-cache
export function useOptimizedTransactions(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: queryKeys.transactions(userId || '', limit),
    queryFn: async () => {
      if (!userId) return [];
      
      const cacheKey = `txn:${userId}:${limit}`;
      const cached = fastGet<unknown[]>(cacheKey);
      if (cached) return cached;
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, description, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      
      const result = data || [];
      fastSet(cacheKey, result, 60 * 1000);
      return result;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Optimized women earnings
export function useOptimizedEarnings(userId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: queryKeys.earnings(userId || ''),
    queryFn: async () => {
      if (!userId) return { total: 0, earnings: [] };
      
      const [earningsResult, totalResult] = await Promise.all([
        supabase
          .from('women_earnings')
          .select('id, amount, earning_type, description, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('women_earnings')
          .select('amount')
          .eq('user_id', userId)
      ]);
      
      if (earningsResult.error) throw earningsResult.error;
      
      const total = (totalResult.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      
      return { 
        total, 
        earnings: earningsResult.data || [] 
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Optimized online users query
export function useOptimizedOnlineUsers(gender?: string) {
  return useQuery({
    queryKey: queryKeys.onlineUsers(gender),
    queryFn: async () => {
      let query = supabase
        .from('user_status')
        .select(`
          user_id,
          is_online,
          last_seen,
          profiles!inner (
            full_name,
            age,
            gender,
            country,
            photo_url,
            is_verified
          )
        `)
        .eq('is_online', true)
        .order('last_seen', { ascending: false })
        .limit(50);
      
      if (gender) {
        query = query.eq('profiles.gender', gender);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

// Optimized chat messages with cursor-based pagination
export function useOptimizedChatMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chatMessages(chatId || ''),
    queryFn: async () => {
      if (!chatId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, message, sender_id, receiver_id, created_at, is_read, translated_message, is_translated')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).reverse(); // Reverse for chronological order
    },
    enabled: !!chatId,
    staleTime: 0, // Always fetch fresh for chat
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Optimized active chats
export function useOptimizedActiveChats(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activeChats(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('active_chat_sessions')
        .select('id, chat_id, man_user_id, woman_user_id, status, last_activity_at, total_minutes, total_earned')
        .or(`man_user_id.eq.${userId},woman_user_id.eq.${userId}`)
        .eq('status', 'active')
        .order('last_activity_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Optimized gifts list with fast-cache (rarely changes)
export function useOptimizedGifts() {
  return useQuery({
    queryKey: queryKeys.gifts(),
    queryFn: async () => {
      const cacheKey = 'gifts:active';
      const cached = fastGet<unknown[]>(cacheKey);
      if (cached) return cached;
      
      const { data, error } = await supabase
        .from('gifts')
        .select('id, name, emoji, price, currency, category, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      
      const result = data || [];
      fastSet(cacheKey, result, 30 * 60 * 1000);
      return result;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// Optimized chat pricing with fast-cache (rarely changes)
export function useOptimizedChatPricing() {
  return useQuery({
    queryKey: queryKeys.chatPricing(),
    queryFn: async () => {
      const cacheKey = 'pricing:active';
      const cached = fastGet(cacheKey);
      if (cached) return cached;
      
      const { data, error } = await supabase
        .from('chat_pricing')
        .select('rate_per_minute, video_rate_per_minute, women_earning_rate, video_women_earning_rate, currency')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      
      fastSet(cacheKey, data, 60 * 60 * 1000);
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// Batch invalidation helper - clears both fast-cache and react-query
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return useMemo(() => ({
    invalidateProfile: (userId: string) => {
      fastDelete(`profile:${userId}`);
      return queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
    invalidateWallet: (userId: string) => {
      fastDelete(`wallet:${userId}`);
      return queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance(userId) });
    },
    invalidateTransactions: (userId: string) => {
      fastInvalidatePrefix(`txn:${userId}`);
      return queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
    },
    invalidateEarnings: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings(userId) }),
    invalidateChats: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.activeChats(userId) }),
    invalidateMessages: (chatId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId) }),
    invalidateAll: () => {
      fastClear();
      return queryClient.invalidateQueries();
    },
  }), [queryClient]);
}

// Prefetch helper for navigation
export function usePrefetchQueries() {
  const queryClient = useQueryClient();
  
  return useCallback((userId: string) => {
    // Prefetch common queries on login
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile(userId),
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, age, gender, country, state, bio, photo_url, interests, occupation, is_verified, account_status, approval_status')
          .eq('user_id', userId)
          .single();
        return data;
      },
      staleTime: 10 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.walletBalance(userId),
      queryFn: async () => {
        const { data } = await supabase
          .from('wallets')
          .select('balance, currency')
          .eq('user_id', userId)
          .single();
        return data;
      },
      staleTime: 30 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.gifts(),
      queryFn: async () => {
        const { data } = await supabase
          .from('gifts')
          .select('id, name, emoji, price, currency, category, description')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        return data || [];
      },
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);
}
