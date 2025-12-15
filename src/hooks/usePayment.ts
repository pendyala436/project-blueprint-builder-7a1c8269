/**
 * usePayment Hook
 * 
 * React hook for async payment operations with state management.
 * Handles loading states, success/error handling, and offline awareness.
 */

import { useState, useCallback, useEffect } from 'react';
import { paymentService } from '@/lib/api/payment-service';
import { networkMonitor } from '@/lib/api';
import type { 
  PaymentStatus, 
  PaymentResponse, 
  WithdrawalResponse,
  BillingSession,
} from '@/lib/api/payment-types';

interface PaymentState {
  isProcessing: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  status: PaymentStatus | null;
}

interface UsePaymentReturn extends PaymentState {
  canProcess: boolean;
  isOnline: boolean;
  initiateWalletPayment: (
    userId: string,
    amount: number,
    type: 'credit' | 'debit',
    description?: string
  ) => Promise<{ success: boolean; data?: PaymentResponse; error?: string }>;
  processTransfer: (
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string
  ) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  processGift: (
    senderId: string,
    receiverId: string,
    giftId: string,
    message?: string
  ) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  processChatBilling: (
    sessionId: string,
    minutes: number
  ) => Promise<{ success: boolean; billing?: BillingSession; error?: string }>;
  processVideoBilling: (
    sessionId: string,
    minutes: number
  ) => Promise<{ success: boolean; billing?: BillingSession; error?: string }>;
  requestWithdrawal: (
    userId: string,
    amount: number,
    paymentMethod: string,
    paymentDetails: Record<string, string>
  ) => Promise<{ success: boolean; data?: WithdrawalResponse; error?: string }>;
  reset: () => void;
}

/**
 * Hook for managing payment operations with state
 */
export function usePayment(): UsePaymentReturn {
  const [state, setState] = useState<PaymentState>({
    isProcessing: false,
    isSuccess: false,
    isError: false,
    error: null,
    status: null,
  });

  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline());

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe((event) => {
      if (event.type === 'network:online') {
        setIsOnline(true);
      } else if (event.type === 'network:offline') {
        setIsOnline(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      isSuccess: false,
      isError: false,
      error: null,
      status: null,
    });
  }, []);

  const setProcessing = useCallback(() => {
    setState({
      isProcessing: true,
      isSuccess: false,
      isError: false,
      error: null,
      status: 'processing',
    });
  }, []);

  const setSuccess = useCallback((status: PaymentStatus = 'success') => {
    setState({
      isProcessing: false,
      isSuccess: true,
      isError: false,
      error: null,
      status,
    });
  }, []);

  const setError = useCallback((error: string) => {
    setState({
      isProcessing: false,
      isSuccess: false,
      isError: true,
      error,
      status: 'failed',
    });
  }, []);

  const initiateWalletPayment = useCallback(async (
    userId: string,
    amount: number,
    type: 'credit' | 'debit',
    description?: string
  ) => {
    setProcessing();
    const result = await paymentService.initiateWalletPayment(userId, amount, type, description);
    
    if (result.success) {
      setSuccess();
    } else {
      setError(result.error || 'Payment failed');
    }
    
    return result;
  }, [setProcessing, setSuccess, setError]);

  const processTransfer = useCallback(async (
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string
  ) => {
    setProcessing();
    const result = await paymentService.processTransfer(fromUserId, toUserId, amount, description);
    
    if (result.success) {
      setSuccess();
    } else {
      setError(result.error || 'Transfer failed');
    }
    
    return result;
  }, [setProcessing, setSuccess, setError]);

  const processGift = useCallback(async (
    senderId: string,
    receiverId: string,
    giftId: string,
    message?: string
  ) => {
    setProcessing();
    const result = await paymentService.processGift(senderId, receiverId, giftId, message);
    
    if (result.success) {
      setSuccess();
    } else {
      setError(result.error || 'Gift transaction failed');
    }
    
    return result;
  }, [setProcessing, setSuccess, setError]);

  const processChatBilling = useCallback(async (
    sessionId: string,
    minutes: number
  ) => {
    setProcessing();
    const result = await paymentService.processChatBilling(sessionId, minutes);
    
    if (result.success) {
      setSuccess();
    } else {
      setError(result.error || 'Billing failed');
    }
    
    return result;
  }, [setProcessing, setSuccess, setError]);

  const processVideoBilling = useCallback(async (
    sessionId: string,
    minutes: number
  ) => {
    setProcessing();
    const result = await paymentService.processVideoBilling(sessionId, minutes);
    
    if (result.success) {
      setSuccess();
    } else {
      setError(result.error || 'Billing failed');
    }
    
    return result;
  }, [setProcessing, setSuccess, setError]);

  const requestWithdrawal = useCallback(async (
    userId: string,
    amount: number,
    paymentMethod: string,
    paymentDetails: Record<string, string>
  ) => {
    setProcessing();
    const result = await paymentService.requestWithdrawal(userId, amount, paymentMethod, paymentDetails);
    
    if (result.success) {
      setSuccess('pending');
    } else {
      setError(result.error || 'Withdrawal request failed');
    }
    
    return result;
  }, [setProcessing, setSuccess, setError]);

  return {
    ...state,
    canProcess: isOnline,
    isOnline,
    initiateWalletPayment,
    processTransfer,
    processGift,
    processChatBilling,
    processVideoBilling,
    requestWithdrawal,
    reset: resetState,
  };
}

export default usePayment;
