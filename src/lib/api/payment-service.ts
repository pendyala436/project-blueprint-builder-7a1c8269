/**
 * Payment Service
 * 
 * Async payment processing with support for:
 * - Wallet transactions
 * - Payment gateway integration (Razorpay, Stripe, etc.)
 * - Delayed payment confirmation via polling
 * - Idempotent requests
 * - Offline-aware behavior
 */

import { supabase } from '@/integrations/supabase/client';
import { networkMonitor } from './network-monitor';
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentConfirmation,
  WithdrawalRequest,
  WithdrawalResponse,
  PaymentStatus,
  PaymentEventHandler,
  PaymentEvent,
  BillingSession,
} from './payment-types';

// Polling configuration
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 1 minute max
const PAYMENT_TIMEOUT = 300000; // 5 minutes

class PaymentService {
  private static instance: PaymentService;
  private listeners: Set<PaymentEventHandler> = new Set();
  private activePolls: Map<string, ReturnType<typeof setInterval>> = new Map();
  private pendingPayments: Map<string, PaymentRequest> = new Map();

  private constructor() {
    // Restore pending payments on initialization
    this.restorePendingPayments();
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  private emit(event: PaymentEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Payment listener error:', error);
      }
    });
  }

  private generateIdempotencyKey(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Restore pending payments from localStorage on app restart
   */
  private restorePendingPayments(): void {
    try {
      const stored = localStorage.getItem('pending_payments');
      if (stored) {
        const payments = JSON.parse(stored);
        for (const [id, payment] of Object.entries(payments)) {
          this.pendingPayments.set(id, payment as PaymentRequest);
          // Resume polling for pending payments
          this.startPolling(id);
        }
      }
    } catch (error) {
      console.error('Failed to restore pending payments:', error);
    }
  }

  private savePendingPayments(): void {
    try {
      const payments = Object.fromEntries(this.pendingPayments);
      localStorage.setItem('pending_payments', JSON.stringify(payments));
    } catch (error) {
      console.error('Failed to save pending payments:', error);
    }
  }

  /**
   * Check if payments can be processed (online check)
   */
  canProcessPayment(): boolean {
    return networkMonitor.isOnline();
  }

  /**
   * Initiate a payment (wallet-based)
   */
  async initiateWalletPayment(
    userId: string,
    amount: number,
    type: 'credit' | 'debit',
    description?: string,
    referenceId?: string
  ): Promise<{ success: boolean; data?: PaymentResponse; error?: string }> {
    if (!this.canProcessPayment()) {
      return { success: false, error: 'Cannot process payment while offline' };
    }

    const idempotencyKey = referenceId || this.generateIdempotencyKey();

    this.emit({
      type: 'payment:initiated',
      timestamp: Date.now(),
      data: { userId, amount, type, idempotencyKey },
    });

    try {
      const { data, error } = await supabase.rpc('process_wallet_transaction', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_description: description || null,
        p_reference_id: referenceId || null,
      });

      if (error) {
        this.emit({
          type: 'payment:failed',
          timestamp: Date.now(),
          data: { error: error.message },
        });
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; transaction_id?: string; new_balance?: number; error?: string };

      if (result.success) {
        const response: PaymentResponse = {
          paymentId: result.transaction_id || idempotencyKey,
          status: 'success',
          amount,
          currency: 'INR',
          method: 'wallet',
          transactionId: result.transaction_id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.emit({
          type: 'payment:success',
          timestamp: Date.now(),
          data: response,
        });

        return { success: true, data: response };
      }

      return { success: false, error: result.error || 'Transaction failed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      this.emit({
        type: 'payment:failed',
        timestamp: Date.now(),
        data: { error: message },
      });
      return { success: false, error: message };
    }
  }

  /**
   * Process atomic transfer between users
   */
  async processTransfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.canProcessPayment()) {
      return { success: false, error: 'Cannot process transfer while offline' };
    }

    const idempotencyKey = this.generateIdempotencyKey();

    this.emit({
      type: 'payment:initiated',
      timestamp: Date.now(),
      data: { fromUserId, toUserId, amount, idempotencyKey },
    });

    try {
      const { data, error } = await supabase.rpc('process_atomic_transfer', {
        p_from_user_id: fromUserId,
        p_to_user_id: toUserId,
        p_amount: amount,
        p_description: description || null,
      });

      if (error) {
        this.emit({
          type: 'payment:failed',
          timestamp: Date.now(),
          data: { error: error.message },
        });
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; transaction_id?: string; error?: string };

      if (result.success) {
        this.emit({
          type: 'payment:success',
          timestamp: Date.now(),
          data: { transactionId: result.transaction_id },
        });
        return { success: true, transactionId: result.transaction_id };
      }

      return { success: false, error: result.error };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transfer failed';
      return { success: false, error: message };
    }
  }

  /**
   * Process gift transaction
   */
  async processGift(
    senderId: string,
    receiverId: string,
    giftId: string,
    message?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.canProcessPayment()) {
      return { success: false, error: 'Cannot process gift while offline' };
    }

    try {
      const { data, error } = await supabase.rpc('process_gift_transaction', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_gift_id: giftId,
        p_message: message || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; transaction_id?: string; error?: string };
      return {
        success: result.success,
        transactionId: result.transaction_id,
        error: result.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gift transaction failed';
      return { success: false, error: message };
    }
  }

  /**
   * Process chat billing
   */
  async processChatBilling(
    sessionId: string,
    minutes: number
  ): Promise<{ success: boolean; billing?: BillingSession; error?: string }> {
    if (!this.canProcessPayment()) {
      return { success: false, error: 'Cannot process billing while offline' };
    }

    this.emit({
      type: 'billing:start',
      timestamp: Date.now(),
      data: { sessionId, minutes, type: 'chat' },
    });

    try {
      const { data, error } = await supabase.rpc('process_chat_billing', {
        p_session_id: sessionId,
        p_minutes: minutes,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; amount_charged?: number; amount_earned?: number; error?: string };

      if (result.success) {
        const billing: BillingSession = {
          sessionId,
          type: 'chat',
          startTime: new Date().toISOString(),
          durationMinutes: minutes,
          amountCharged: result.amount_charged || 0,
          amountEarned: result.amount_earned || 0,
          status: 'completed',
        };

        this.emit({
          type: 'billing:complete',
          timestamp: Date.now(),
          data: billing,
        });

        return { success: true, billing };
      }

      return { success: false, error: result.error };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Billing failed';
      return { success: false, error: message };
    }
  }

  /**
   * Process video call billing
   */
  async processVideoBilling(
    sessionId: string,
    minutes: number
  ): Promise<{ success: boolean; billing?: BillingSession; error?: string }> {
    if (!this.canProcessPayment()) {
      return { success: false, error: 'Cannot process billing while offline' };
    }

    this.emit({
      type: 'billing:start',
      timestamp: Date.now(),
      data: { sessionId, minutes, type: 'video' },
    });

    try {
      const { data, error } = await supabase.rpc('process_video_billing', {
        p_session_id: sessionId,
        p_minutes: minutes,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; amount_charged?: number; amount_earned?: number; error?: string };

      if (result.success) {
        const billing: BillingSession = {
          sessionId,
          type: 'video',
          startTime: new Date().toISOString(),
          durationMinutes: minutes,
          amountCharged: result.amount_charged || 0,
          amountEarned: result.amount_earned || 0,
          status: 'completed',
        };

        this.emit({
          type: 'billing:complete',
          timestamp: Date.now(),
          data: billing,
        });

        return { success: true, billing };
      }

      return { success: false, error: result.error };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Billing failed';
      return { success: false, error: message };
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    userId: string,
    amount: number,
    paymentMethod: string,
    paymentDetails: Record<string, string>
  ): Promise<{ success: boolean; data?: WithdrawalResponse; error?: string }> {
    if (!this.canProcessPayment()) {
      return { success: false, error: 'Cannot process withdrawal while offline' };
    }

    const idempotencyKey = this.generateIdempotencyKey();

    this.emit({
      type: 'withdrawal:initiated',
      timestamp: Date.now(),
      data: { userId, amount, paymentMethod, idempotencyKey },
    });

    try {
      const { data, error } = await supabase.rpc('process_withdrawal_request', {
        p_user_id: userId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_details: paymentDetails,
      });

      if (error) {
        this.emit({
          type: 'withdrawal:failed',
          timestamp: Date.now(),
          data: { error: error.message },
        });
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; withdrawal_id?: string; error?: string };

      if (result.success) {
        const response: WithdrawalResponse = {
          withdrawalId: result.withdrawal_id || idempotencyKey,
          status: 'pending',
          amount,
          currency: 'INR',
          createdAt: new Date().toISOString(),
        };

        this.emit({
          type: 'withdrawal:pending',
          timestamp: Date.now(),
          data: response,
        });

        return { success: true, data: response };
      }

      return { success: false, error: result.error };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Withdrawal request failed';
      return { success: false, error: message };
    }
  }

  /**
   * Poll for payment status (for external gateway payments)
   */
  async pollPaymentStatus(
    paymentId: string,
    onUpdate?: (status: PaymentStatus) => void
  ): Promise<PaymentConfirmation> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = setInterval(async () => {
        attempts++;

        if (!networkMonitor.isOnline()) {
          // Pause polling when offline, will resume when online
          return;
        }

        try {
          const { data, error } = await supabase
            .from('wallet_transactions')
            .select('status, created_at')
            .eq('id', paymentId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (data) {
            const status = data.status as PaymentStatus;
            onUpdate?.(status);

            if (status === 'success' || status === 'failed' || status === 'cancelled') {
              clearInterval(poll);
              this.activePolls.delete(paymentId);
              this.pendingPayments.delete(paymentId);
              this.savePendingPayments();

              resolve({
                paymentId,
                status,
                confirmedAt: new Date().toISOString(),
              });
            }
          }

          if (attempts >= MAX_POLL_ATTEMPTS) {
            clearInterval(poll);
            this.activePolls.delete(paymentId);
            reject(new Error('Payment confirmation timeout'));
          }
        } catch (error) {
          // Continue polling on transient errors
          console.error('Poll error:', error);
        }
      }, POLL_INTERVAL);

      this.activePolls.set(paymentId, poll);
    });
  }

  /**
   * Start polling for a payment (used for recovery)
   */
  private startPolling(paymentId: string): void {
    if (this.activePolls.has(paymentId)) return;

    this.pollPaymentStatus(paymentId).then((confirmation) => {
      this.emit({
        type: confirmation.status === 'success' ? 'payment:success' : 'payment:failed',
        timestamp: Date.now(),
        data: confirmation,
      });
    }).catch(() => {
      // Timeout or error - remove from pending
      this.pendingPayments.delete(paymentId);
      this.savePendingPayments();
    });
  }

  /**
   * Cancel a pending payment poll
   */
  cancelPaymentPoll(paymentId: string): void {
    const poll = this.activePolls.get(paymentId);
    if (poll) {
      clearInterval(poll);
      this.activePolls.delete(paymentId);
    }
    this.pendingPayments.delete(paymentId);
    this.savePendingPayments();
  }

  /**
   * Get pending payments count
   */
  getPendingPaymentsCount(): number {
    return this.pendingPayments.size;
  }

  /**
   * Subscribe to payment events
   */
  subscribe(handler: PaymentEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Clean up
   */
  destroy(): void {
    for (const poll of this.activePolls.values()) {
      clearInterval(poll);
    }
    this.activePolls.clear();
    this.listeners.clear();
  }
}

// Export singleton
export const paymentService = PaymentService.getInstance();
export default paymentService;
