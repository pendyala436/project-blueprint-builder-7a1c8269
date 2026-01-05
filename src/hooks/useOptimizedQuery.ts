/**
 * Optimized Query Hooks for Performance
 * - Stale-while-revalidate pattern
 * - Request deduplication
 * - Smart caching
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useMemo } from "react";

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

// Optimized profile query with smart caching
export function useOptimizedProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, age, gender, country, state, bio, photo_url, interests, occupation, is_verified, account_status, approval_status')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Optimized wallet balance (frequently accessed)
export function useOptimizedWalletBalance(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.walletBalance(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - balance changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Optimized transactions with pagination
export function useOptimizedTransactions(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: queryKeys.transactions(userId || '', limit),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, description, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
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

// Optimized gifts list (rarely changes)
export function useOptimizedGifts() {
  return useQuery({
    queryKey: queryKeys.gifts(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gifts')
        .select('id, name, emoji, price, currency, category, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - gifts rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Optimized chat pricing (rarely changes)
export function useOptimizedChatPricing() {
  return useQuery({
    queryKey: queryKeys.chatPricing(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_pricing')
        .select('rate_per_minute, video_rate_per_minute, women_earning_rate, video_women_earning_rate, currency')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - pricing rarely changes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

// Batch invalidation helper
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return useMemo(() => ({
    invalidateProfile: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
    invalidateWallet: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance(userId) }),
    invalidateTransactions: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] }),
    invalidateEarnings: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings(userId) }),
    invalidateChats: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.activeChats(userId) }),
    invalidateMessages: (chatId: string) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId) }),
    invalidateAll: () => queryClient.invalidateQueries(),
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
