/**
 * Unified API Layer Export
 * 
 * Re-exports all API utilities for easy importing throughout the app.
 */

// Core API exports
export * from './api/index';

// Payment exports
export { paymentService } from './api/payment-service';
export type {
  PaymentStatus,
  PaymentMethod,
  PaymentRequest,
  PaymentResponse,
  PaymentConfirmation,
  WithdrawalRequest,
  WithdrawalResponse,
  BillingSession,
  PaymentEventType,
  PaymentEvent,
  PaymentEventHandler,
} from './api/payment-types';
