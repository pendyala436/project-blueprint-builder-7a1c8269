/**
 * useAtomicTransaction Hook
 * 
 * PURPOSE: Provides ACID-compliant transaction functions for all financial operations.
 * Uses database functions to ensure atomicity, consistency, isolation, and durability.
 * 
 * ACID PROPERTIES:
 * - Atomicity: All operations succeed or fail together (single DB transaction)
 * - Consistency: Database constraints and business rules are always maintained
 * - Isolation: Row-level locking (FOR UPDATE) prevents concurrent modification conflicts
 * - Durability: Committed transactions persist even after system failure
 * 
 * SUPER USERS:
 * - Super users (email pattern: male/female/admin 1-15 @meow-meow.com) bypass balance requirements
 * - Database functions check for super user status server-side
 * 
 * DEADLOCK PREVENTION:
 * - Wallets are locked in consistent order (by user_id) during transfers
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Transaction result interface
interface TransactionResult {
  success: boolean;
  transactionId?: string;
  previousBalance?: number;
  newBalance?: number;
  error?: string;
  superUserBypass?: boolean;
}

// Transfer result interface
interface TransferResult {
  success: boolean;
  fromTransactionId?: string;
  toTransactionId?: string;
  fromPreviousBalance?: number;
  fromNewBalance?: number;
  toPreviousBalance?: number;
  toNewBalance?: number;
  error?: string;
  superUserBypass?: boolean;
}

// Gift transaction result interface
interface GiftResult {
  success: boolean;
  giftTransactionId?: string;
  walletTransactionId?: string;
  previousBalance?: number;
  newBalance?: number;
  giftName?: string;
  giftEmoji?: string;
  error?: string;
  superUserBypass?: boolean;
}

// Chat/Video billing result interface
interface BillingResult {
  success: boolean;
  charged?: number;
  earned?: number;
  sessionEnded?: boolean;
  error?: string;
  superUser?: boolean;
}

// Withdrawal result interface
interface WithdrawalResult {
  success: boolean;
  withdrawalId?: string;
  transactionId?: string;
  previousBalance?: number;
  newBalance?: number;
  error?: string;
}

export const useAtomicTransaction = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Process a wallet transaction atomically
   * Uses database function for ACID compliance with row-level locking
   * 
   * @param userId - User's UUID
   * @param amount - Transaction amount (must be positive)
   * @param type - 'credit' or 'debit'
   * @param description - Optional description
   * @param referenceId - Optional reference ID for tracking
   */
  const processTransaction = useCallback(async (
    userId: string,
    amount: number,
    type: "credit" | "debit",
    description?: string,
    referenceId?: string
  ): Promise<TransactionResult> => {
    setIsProcessing(true);
    
    try {
      // Call the atomic database function with row-level locking
      const { data, error } = await supabase.rpc("process_wallet_transaction", {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_description: description || null,
        p_reference_id: referenceId || null,
      });

      if (error) throw error;

      const result = data as Record<string, unknown>;

      if (!result.success) {
        toast({
          title: "Transaction Failed",
          description: (result.error as string) || "Unable to process transaction",
          variant: "destructive",
        });
        return {
          success: false,
          error: result.error as string,
        };
      }

      return {
        success: true,
        transactionId: result.transaction_id as string,
        previousBalance: result.previous_balance as number,
        newBalance: result.new_balance as number,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      console.error("Transaction error:", err);
      
      toast({
        title: "Transaction Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Transfer funds between users atomically
   * Single database transaction ensures both debit and credit succeed or fail together
   * Uses ordered locking to prevent deadlocks
   * 
   * @param fromUserId - Sender's UUID
   * @param toUserId - Receiver's UUID
   * @param amount - Transfer amount
   * @param description - Optional description
   */
  const transferFunds = useCallback(async (
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string
  ): Promise<TransferResult> => {
    setIsProcessing(true);
    
    try {
      // Call atomic transfer function (single transaction, ordered locking)
      const { data, error } = await supabase.rpc("process_atomic_transfer", {
        p_from_user_id: fromUserId,
        p_to_user_id: toUserId,
        p_amount: amount,
        p_description: description || null,
      });

      if (error) throw error;

      const result = data as Record<string, unknown>;

      if (!result.success) {
        toast({
          title: "Transfer Failed",
          description: (result.error as string) || "Unable to complete transfer",
          variant: "destructive",
        });
        return { success: false, error: result.error as string };
      }

      toast({
        title: "Transfer Complete",
        description: `Successfully transferred ₹${amount}`,
      });

      return {
        success: true,
        fromTransactionId: result.from_transaction_id as string,
        toTransactionId: result.to_transaction_id as string,
        fromPreviousBalance: result.from_previous_balance as number,
        fromNewBalance: result.from_new_balance as number,
        toPreviousBalance: result.to_previous_balance as number,
        toNewBalance: result.to_new_balance as number,
        superUserBypass: result.super_user_bypass as boolean,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transfer failed";
      console.error("Transfer error:", err);
      
      toast({
        title: "Transfer Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Send a gift atomically
   * Deducts from sender's wallet and records gift in single transaction
   * 
   * @param senderId - Sender's UUID
   * @param receiverId - Receiver's UUID
   * @param giftId - Gift UUID
   * @param message - Optional gift message
   */
  const sendGift = useCallback(async (
    senderId: string,
    receiverId: string,
    giftId: string,
    message?: string
  ): Promise<GiftResult> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc("process_gift_transaction", {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_gift_id: giftId,
        p_message: message || null,
      });

      if (error) throw error;

      const result = data as Record<string, unknown>;

      if (!result.success) {
        toast({
          title: "Gift Failed",
          description: (result.error as string) || "Unable to send gift",
          variant: "destructive",
        });
        return { success: false, error: result.error as string };
      }

      toast({
        title: "Gift Sent!",
        description: `${result.gift_emoji} ${result.gift_name} sent successfully`,
      });

      return {
        success: true,
        giftTransactionId: result.gift_transaction_id as string,
        walletTransactionId: result.wallet_transaction_id as string,
        previousBalance: result.previous_balance as number,
        newBalance: result.new_balance as number,
        giftName: result.gift_name as string,
        giftEmoji: result.gift_emoji as string,
        superUserBypass: result.super_user_bypass as boolean,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Gift sending failed";
      console.error("Gift error:", err);
      
      toast({
        title: "Gift Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Process chat billing atomically
   * Deducts from man's wallet and credits woman's earnings in single transaction
   * 
   * @param sessionId - Active chat session UUID
   * @param minutes - Number of minutes to bill
   */
  const processChatBilling = useCallback(async (
    sessionId: string,
    minutes: number
  ): Promise<BillingResult> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc("process_chat_billing", {
        p_session_id: sessionId,
        p_minutes: minutes,
      });

      if (error) throw error;

      const result = data as Record<string, unknown>;

      if (!result.success) {
        return {
          success: false,
          error: result.error as string,
          sessionEnded: result.session_ended as boolean || false,
        };
      }

      return {
        success: true,
        charged: result.charged as number,
        earned: result.earned as number,
        superUser: result.super_user as boolean || false,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Billing failed";
      console.error("Billing error:", err);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Process video call billing atomically
   * Deducts from man's wallet and credits woman's earnings in single transaction
   * 
   * @param sessionId - Video call session UUID
   * @param minutes - Number of minutes to bill
   */
  const processVideoBilling = useCallback(async (
    sessionId: string,
    minutes: number
  ): Promise<BillingResult> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc("process_video_billing", {
        p_session_id: sessionId,
        p_minutes: minutes,
      });

      if (error) throw error;

      const result = data as Record<string, unknown>;

      if (!result.success) {
        return {
          success: false,
          error: result.error as string,
          sessionEnded: result.session_ended as boolean || false,
        };
      }

      return {
        success: true,
        charged: result.charged as number,
        earned: result.earned as number,
        superUser: result.super_user as boolean || false,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Video billing failed";
      console.error("Video billing error:", err);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Request withdrawal atomically
   * Holds funds and creates withdrawal request in single transaction
   * 
   * @param userId - User's UUID
   * @param amount - Withdrawal amount
   * @param paymentMethod - Payment method
   * @param paymentDetails - Payment details JSON
   */
  const requestWithdrawal = useCallback(async (
    userId: string,
    amount: number,
    paymentMethod?: string,
    paymentDetails?: Record<string, string | number | boolean | null>
  ): Promise<WithdrawalResult> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc("process_withdrawal_request", {
        p_user_id: userId,
        p_amount: amount,
        p_payment_method: paymentMethod || null,
        p_payment_details: paymentDetails ? JSON.parse(JSON.stringify(paymentDetails)) : null,
      });

      if (error) throw error;

      const result = data as Record<string, unknown>;

      if (!result.success) {
        toast({
          title: "Withdrawal Failed",
          description: (result.error as string) || "Unable to process withdrawal",
          variant: "destructive",
        });
        return { success: false, error: result.error as string };
      }

      toast({
        title: "Withdrawal Requested",
        description: `₹${amount} withdrawal is being processed`,
      });

      return {
        success: true,
        withdrawalId: result.withdrawal_id as string,
        transactionId: result.transaction_id as string,
        previousBalance: result.previous_balance as number,
        newBalance: result.new_balance as number,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Withdrawal failed";
      console.error("Withdrawal error:", err);
      
      toast({
        title: "Withdrawal Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Credit wallet (add funds)
   * Convenience wrapper for processTransaction
   */
  const creditWallet = useCallback(async (
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string
  ): Promise<TransactionResult> => {
    return processTransaction(userId, amount, "credit", description, referenceId);
  }, [processTransaction]);

  /**
   * Debit wallet (remove funds)
   * Convenience wrapper for processTransaction
   */
  const debitWallet = useCallback(async (
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string
  ): Promise<TransactionResult> => {
    return processTransaction(userId, amount, "debit", description, referenceId);
  }, [processTransaction]);

  return {
    isProcessing,
    processTransaction,
    processChatBilling,
    processVideoBilling,
    creditWallet,
    debitWallet,
    transferFunds,
    sendGift,
    requestWithdrawal,
  };
};

export default useAtomicTransaction;
