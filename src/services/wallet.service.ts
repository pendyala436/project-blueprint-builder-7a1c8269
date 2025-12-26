/**
 * Wallet Service
 * 
 * Handles all wallet and transaction-related API calls.
 * All financial operations use database functions for ACID compliance.
 * Synced with Flutter wallet_service.dart
 * 
 * Revenue Distribution Logic:
 * - When man recharges: 100% goes to admin, man gets spending balance
 * - During chat/video: Man charged per-minute, woman earns her rate, admin keeps difference
 * - Gifts: 50/50 split between woman and admin
 */

import { supabase } from '@/integrations/supabase/client';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string | null;
  reference_id?: string | null;
  status: string;
  created_at: string;
}

export interface WomenEarning {
  id: string;
  user_id: string;
  amount: number;
  earning_type: 'chat' | 'video_call' | 'gift';
  chat_session_id?: string | null;
  description?: string | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method?: string | null;
  payment_details?: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  processed_by?: string | null;
  processed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TransactionResult {
  success: boolean;
  transaction_id?: string;
  previous_balance?: number;
  new_balance?: number;
  admin_revenue?: number;
  error?: string;
}

export interface RechargeResult {
  success: boolean;
  transaction_id?: string;
  previous_balance?: number;
  new_balance?: number;
  admin_revenue?: number;
  error?: string;
}

export interface AdminRevenueTransaction {
  id: string;
  transaction_type: 'recharge' | 'chat_revenue' | 'video_revenue' | 'gift_revenue';
  amount: number;
  man_user_id?: string;
  woman_user_id?: string;
  session_id?: string;
  reference_id?: string;
  description?: string;
  currency: string;
  created_at: string;
}

/**
 * Get user's wallet
 */
export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching wallet:', error);
    return null;
  }

  return data;
}

/**
 * Get wallet transactions
 */
export async function getTransactions(
  userId: string,
  limit = 50
): Promise<WalletTransaction[]> {
  const { data } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map(tx => ({
    ...tx,
    type: tx.type as 'credit' | 'debit',
  }));
}

/**
 * Process wallet transaction (uses database function for atomicity)
 */
export async function processTransaction(
  userId: string,
  amount: number,
  type: 'credit' | 'debit',
  description?: string
): Promise<TransactionResult> {
  const { data, error } = await supabase.rpc('process_wallet_transaction', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as unknown as TransactionResult;
}

/**
 * Process atomic transfer between users
 */
export async function processTransfer(
  fromUserId: string,
  toUserId: string,
  amount: number,
  description?: string
): Promise<TransactionResult> {
  const { data, error } = await supabase.rpc('process_atomic_transfer', {
    p_from_user_id: fromUserId,
    p_to_user_id: toUserId,
    p_amount: amount,
    p_description: description || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as unknown as TransactionResult;
}

/**
 * Process gift transaction
 */
export async function processGiftTransaction(
  senderId: string,
  receiverId: string,
  giftId: string,
  message?: string
): Promise<TransactionResult> {
  const { data, error } = await supabase.rpc('process_gift_transaction', {
    p_sender_id: senderId,
    p_receiver_id: receiverId,
    p_gift_id: giftId,
    p_message: message || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as unknown as TransactionResult;
}

/**
 * Get available gifts
 */
export async function getGifts() {
  const { data } = await supabase
    .from('gifts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return data || [];
}

/**
 * Get women's earnings (synced with Flutter)
 */
export async function getWomenEarnings(
  userId: string,
  limit = 50
): Promise<WomenEarning[]> {
  const { data } = await supabase
    .from('women_earnings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map(earning => ({
    ...earning,
    earning_type: earning.earning_type as 'chat' | 'video_call' | 'gift',
  }));
}

/**
 * Request withdrawal (uses database function for ACID compliance)
 */
export async function requestWithdrawal(
  userId: string,
  amount: number,
  paymentMethod?: string,
  paymentDetails?: Record<string, string | number | boolean | null>
): Promise<TransactionResult> {
  const { data, error } = await supabase.rpc('process_withdrawal_request', {
    p_user_id: userId,
    p_amount: amount,
    p_payment_method: paymentMethod || null,
    p_payment_details: paymentDetails as unknown as null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as unknown as {
    success: boolean;
    withdrawal_id?: string;
    previous_balance?: number;
    new_balance?: number;
    error?: string;
  };

  return {
    success: result.success,
    transaction_id: result.withdrawal_id,
    previous_balance: result.previous_balance,
    new_balance: result.new_balance,
    error: result.error,
  };
}

/**
 * Get withdrawal requests for a user
 */
export async function getWithdrawalRequests(
  userId: string,
  limit = 20
) {
  const { data } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Process wallet recharge
 * 100% of recharge goes to admin revenue, man gets spending balance
 */
export async function processRecharge(
  userId: string,
  amount: number,
  referenceId?: string,
  description?: string
): Promise<RechargeResult> {
  const { data, error } = await supabase.rpc('process_recharge', {
    p_user_id: userId,
    p_amount: amount,
    p_reference_id: referenceId || null,
    p_description: description || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as unknown as RechargeResult;
}

/**
 * Get admin revenue transactions (admin only)
 */
export async function getAdminRevenueTransactions(
  limit = 100,
  transactionType?: 'recharge' | 'chat_revenue' | 'video_revenue' | 'gift_revenue'
): Promise<AdminRevenueTransaction[]> {
  let query = supabase
    .from('admin_revenue_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  const { data } = await query;
  return (data || []) as AdminRevenueTransaction[];
}

/**
 * Get admin revenue summary
 */
export async function getAdminRevenueSummary(): Promise<{
  totalRecharge: number;
  totalChatRevenue: number;
  totalVideoRevenue: number;
  totalGiftRevenue: number;
  grandTotal: number;
}> {
  const { data } = await supabase
    .from('admin_revenue_transactions')
    .select('transaction_type, amount');

  const summary = {
    totalRecharge: 0,
    totalChatRevenue: 0,
    totalVideoRevenue: 0,
    totalGiftRevenue: 0,
    grandTotal: 0,
  };

  if (data) {
    data.forEach((tx: { transaction_type: string; amount: number }) => {
      summary.grandTotal += tx.amount;
      switch (tx.transaction_type) {
        case 'recharge':
          summary.totalRecharge += tx.amount;
          break;
        case 'chat_revenue':
          summary.totalChatRevenue += tx.amount;
          break;
        case 'video_revenue':
          summary.totalVideoRevenue += tx.amount;
          break;
        case 'gift_revenue':
          summary.totalGiftRevenue += tx.amount;
          break;
      }
    });
  }

  return summary;
}

/**
 * Subscribe to wallet changes (real-time updates)
 */
export function subscribeToWallet(
  userId: string,
  onUpdate: (wallet: Wallet) => void
) {
  return supabase
    .channel(`wallet:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new as Wallet);
      }
    )
    .subscribe();
}
