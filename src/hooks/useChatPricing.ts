/**
 * useChatPricing Hook
 * 
 * Fetches and provides admin-configured chat pricing.
 * Prices are set by admin and used for billing men and paying women.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatPricing {
  ratePerMinute: number;        // Rate charged to men per minute (INR)
  womenEarningRate: number;     // Rate paid to women per minute (INR)
  videoRatePerMinute: number;   // Video call rate per minute (INR)
  videoWomenEarningRate: number; // Video call earning for women (INR)
  minWithdrawalBalance: number; // Minimum balance for women to withdraw
  currency: string;
}

const DEFAULT_PRICING: ChatPricing = {
  ratePerMinute: 4,              // Men pay ₹4/min for chat (matches DB)
  womenEarningRate: 2,           // Indian women earn ₹2/min for chat (admin configurable)
  videoRatePerMinute: 8,         // Men pay ₹8/min for video
  videoWomenEarningRate: 4,      // Women earn ₹4/min for video
  minWithdrawalBalance: 5000,
  currency: 'INR'
};
// Note: Non-Indian women earn ₹0/min - checked via is_earning_eligible flag

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
        setPricing({
          ratePerMinute: Number(data.rate_per_minute) || DEFAULT_PRICING.ratePerMinute,
          womenEarningRate: Number(data.women_earning_rate) || DEFAULT_PRICING.womenEarningRate,
          videoRatePerMinute: Number(data.video_rate_per_minute) || DEFAULT_PRICING.videoRatePerMinute,
          videoWomenEarningRate: Number(data.video_women_earning_rate) || DEFAULT_PRICING.videoWomenEarningRate,
          minWithdrawalBalance: Number(data.min_withdrawal_balance) || DEFAULT_PRICING.minWithdrawalBalance,
          currency: data.currency || DEFAULT_PRICING.currency
        });
      }
    } catch (err) {
      console.error("Error fetching chat pricing:", err);
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
