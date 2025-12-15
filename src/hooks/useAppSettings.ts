/**
 * useAppSettings Hook
 * 
 * PURPOSE: Fetches dynamic application settings from the database.
 * Eliminates hardcoded values by loading configuration from app_settings table.
 * 
 * ACID COMPLIANCE:
 * - Atomicity: Settings are fetched in a single transaction
 * - Consistency: Default values ensure valid state
 * - Isolation: Uses realtime subscriptions for updates
 * - Durability: Settings persist in database
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// Currency rate type
interface CurrencyRate {
  rate: number;
  symbol: string;
  code: string;
}

// Payment gateway type
interface PaymentGateway {
  id: string;
  name: string;
  logo: string;
  description: string;
  features: string[];
}

interface PaymentGateways {
  indian: PaymentGateway[];
  international: PaymentGateway[];
}

// Type definitions for settings
interface AppSettings {
  // Wallet settings
  rechargeAmounts: number[];
  withdrawalAmounts: number[];
  supportedCurrencies: string[];
  defaultCurrency: string;
  withdrawalProcessingHours: number;
  currencyRates: Record<string, CurrencyRate>;
  paymentGateways: PaymentGateways;
  
  // Chat settings
  maxParallelChats: number;
  maxReconnectAttempts: number;
  maxMessageLength: number;
  
  // Video settings
  minVideoCallBalance: number;
  
  // UI settings
  mobileBreakpoint: number;
  
  // Security settings
  sessionTimeoutMinutes: number;
  
  // Storage settings
  maxFileUploadMb: number;
}

// Default fallback values (only used if database is unavailable)
const DEFAULT_SETTINGS: AppSettings = {
  rechargeAmounts: [100, 500, 1000, 2000, 5000, 10000],
  withdrawalAmounts: [500, 1000, 2000, 5000, 10000],
  supportedCurrencies: ["INR", "USD", "EUR"],
  defaultCurrency: "INR",
  withdrawalProcessingHours: 24,
  currencyRates: {
    IN: { rate: 1, symbol: "₹", code: "INR" },
    US: { rate: 0.012, symbol: "$", code: "USD" },
    GB: { rate: 0.0095, symbol: "£", code: "GBP" },
    EU: { rate: 0.011, symbol: "€", code: "EUR" },
    DEFAULT: { rate: 0.012, symbol: "$", code: "USD" },
  },
  paymentGateways: {
    indian: [
      { id: "razorpay", name: "Razorpay", logo: "🇮🇳", description: "UPI, Cards, Netbanking", features: ["UPI", "Cards", "Netbanking"] },
    ],
    international: [
      { id: "stripe", name: "Stripe", logo: "💎", description: "Cards, Apple Pay, Google Pay", features: ["Cards", "Apple Pay", "Google Pay"] },
    ],
  },
  maxParallelChats: 3,
  maxReconnectAttempts: 3,
  maxMessageLength: 2000,
  minVideoCallBalance: 50,
  mobileBreakpoint: 768,
  sessionTimeoutMinutes: 30,
  maxFileUploadMb: 10,
};

// Setting key to property mapping
const SETTING_KEY_MAP: Record<string, keyof AppSettings> = {
  recharge_amounts: "rechargeAmounts",
  withdrawal_amounts: "withdrawalAmounts",
  supported_currencies: "supportedCurrencies",
  default_currency: "defaultCurrency",
  withdrawal_processing_hours: "withdrawalProcessingHours",
  currency_rates: "currencyRates",
  payment_gateways: "paymentGateways",
  max_parallel_chats: "maxParallelChats",
  max_reconnect_attempts: "maxReconnectAttempts",
  max_message_length: "maxMessageLength",
  min_video_call_balance: "minVideoCallBalance",
  mobile_breakpoint: "mobileBreakpoint",
  session_timeout_minutes: "sessionTimeoutMinutes",
  max_file_upload_mb: "maxFileUploadMb",
};

export const useAppSettings = () => {
  // State for settings
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches all public settings from the database
   * Parses JSON values and maps to typed settings object
   */
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Query all public settings
      const { data, error: fetchError } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value, setting_type")
        .eq("is_public", true);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Parse settings into typed object
        const parsedSettings: Partial<AppSettings> = {};

        data.forEach((row: any) => {
          const propertyName = SETTING_KEY_MAP[row.setting_key];
          if (propertyName) {
            // Parse value based on type
            let value: any;
            try {
              if (row.setting_type === "json") {
                value = typeof row.setting_value === "string" 
                  ? JSON.parse(row.setting_value)
                  : row.setting_value;
              } else if (row.setting_type === "number") {
                value = typeof row.setting_value === "string"
                  ? parseFloat(row.setting_value)
                  : row.setting_value;
              } else {
                value = row.setting_value;
              }
              (parsedSettings as any)[propertyName] = value;
            } catch (parseError) {
              console.warn(`Failed to parse setting ${row.setting_key}:`, parseError);
            }
          }
        });

        // Merge with defaults for any missing settings
        setSettings(prev => ({
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
        }));
      }
    } catch (err) {
      console.error("Error fetching app settings:", err);
      setError(err instanceof Error ? err.message : "Failed to load settings");
      // Keep default settings on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Real-time subscription for settings updates
  useRealtimeSubscription({
    table: "app_settings" as any,
    onUpdate: fetchSettings,
  });

  /**
   * Get a specific setting value with type safety
   */
  const getSetting = <K extends keyof AppSettings>(key: K): AppSettings[K] => {
    return settings[key];
  };

  return {
    settings,
    isLoading,
    error,
    getSetting,
    refetch: fetchSettings,
  };
};

export default useAppSettings;

// Note: useChatPricing is now in its own file: src/hooks/useChatPricing.ts
// Import it from there: import { useChatPricing } from '@/hooks/useChatPricing';
