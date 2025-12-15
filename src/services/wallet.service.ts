/**
 * Wallet Service
 * 
 * Handles all wallet and transaction-related API calls.
 * All financial operations use database functions for ACID compliance.
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
  status: string;
  created_at: string;
}

export interface TransactionResult {
  success: boolean;
  transaction_id?: string;
  previous_balance?: number;
  new_balance?: number;
  error?: string;
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
