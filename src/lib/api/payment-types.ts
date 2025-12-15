/**
 * Payment Types
 * 
 * Types for async payment processing.
 */

// Payment status
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'refunded';

// Payment methods
export type PaymentMethod = 
  | 'wallet'
  | 'upi'
  | 'card'
  | 'netbanking'
  | 'razorpay'
  | 'stripe'
  | 'paypal';

// Payment request
export interface PaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

// Payment response
export interface PaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  transactionId?: string;
  gatewayResponse?: unknown;
  createdAt: string;
  updatedAt: string;
}

// Payment confirmation (from webhook/polling)
export interface PaymentConfirmation {
  paymentId: string;
  status: PaymentStatus;
  confirmedAt: string;
  transactionId?: string;
  failureReason?: string;
}

// Withdrawal request
export interface WithdrawalRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentDetails: Record<string, string>;
  idempotencyKey: string;
}

// Withdrawal response
export interface WithdrawalResponse {
  withdrawalId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  estimatedArrival?: string;
  createdAt: string;
}

// Billing session
export interface BillingSession {
  sessionId: string;
  type: 'chat' | 'video';
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  amountCharged: number;
  amountEarned: number;
  status: 'active' | 'completed' | 'failed';
}

// Payment event types
export type PaymentEventType =
  | 'payment:initiated'
  | 'payment:pending'
  | 'payment:success'
  | 'payment:failed'
  | 'payment:cancelled'
  | 'withdrawal:initiated'
  | 'withdrawal:pending'
  | 'withdrawal:success'
  | 'withdrawal:failed'
  | 'billing:start'
  | 'billing:update'
  | 'billing:complete';

export interface PaymentEvent {
  type: PaymentEventType;
  timestamp: number;
  data: unknown;
}

export type PaymentEventHandler = (event: PaymentEvent) => void;
