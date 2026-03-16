/**
 * Wallet Service - Backward Compatibility Layer
 *
 * The system has been upgraded to a bank-grade ledger-based wallet.
 * This file re-exports from ledger-wallet.service.ts for backward compatibility.
 *
 * New code should import directly from '@/services/ledger-wallet.service'
 */

export {
  getLedgerWallet as getWallet,
  rechargeWallet as processRecharge,
  requestLedgerWithdrawal as requestWithdrawal,
  getLedgerTransactions as getTransactions,
  getLedgerStatement,
  getWithdrawalRequests,
  subscribeLedgerWallet as subscribeToWallet,
  checkSessionBalance,
  billSessionMinute,
  billGroupCallMinute,
  PRICING,
  adminGetPlatformRevenue,
} from './ledger-wallet.service';

export type {
  UsersWallet as Wallet,
  LedgerTransaction as WalletTransaction,
  WithdrawalRequest,
  OperationResult as TransactionResult,
  OperationResult as RechargeResult,
} from './ledger-wallet.service';

import { classifyError, ERROR_MESSAGES, logError } from "@/lib/errors";
import { supabase } from '@/integrations/supabase/client';

/** Get available gifts */
export async function getGifts() {
  const { data } = await supabase.from('gifts').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  return data || [];
}

/** Process gift transaction */
export async function processGiftTransaction(
  senderId: string, receiverId: string, giftId: string, message?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('process_gift_transaction', {
    p_sender_id: senderId, p_receiver_id: receiverId, p_gift_id: giftId, p_message: message || null,
  });
  if (error) return { success: false, error: classifyError(error, "process wallet request").message };
  return data as { success: boolean };
}
