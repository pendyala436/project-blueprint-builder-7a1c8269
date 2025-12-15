/**
 * Payment Status Indicator Component
 * 
 * Shows payment processing status with loading, success, and error states.
 */

import React from 'react';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentStatus } from '@/lib/api/payment-types';

interface PaymentStatusIndicatorProps {
  status: PaymentStatus | null;
  isProcessing?: boolean;
  message?: string;
  className?: string;
}

export function PaymentStatusIndicator({
  status,
  isProcessing = false,
  message,
  className,
}: PaymentStatusIndicatorProps) {
  const getStatusConfig = () => {
    if (isProcessing || status === 'processing') {
      return {
        icon: Loader2,
        iconClass: 'animate-spin text-primary',
        bgClass: 'bg-primary/10',
        textClass: 'text-primary',
        label: 'Processing payment...',
      };
    }

    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          iconClass: 'text-yellow-500',
          bgClass: 'bg-yellow-500/10',
          textClass: 'text-yellow-600 dark:text-yellow-400',
          label: 'Payment pending',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          iconClass: 'text-green-500',
          bgClass: 'bg-green-500/10',
          textClass: 'text-green-600 dark:text-green-400',
          label: 'Payment successful',
        };
      case 'failed':
        return {
          icon: XCircle,
          iconClass: 'text-destructive',
          bgClass: 'bg-destructive/10',
          textClass: 'text-destructive',
          label: 'Payment failed',
        };
      case 'cancelled':
        return {
          icon: AlertCircle,
          iconClass: 'text-muted-foreground',
          bgClass: 'bg-muted',
          textClass: 'text-muted-foreground',
          label: 'Payment cancelled',
        };
      case 'refunded':
        return {
          icon: AlertCircle,
          iconClass: 'text-blue-500',
          bgClass: 'bg-blue-500/10',
          textClass: 'text-blue-600 dark:text-blue-400',
          label: 'Payment refunded',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
        config.bgClass,
        className
      )}
    >
      <Icon className={cn('h-5 w-5', config.iconClass)} />
      <div className="flex flex-col">
        <span className={cn('text-sm font-medium', config.textClass)}>
          {message || config.label}
        </span>
      </div>
    </div>
  );
}

export default PaymentStatusIndicator;
