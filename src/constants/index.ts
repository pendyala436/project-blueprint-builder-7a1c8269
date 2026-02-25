/**
 * Application Constants
 * 
 * Centralized constants for the application.
 * These are static values that don't change at runtime.
 * 
 * For dynamic configuration, use useAppSettings hook instead.
 */

// ============= App Info =============

export const APP_NAME = 'Meow Meow';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Find Your Purrfect Match';

// ============= Routes =============

export const ROUTES = {
  // Auth
  HOME: '/',
  FORGOT_PASSWORD: '/forgot-password',
  PASSWORD_RESET: '/password-reset',
  
  // Registration
  REGISTER: '/register',
  BASIC_INFO: '/basic-info',
  PASSWORD_SETUP: '/password-setup',
  PHOTO_UPLOAD: '/photo-upload',
  LOCATION_SETUP: '/location-setup',
  LANGUAGE_PREFERENCES: '/language-preferences',
  TERMS_AGREEMENT: '/terms-agreement',
  AI_PROCESSING: '/ai-processing',
  WELCOME_TUTORIAL: '/welcome-tutorial',
  REGISTRATION_COMPLETE: '/registration-complete',
  APPROVAL_PENDING: '/approval-pending',
  
  // Main App
  DASHBOARD: '/dashboard',
  WOMEN_DASHBOARD: '/women-dashboard',
  ONLINE_USERS: '/online-users',
  FIND_MATCH: '/find-match',
  MATCH_DISCOVERY: '/match-discovery',
  PROFILE: '/profile/:userId',
  CHAT: '/chat/:chatId',
  WALLET: '/wallet',
  WOMEN_WALLET: '/women-wallet',
  TRANSACTION_HISTORY: '/transaction-history',
  SETTINGS: '/settings',
  
  SHIFT_COMPLIANCE: '/shift-compliance',
  SEND_GIFT: '/send-gift/:receiverId',
  INSTALL: '/install',
  
  // Admin
  ADMIN: '/admin',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_USERS: '/admin/users',
  ADMIN_GIFTS: '/admin/gifts',
  ADMIN_LANGUAGES: '/admin/languages',
  ADMIN_CHAT_MONITORING: '/admin/chat-monitoring',
  ADMIN_FINANCE: '/admin/finance',
  ADMIN_FINANCE_REPORTS: '/admin/finance-reports',
  ADMIN_BACKUPS: '/admin/backups',
  ADMIN_LEGAL_DOCUMENTS: '/admin/legal-documents',
  ADMIN_CHAT_PRICING: '/admin/chat-pricing',
  ADMIN_PERFORMANCE: '/admin/performance',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_MODERATION: '/admin/moderation',
  ADMIN_POLICY_ALERTS: '/admin/policy-alerts',
  ADMIN_LANGUAGE_LIMITS: '/admin/language-limits',
  ADMIN_TRANSACTIONS: '/admin/transactions',
} as const;

// ============= Breakpoints =============

export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 768,
  LAPTOP: 1024,
  DESKTOP: 1280,
} as const;

// ============= Time Constants =============

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ============= Cache Durations =============

export const CACHE_DURATION = {
  SHORT: 1 * TIME.MINUTE,
  MEDIUM: 5 * TIME.MINUTE,
  LONG: 30 * TIME.MINUTE,
  VERY_LONG: 24 * TIME.HOUR,
} as const;

// ============= Limits =============

export const LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_BIO_LENGTH: 500,
  MAX_PHOTOS: 6,
  MAX_INTERESTS: 10,
  MAX_LANGUAGES: 5,
  MAX_FILE_SIZE_MB: 10,
  MAX_PARALLEL_CHATS: 3,
} as const;

// ============= Currency =============

export const CURRENCY = {
  DEFAULT: 'INR',
  SYMBOL: '₹',
  SUPPORTED: ['INR', 'USD', 'EUR'] as const,
} as const;

// ============= Storage Keys =============

export const STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'language',
  AUTH_TOKEN: 'supabase.auth.token',
  USER_PREFERENCES: 'user_preferences',
  PWA_INSTALLED: 'pwa_installed',
  TUTORIAL_COMPLETED: 'tutorial_completed',
} as const;

// ============= Regex Patterns =============

export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-]{10,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const;

// ============= Gender Options =============

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

// ============= Account Status =============

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
} as const;

// ============= Approval Status =============

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
