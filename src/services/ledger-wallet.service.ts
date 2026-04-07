import { classifyError, logError } from "@/lib/errors";
/**
 * Ledger Wallet Service
 *
 * Bank-grade ledger-based wallet system.
 * All operations are ACID-compliant via Supabase RPC functions.
 * Ledger is append-only: no UPDATE or DELETE on ledger_transactions.
 *
 * Pricing:
 *   Chat:            Man ₹4/min  | Woman ₹2/min | Platform ₹2
 *   Video Call:      Man ₹8/min  | Woman ₹4/min | Platform ₹4
 *   Group Call:      Man ₹4/min  | Woman ₹2/man/min | Platform ₹2/man
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Gender = 'men' | 'women';
export type SessionType = 'chat' | 'video_call' | 'private_group_call';
export type TransactionType =
  | 'recharge'
  | 'chat_charge'
  | 'video_call_charge'
  | 'group_call_charge'
  | 'earning'
  | 'withdrawal'
  | 'opening_balance'
  | 'monthly_closing';

export interface UsersWallet {
  id: string;
  user_id: string;
  gender: Gender;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerTransaction {
  id: string;
  user_id: string;
  session_id: string | null;
  transaction_type: TransactionType;
  debit: number;
  credit: number;
  rate_per_minute: number | null;
  duration_seconds: number | null;
  counterparty_id: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface LedgerStatementRow extends LedgerTransaction {
  running_balance: number;
}

export interface WalletRecharge {
  id: string;
  user_id: string;
  amount: number;
  payment_gateway: string;
  gateway_transaction_id: string | null;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string | null;
  payment_details: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  processed_at: string | null;
  processed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyWalletSummary {
  id: string;
  user_id: string;
  month: number;
  year: number;
  opening_balance: number;
  total_credit: number;
  total_debit: number;
  withdrawals: number;
  closing_balance: number;
  forwarded_balance: number;
  created_at: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface SessionBalanceCheck {
  sufficient: boolean;
  balance: number;
  required: number;
  shortfall: number;
}

// Pricing constants
export const PRICING = {
  chat: { man: 4, woman: 2, platform: 2 },
  video_call: { man: 8, woman: 4, platform: 4 },
  private_group_call: { man: 4, woman: 2, platform: 2 },
} as const;

// ─── Wallet Functions ─────────────────────────────────────────────────────────

/**
 * Get user's ledger wallet. Creates one if not found.
 */
export async function getLedgerWallet(userId: string): Promise<UsersWallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[LedgerWallet] getLedgerWallet error:', error);
    return null;
  }
  return data as UsersWallet | null;
}

/**
 * Recharge men wallet via Supabase RPC (ACID).
 */
export async function rechargeWallet(
  userId: string,
  amount: number,
  gateway: string = 'razorpay',
  gatewayTxnId?: string,
  description?: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('ledger_recharge', {
    p_user_id: userId,
    p_amount: amount,
    p_gateway: gateway,
    p_gateway_txn_id: gatewayTxnId ?? null,
    p_description: description ?? null,
  });

  if (error) return { success: false, error: classifyError(error, 'process wallet operation').message };
  return data as OperationResult;
}

/**
 * Bill a single session minute (chat or video call) - ACID.
 */
export async function billSessionMinute(
  sessionId: string,
  sessionType: SessionType,
  manId: string,
  womanId: string,
  minuteNumber: number
): Promise<OperationResult> {
  const pricing = PRICING[sessionType] ?? PRICING.chat;

  const { data, error } = await supabase.rpc('ledger_bill_session', {
    p_session_id: sessionId,
    p_session_type: sessionType,
    p_man_id: manId,
    p_woman_id: womanId,
    p_minute_number: minuteNumber,
    p_man_charge: pricing.man,
    p_woman_earn: pricing.woman,
  });

  if (error) return { success: false, error: error.message };
  return data as OperationResult;
}

/**
 * Bill group call for all men in a session - ACID.
 */
export async function billGroupCallMinute(
  sessionId: string,
  womanId: string,
  manIds: string[],
  minuteNumber: number
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('ledger_bill_group_call', {
    p_session_id: sessionId,
    p_woman_id: womanId,
    p_man_ids: manIds,
    p_minute_number: minuteNumber,
    p_charge_per_man: PRICING.private_group_call.man,
    p_earn_per_man: PRICING.private_group_call.woman,
  });

  if (error) return { success: false, error: error.message };
  return data as OperationResult;
}

/**
 * Request women withdrawal - ACID with ledger debit.
 */
export async function requestLedgerWithdrawal(
  userId: string,
  amount: number,
  paymentMethod: string = 'upi',
  paymentDetails?: Record<string, unknown>
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('ledger_withdrawal', {
    p_user_id: userId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_payment_details: (paymentDetails as any) ?? null,
  });

  if (error) return { success: false, error: error.message };
  return data as OperationResult;
}

/**
 * Check if user has sufficient balance to join a session.
 */
export async function checkSessionBalance(
  userId: string,
  sessionType: SessionType
): Promise<SessionBalanceCheck> {
  const { data, error } = await supabase.rpc('check_session_balance', {
    p_user_id: userId,
    p_session_type: sessionType,
  });

  if (error || !data) {
    return { sufficient: false, balance: 0, required: 4, shortfall: 4 };
  }
  return data as unknown as SessionBalanceCheck;
}

// ─── Statement / Ledger Queries ───────────────────────────────────────────────

/**
 * Get full ledger statement with running balance.
 */
export async function getLedgerStatement(
  userId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<LedgerStatementRow[]> {
  const { data, error } = await supabase.rpc('get_ledger_statement', {
    p_user_id: userId,
    p_from_date: fromDate?.toISOString() ?? null,
    p_to_date: toDate?.toISOString() ?? null,
  });

  if (error) {
    console.error('[LedgerWallet] getLedgerStatement error:', error);
    return [];
  }
  return (data as LedgerStatementRow[]) ?? [];
}

/**
 * Get raw ledger transactions.
 */
export async function getLedgerTransactions(
  userId: string,
  limit = 50
): Promise<LedgerTransaction[]> {
  const { data, error } = await supabase
    .from('ledger_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[LedgerWallet] getLedgerTransactions error:', error);
    return [];
  }
  return (data as LedgerTransaction[]) ?? [];
}

/**
 * Get withdrawal requests for a user.
 */
export async function getWithdrawalRequests(
  userId: string,
  limit = 20
): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as WithdrawalRequest[]) ?? [];
}

/**
 * Get recharge history for a user.
 */
export async function getRechargeHistory(
  userId: string,
  limit = 20
): Promise<WalletRecharge[]> {
  const { data, error } = await supabase
    .from('wallet_recharges')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as WalletRecharge[]) ?? [];
}

/**
 * Get monthly wallet summary.
 */
export async function getMonthlyWalletSummary(
  userId: string,
  month: number,
  year: number
): Promise<MonthlyWalletSummary | null> {
  const { data, error } = await supabase
    .from('monthly_wallet_summary')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (error) return null;
  return data as MonthlyWalletSummary | null;
}

// ─── Admin Functions ──────────────────────────────────────────────────────────

/**
 * Admin: get all ledger transactions (filterable).
 */
export async function adminGetAllLedgerTransactions(params: {
  userId?: string;
  transactionType?: TransactionType;
  month?: number;
  year?: number;
  gender?: Gender;
  limit?: number;
}): Promise<LedgerTransaction[]> {
  let query = supabase
    .from('ledger_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 200);

  if (params.userId) query = query.eq('user_id', params.userId);
  if (params.transactionType) query = query.eq('transaction_type', params.transactionType);

  if (params.month && params.year) {
    const start = new Date(params.year, params.month - 1, 1).toISOString();
    const end = new Date(params.year, params.month, 1).toISOString();
    query = query.gte('created_at', start).lt('created_at', end);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data as LedgerTransaction[]) ?? [];
}

/**
 * Admin: get platform revenue summary.
 */
export async function adminGetPlatformRevenue(month?: number, year?: number): Promise<{
  totalRecharges: number;
  totalChatRevenue: number;
  totalVideoRevenue: number;
  totalGroupRevenue: number;
  totalWithdrawals: number;
  platformRevenue: number;
}> {
  let query = supabase
    .from('ledger_transactions')
    .select('transaction_type, debit, credit');

  if (month && year) {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();
    query = query.gte('created_at', start).lt('created_at', end);
  }

  const { data } = await query;
  const rows = (data ?? []) as { transaction_type: string; debit: number; credit: number }[];

  const summary = {
    totalRecharges: 0,
    totalChatRevenue: 0,
    totalVideoRevenue: 0,
    totalGroupRevenue: 0,
    totalWithdrawals: 0,
    platformRevenue: 0,
  };

  for (const r of rows) {
    switch (r.transaction_type) {
      case 'recharge':
        summary.totalRecharges += r.credit;
        break;
      case 'chat_charge':
        summary.totalChatRevenue += r.debit;
        summary.platformRevenue += r.debit * (PRICING.chat.platform / PRICING.chat.man);
        break;
      case 'video_call_charge':
        summary.totalVideoRevenue += r.debit;
        summary.platformRevenue += r.debit * (PRICING.video_call.platform / PRICING.video_call.man);
        break;
      case 'group_call_charge':
        summary.totalGroupRevenue += r.debit;
        summary.platformRevenue += r.debit * (PRICING.private_group_call.platform / PRICING.private_group_call.man);
        break;
      case 'withdrawal':
        summary.totalWithdrawals += r.debit;
        break;
    }
  }

  return summary;
}

// ─── Real-time Subscription ───────────────────────────────────────────────────

/**
 * Subscribe to wallet balance changes.
 */
export function subscribeLedgerWallet(
  userId: string,
  onUpdate: (wallet: UsersWallet) => void
) {
  return supabase
    .channel(`ledger_wallet:${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users_wallet', filter: `user_id=eq.${userId}` },
      (payload) => onUpdate(payload.new as UsersWallet)
    )
    .subscribe();
}
