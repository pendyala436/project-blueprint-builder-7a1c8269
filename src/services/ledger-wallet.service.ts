/**
 * Ledger Wallet Service
 * 
 * Core billing engine for per-minute charging (chat, audio, video, group calls).
 * All financial operations are executed via atomic Supabase RPCs.
 * 
 * Pricing (from system design v2.1):
 *   Chat:        Man ₹4/min, Woman ₹2/min (2× ratio)
 *   Audio Call:  Man ₹6/min, Woman ₹3/min (2× ratio)
 *   Video Call:  Man ₹8/min, Woman ₹4/min (2× ratio)
 *   Group Call:  Man ₹4/min/person, Woman ₹0.50/min/man (8× ratio)
 */

import { supabase } from '@/integrations/supabase/client';

// ──────────── Pricing Constants ────────────
export const PRICING = {
  chat:               { man: 4,  woman: 2,    platform: 2    },
  audio_call:         { man: 6,  woman: 3,    platform: 3    },
  video_call:         { man: 8,  woman: 4,    platform: 4    },
  private_group_call: { man: 4,  woman: 0.50, platform: 3.50 },
} as const;

export type SessionType = keyof typeof PRICING;

// ──────────── Types ────────────
export interface BillingResult {
  success: boolean;
  charged?: number;
  earned?: number;
  minute_number?: number;
  error?: string;
  balance?: number;
  duplicate_skipped?: boolean;
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface StatementRow {
  id: string;
  session_id: string | null;
  transaction_type: string;
  debit: number;
  credit: number;
  description: string | null;
  reference_id: string | null;
  counterparty_id: string | null;
  running_balance: number;
  created_at: string;
  duration_seconds: number | null;
  rate_per_minute: number | null;
}

// ──────────── Billing ────────────

/** Bill a session tick — supports partial minutes via durationSeconds (default 60) */
export async function billSession(
  sessionId: string,
  sessionType: SessionType,
  manId: string,
  womanId: string,
  minuteNumber: number,
  durationSeconds: number = 60
): Promise<BillingResult> {
  const rates = PRICING[sessionType];
  const { data, error } = await supabase.rpc('ledger_bill_session', {
    p_session_id: sessionId,
    p_session_type: sessionType,
    p_man_id: manId,
    p_woman_id: womanId,
    p_minute_number: minuteNumber,
    p_man_charge: rates.man,
    p_woman_earn: rates.woman,
    p_duration_seconds: Math.max(1, Math.round(durationSeconds)),
  });
  if (error) return { success: false, error: error.message };
  return (data as BillingResult) ?? { success: false, error: 'No response' };
}

/** Bill one tick of a private group call — supports partial minutes */
export async function billGroupCall(
  sessionId: string,
  womanId: string,
  manIds: string[],
  minuteNumber: number,
  durationSeconds: number = 60
): Promise<BillingResult> {
  const { data, error } = await supabase.rpc('ledger_bill_group_call', {
    p_session_id: sessionId,
    p_woman_id: womanId,
    p_man_ids: manIds,
    p_minute_number: minuteNumber,
    p_charge_per_man: PRICING.private_group_call.man,
    p_earn_per_man: PRICING.private_group_call.woman,
    p_duration_seconds: Math.max(1, Math.round(durationSeconds)),
  });
  if (error) return { success: false, error: error.message };
  return (data as BillingResult) ?? { success: false, error: 'No response' };
}

// ──────────── Wallet Operations ────────────

/** Get men's wallet balance */
export async function getMenBalance(userId: string): Promise<number> {
  const { data } = await supabase.rpc('get_men_wallet_balance', { p_user_id: userId });
  if (!data) return 0;
  return Number((data as Record<string, number>).balance) || 0;
}

/** Get women's wallet balance + today earnings */
export async function getWomenBalance(userId: string): Promise<{ balance: number; todayEarnings: number }> {
  const { data } = await supabase.rpc('get_women_wallet_balance', { p_user_id: userId });
  if (!data) return { balance: 0, todayEarnings: 0 };
  const d = data as Record<string, number>;
  return {
    balance: Number(d.available_balance) || 0,
    todayEarnings: Number(d.today_earnings) || 0,
  };
}

/** Recharge a man's wallet */
export async function rechargeWallet(userId: string, amount: number, referenceId: string, gateway: string): Promise<BillingResult> {
  const { data, error } = await supabase.rpc('ledger_recharge', {
    p_user_id: userId,
    p_amount: amount,
    p_reference_id: referenceId,
    p_gateway: gateway,
  });
  if (error) return { success: false, error: error.message };
  return (data as BillingResult) ?? { success: false, error: 'No response' };
}

// ──────────── Statements ────────────

/** Get ledger statement for a user (date range) */
export async function getStatement(userId: string, fromDate?: string, toDate?: string): Promise<StatementRow[]> {
  const { data, error } = await supabase.rpc('get_ledger_statement', {
    p_user_id: userId,
    p_from_date: fromDate || null,
    p_to_date: toDate || null,
  });
  if (error || !data) return [];
  return (data as unknown as StatementRow[]);
}

// ──────────── Payout ────────────

/** Trigger payout snapshot (admin only) */
export async function triggerPayoutSnapshot(snapshotType: 'mid_month' | 'end_month'): Promise<{ success: boolean; count?: number; error?: string }> {
  const { data, error } = await supabase.rpc('capture_payout_snapshot', {
    p_snapshot_type: snapshotType,
  });
  if (error) return { success: false, error: error.message };
  const result = data as Record<string, unknown>;
  return { success: Boolean(result?.success), count: Number(result?.women_processed) || 0 };
}

/** Get payout snapshots */
export async function getPayoutSnapshots(month?: string) {
  let query = supabase
    .from('women_payout_snapshots')
    .select('*')
    .order('created_at', { ascending: false });
  if (month) {
    query = query.eq('ist_month', month);
  }
  const { data, error } = await query.limit(500);
  if (error) return [];
  return data || [];
}

// ──────────── Pricing Fetch ────────────

export interface ChatPricingData {
  ratePerMinute: number;
  womenEarningRate: number;
  audioRatePerMinute: number;
  audioWomenEarningRate: number;
  videoRatePerMinute: number;
  videoWomenEarningRate: number;
  groupCallRatePerMinute: number;
  groupCallWomenEarningRate: number;
  giftWomenPercent: number;
  withdrawalFeePercent: number;
  minWithdrawalBalance: number;
}

export async function fetchChatPricing(): Promise<ChatPricingData> {
  const { data } = await supabase
    .from('chat_pricing')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!data) {
    // Fallback to spec defaults
    return {
      ratePerMinute: 4, womenEarningRate: 2,
      audioRatePerMinute: 6, audioWomenEarningRate: 3,
      videoRatePerMinute: 8, videoWomenEarningRate: 4,
      groupCallRatePerMinute: 4, groupCallWomenEarningRate: 0.50,
      giftWomenPercent: 50, withdrawalFeePercent: 5, minWithdrawalBalance: 5000,
    };
  }

  return {
    ratePerMinute: Number(data.rate_per_minute) || 4,
    womenEarningRate: Number(data.women_earning_rate) || 2,
    audioRatePerMinute: Number(data.audio_rate_per_minute) || 6,
    audioWomenEarningRate: Number(data.audio_women_earning_rate) || 3,
    videoRatePerMinute: Number(data.video_rate_per_minute) || 8,
    videoWomenEarningRate: Number(data.video_women_earning_rate) || 4,
    groupCallRatePerMinute: Number(data.group_call_rate_per_minute) || 4,
    groupCallWomenEarningRate: Number(data.group_call_women_earning_rate) || 0.50,
    giftWomenPercent: Number(data.gift_women_percent) || 50,
    withdrawalFeePercent: Number(data.withdrawal_fee_percent) || 5,
    minWithdrawalBalance: Number(data.min_withdrawal_balance) || 5000,
  };
}
