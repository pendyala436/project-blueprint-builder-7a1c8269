/**
 * useAtomicTransaction Hook
 * 
 * PURPOSE: Provides ACID-compliant transaction functions for wallet operations.
 * Uses database functions to ensure atomicity, consistency, isolation, and durability.
 * 
 * ACID PROPERTIES:
 * - Atomicity: All operations succeed or fail together
 * - Consistency: Database constraints are always maintained
 * - Isolation: Row-level locking prevents concurrent modification conflicts
 * - Durability: Committed transactions persist even after system failure
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
}

// Chat billing result interface
interface BillingResult {
  success: boolean;
  charged?: number;
  earned?: number;
  sessionEnded?: boolean;
  error?: string;
}

export const useAtomicTransaction = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Process a wallet transaction atomically
   * Uses database function for ACID compliance
   * 
   * @param userId - User's UUID
   * @param amount - Transaction amount
   * @param type - 'credit' or 'debit'
   * @param description - Optional description
   * @param referenceId - Optional reference ID
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
      // Call the atomic database function
      const { data, error } = await supabase.rpc("process_wallet_transaction", {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_description: description || null,
        p_reference_id: referenceId || null,
      });

      if (error) {
        throw error;
      }

      const result = data as any;

      if (!result.success) {
        toast({
          title: "Transaction Failed",
          description: result.error || "Unable to process transaction",
          variant: "destructive",
        });
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        transactionId: result.transaction_id,
        previousBalance: result.previous_balance,
        newBalance: result.new_balance,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      console.error("Transaction error:", err);
      
      toast({
        title: "Transaction Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Process chat billing atomically
   * Deducts from man's wallet and credits woman's earnings
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
      // Call the atomic database function
      const { data, error } = await supabase.rpc("process_chat_billing", {
        p_session_id: sessionId,
        p_minutes: minutes,
      });

      if (error) {
        throw error;
      }

      const result = data as any;

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          sessionEnded: result.session_ended || false,
        };
      }

      return {
        success: true,
        charged: result.charged,
        earned: result.earned,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Billing failed";
      console.error("Billing error:", err);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

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

  /**
   * Transfer funds between users
   * Performs two atomic transactions
   */
  const transferFunds = useCallback(async (
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsProcessing(true);
    
    try {
      // Debit from sender
      const debitResult = await debitWallet(
        fromUserId,
        amount,
        `Transfer to user: ${description || ""}`
      );

      if (!debitResult.success) {
        return { success: false, error: debitResult.error };
      }

      // Credit to receiver
      const creditResult = await creditWallet(
        toUserId,
        amount,
        `Transfer from user: ${description || ""}`
      );

      if (!creditResult.success) {
        // Rollback: credit back to sender
        await creditWallet(
          fromUserId,
          amount,
          "Rollback: Failed transfer"
        );
        return { success: false, error: creditResult.error };
      }

      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Transfer failed" 
      };
    } finally {
      setIsProcessing(false);
    }
  }, [creditWallet, debitWallet]);

  return {
    isProcessing,
    processTransaction,
    processChatBilling,
    creditWallet,
    debitWallet,
    transferFunds,
  };
};

export default useAtomicTransaction;
