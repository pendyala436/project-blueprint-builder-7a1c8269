/**
 * useChatPricing Hook
 * 
 * Fetches and provides admin-configured chat pricing.
 * Prices are set by admin and used for billing men and paying women.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatPricing {
  ratePerMinute: number;
  womenEarningRate: number;
  videoRatePerMinute: number;
  videoWomenEarningRate: number;
  audioRatePerMinute: number;
  audioWomenEarningRate: number;
  groupCallRatePerMinute: number;
  groupCallWomenEarningRate: number;
  minWithdrawalBalance: number;
  currency: string;
}

// Default pricing — women always earn exactly half of men's charge.
// These are only used if the DB chat_pricing fetch fails entirely.
const DEFAULT_PRICING: ChatPricing = {
  ratePerMinute: 4,                // men pay ₹4/min chat
  womenEarningRate: 2,             // women earn ₹2/min chat (half of men)
  videoRatePerMinute: 8,           // men pay ₹8/min video
  videoWomenEarningRate: 4,        // women earn ₹4/min video (half of men)
  audioRatePerMinute: 6,           // men pay ₹6/min audio
  audioWomenEarningRate: 3,        // women earn ₹3/min audio (half of men)
  groupCallRatePerMinute: 4,       // each man pays ₹4/min group call
  groupCallWomenEarningRate: 0.50, // host earns ₹0.50/min per man
  minWithdrawalBalance: 100,       // min ₹100 to withdraw
  currency: 'INR'
};

export const useChatPricing = () => {
  const [pricing, setPricing] = useState<ChatPricing>(DEFAULT_PRICING);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("chat_pricing")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // RULE: women always earn exactly half of what men are charged.
        // Read men's rates from DB, then derive women's rates as half.
        const menChat  = Number(data.rate_per_minute)              || DEFAULT_PRICING.ratePerMinute;
        const menVideo = Number(data.video_rate_per_minute)        || DEFAULT_PRICING.videoRatePerMinute;
        const menGroup = Number((data as any).group_call_rate_per_minute) || DEFAULT_PRICING.groupCallRatePerMinute;
        const menAudio = Number((data as any).audio_rate_per_minute) || DEFAULT_PRICING.audioRatePerMinute;
        setPricing({
          ratePerMinute:             menChat,
          womenEarningRate:          parseFloat((menChat  / 2).toFixed(2)),
          videoRatePerMinute:        menVideo,
          videoWomenEarningRate:     parseFloat((menVideo / 2).toFixed(2)),
          audioRatePerMinute:        menAudio,
          audioWomenEarningRate:     parseFloat((menAudio / 2).toFixed(2)),
          groupCallRatePerMinute:    menGroup,
          groupCallWomenEarningRate: Number(data.group_call_women_earning_rate) || DEFAULT_PRICING.groupCallWomenEarningRate,
          minWithdrawalBalance:      Number(data.min_withdrawal_balance) || DEFAULT_PRICING.minWithdrawalBalance,
          currency:                  data.currency || DEFAULT_PRICING.currency
        });
      }
    } catch (err) {
      console.error("Error fetching chat pricing:", err);
      // Non-critical - pricing will show defaults or N/A
      setError("Failed to load pricing");
      // Use defaults on error
      setPricing(DEFAULT_PRICING);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();

    // Subscribe to pricing changes
    const channel = supabase
      .channel('chat-pricing-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_pricing' },
        () => {
          fetchPricing();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPricing]);

  /**
   * Calculate cost for a given duration (supports fractional minutes for per-second billing)
   * Admin sets rate per minute, but billing is calculated per second
   */
  const calculateCost = useCallback((minutes: number, isVideoCall = false): number => {
    const rate = isVideoCall ? pricing.videoRatePerMinute : pricing.ratePerMinute;
    // Per-second precision: (seconds / 60) * rate_per_minute
    const totalSeconds = Math.round(minutes * 60);
    return (totalSeconds / 60) * rate;
  }, [pricing]);

  /**
   * Calculate earnings for women for a given duration (per-second precision)
   * Admin sets rate per minute, but earnings are calculated per second
   */
  const calculateEarnings = useCallback((minutes: number, isVideoCall = false): number => {
    const rate = isVideoCall ? pricing.videoWomenEarningRate : pricing.womenEarningRate;
    const totalSeconds = Math.round(minutes * 60);
    return (totalSeconds / 60) * rate;
  }, [pricing]);

  /**
   * Check if a user has sufficient balance for chat
   */
  const hasSufficientBalance = useCallback((balance: number, minutes = 1, isVideoCall = false): boolean => {
    const cost = calculateCost(minutes, isVideoCall);
    return balance >= cost;
  }, [calculateCost]);

  /**
   * Format price display
   */
  const formatPrice = useCallback((amount: number): string => {
    return `₹${amount.toLocaleString()}`;
  }, []);

  return {
    pricing,
    isLoading,
    error,
    calculateCost,
    calculateEarnings,
    hasSufficientBalance,
    formatPrice,
    refetch: fetchPricing
  };
};

export default useChatPricing;
