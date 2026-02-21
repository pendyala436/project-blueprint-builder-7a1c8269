/**
 * ULTRA-OPTIMIZED App Component
 * Target: Sub-second initial render
 * 
 * TRANSLATION: Models are preloaded on app startup for reliable browser-based translation
 */

import { lazy, Suspense, memo, startTransition, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { preloadBaseFonts } from "@/lib/fonts";
// Browser-based translation removed - using edge function

// Critical components - no lazy for stability
import AuthScreen from "./pages/AuthScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { I18nProvider } from "@/components/I18nProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

// Preload base fonts immediately (non-blocking)
preloadBaseFonts();

// Defer non-critical imports
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const SecurityProvider = lazy(() => import("@/components/SecurityProvider"));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const NetworkStatusIndicator = lazy(() => import("@/components/NetworkStatusIndicator").then(m => ({ default: m.NetworkStatusIndicator })));
const AutoLogoutWrapper = lazy(() => import("@/components/AutoLogoutWrapper"));
// TranslationLoadingIndicator removed - browser-based models no longer used

// Preload dashboard routes immediately after first paint
if (typeof window !== 'undefined') {
  const preload = () => {
    startTransition(() => {
      import("./pages/DashboardScreen").catch(() => undefined);
      import("./pages/WomenDashboardScreen").catch(() => undefined);
    });
  };
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 500 });
  } else {
    setTimeout(preload, 100);
  }
}

// Lazy load all routes with chunk naming for better caching
const ForgotPasswordScreen = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/ForgotPasswordScreen"));
const LanguageCountryScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/LanguageCountryScreen"));
const BasicInfoScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/BasicInfoScreen"));
const PersonalDetailsScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/PersonalDetailsScreen"));
const PhotoUploadScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/PhotoUploadScreen"));
const LocationSetupScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/LocationSetupScreen"));
const LanguagePreferencesScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/LanguagePreferencesScreen"));
const TermsAgreementScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/TermsAgreementScreen"));
const PasswordSetupScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/PasswordSetupScreen"));
const AIProcessingScreen = lazy(() => import(/* webpackChunkName: "register" */ "./pages/AIProcessingScreen"));
const WelcomeTutorialScreen = lazy(() => import(/* webpackChunkName: "onboard" */ "./pages/WelcomeTutorialScreen"));
const RegistrationCompleteScreen = lazy(() => import(/* webpackChunkName: "onboard" */ "./pages/RegistrationCompleteScreen"));
const DashboardScreen = lazy(() => import(/* webpackChunkName: "dashboard" */ "./pages/DashboardScreen"));
const OnlineUsersScreen = lazy(() => import(/* webpackChunkName: "dashboard" */ "./pages/OnlineUsersScreen"));
const MatchingScreen = lazy(() => import(/* webpackChunkName: "matching" */ "./pages/MatchingScreen"));
const MatchDiscoveryScreen = lazy(() => import(/* webpackChunkName: "matching" */ "./pages/MatchDiscoveryScreen"));
const ProfileDetailScreen = lazy(() => import(/* webpackChunkName: "profile" */ "./pages/ProfileDetailScreen"));
// ChatScreen removed - chats now handled via parallel chat windows on dashboard
const WalletScreen = lazy(() => import(/* webpackChunkName: "wallet" */ "./pages/WalletScreen"));
const TransactionHistoryScreen = lazy(() => import(/* webpackChunkName: "wallet" */ "./pages/TransactionHistoryScreen"));
const SettingsScreen = lazy(() => import(/* webpackChunkName: "settings" */ "./pages/SettingsScreen"));

const WomenDashboardScreen = lazy(() => import(/* webpackChunkName: "women" */ "./pages/WomenDashboardScreen"));
const WomenWalletScreen = lazy(() => import(/* webpackChunkName: "women" */ "./pages/WomenWalletScreen"));
const ApprovalPendingScreen = lazy(() => import(/* webpackChunkName: "women" */ "./pages/ApprovalPendingScreen"));
const AdminAnalyticsDashboard = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminAnalyticsDashboard"));
const AdminDashboard = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminUserManagement"));
const AdminGiftPricing = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminGiftPricing"));
const AdminLanguageGroups = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminLanguageGroups"));
const AdminChatMonitoring = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminChatMonitoring"));
const AdminFinanceDashboard = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminFinanceDashboard"));
const AdminFinanceReports = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminFinanceReports"));
const AdminBackupManagement = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminBackupManagement"));
const AdminLegalDocuments = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminLegalDocuments"));
const AdminChatPricing = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminChatPricing"));
const AdminPerformanceMonitoring = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminPerformanceMonitoring"));
const AdminSettings = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminSettings"));
const AdminAuditLogs = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminAuditLogs"));
const AdminModerationScreen = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminModerationScreen"));
const GiftSendingScreen = lazy(() => import(/* webpackChunkName: "gifts" */ "./pages/GiftSendingScreen"));
const ShiftComplianceScreen = lazy(() => import(/* webpackChunkName: "shifts" */ "./pages/ShiftComplianceScreen"));
const AdminPolicyAlerts = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminPolicyAlerts"));
const AdminLanguageLimits = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminLanguageLimits"));
const PasswordResetScreen = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/PasswordResetScreen"));
const PasswordResetSuccessScreen = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/PasswordResetSuccessScreen"));
const AdminTransactionHistory = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminTransactionHistory"));
const AdminKYCManagement = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminKYCManagement"));
const NotFound = lazy(() => import(/* webpackChunkName: "error" */ "./pages/NotFound"));
const InstallApp = lazy(() => import(/* webpackChunkName: "pwa" */ "./pages/InstallApp"));
// Translation test pages removed

// Ultra-optimized React Query - maximum caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 60 * 60 * 1000, // 1 hour gc
      retry: 0, // No retries for speed
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

// Instant loader - no spinner, just background
const RouteLoader = memo(() => (
  <div className="min-h-screen bg-background" />
));
RouteLoader.displayName = 'RouteLoader';

// Optimized lazy route wrapper
const LazyRoute = memo(({ component: Component }: { component: React.ComponentType }) => (
  <Suspense fallback={<RouteLoader />}>
    <Component />
  </Suspense>
));
LazyRoute.displayName = 'LazyRoute';

// Minimal shell for fastest possible render
const AppShell = memo(({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <TranslationProvider>
            <TooltipProvider>
              <Suspense fallback={null}>
                <SecurityProvider
                  enableDevToolsDetection={false}
                  enableKeyboardBlocking={false}
                  enableConsoleProtection={false}
                >
                  <Suspense fallback={null}>
                    <Toaster />
                    <Sonner />
                    <PWAInstallPrompt />
                    <NetworkStatusIndicator className="fixed bottom-4 left-4 z-50" />
                    
                  </Suspense>
                  {children}
                </SecurityProvider>
              </Suspense>
            </TooltipProvider>
          </TranslationProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
));
AppShell.displayName = 'AppShell';

const App = () => (
  <AppShell>
    <BrowserRouter>
      <Suspense fallback={null}>
        <AutoLogoutWrapper>
          <Routes>
            {/* Auth route - eagerly loaded for instant render */}
            <Route path="/" element={<AuthScreen />} />
            
            {/* Lazy routes - grouped by feature */}
            <Route path="/forgot-password" element={<LazyRoute component={ForgotPasswordScreen} />} />
            <Route path="/reset-password" element={<LazyRoute component={PasswordResetScreen} />} />
            <Route path="/password-reset-success" element={<LazyRoute component={PasswordResetSuccessScreen} />} />
            <Route path="/register" element={<LazyRoute component={LanguageCountryScreen} />} />
            <Route path="/basic-info" element={<LazyRoute component={BasicInfoScreen} />} />
            <Route path="/personal-details" element={<LazyRoute component={PersonalDetailsScreen} />} />
            <Route path="/photo-upload" element={<LazyRoute component={PhotoUploadScreen} />} />
            <Route path="/location-setup" element={<LazyRoute component={LocationSetupScreen} />} />
            <Route path="/language-preferences" element={<LazyRoute component={LanguagePreferencesScreen} />} />
            <Route path="/terms-agreement" element={<LazyRoute component={TermsAgreementScreen} />} />
            <Route path="/password-setup" element={<LazyRoute component={PasswordSetupScreen} />} />
            <Route path="/ai-processing" element={<LazyRoute component={AIProcessingScreen} />} />
            <Route path="/welcome-tutorial" element={<LazyRoute component={WelcomeTutorialScreen} />} />
            <Route path="/registration-complete" element={<LazyRoute component={RegistrationCompleteScreen} />} />
            <Route path="/dashboard" element={<LazyRoute component={DashboardScreen} />} />
            <Route path="/online-users" element={<LazyRoute component={OnlineUsersScreen} />} />
            <Route path="/find-match" element={<LazyRoute component={MatchingScreen} />} />
            <Route path="/match-discovery" element={<LazyRoute component={MatchDiscoveryScreen} />} />
            <Route path="/profile/:userId" element={<LazyRoute component={ProfileDetailScreen} />} />
            {/* Chat route removed - chats handled via parallel chat windows on dashboard */}
            <Route path="/wallet" element={<LazyRoute component={WalletScreen} />} />
            <Route path="/transaction-history" element={<LazyRoute component={TransactionHistoryScreen} />} />
            <Route path="/transactions" element={<LazyRoute component={TransactionHistoryScreen} />} />
            <Route path="/settings" element={<LazyRoute component={SettingsScreen} />} />
            
            <Route path="/women-dashboard" element={<LazyRoute component={WomenDashboardScreen} />} />
            <Route path="/women-wallet" element={<LazyRoute component={WomenWalletScreen} />} />
            <Route path="/approval-pending" element={<LazyRoute component={ApprovalPendingScreen} />} />
            <Route path="/admin" element={<LazyRoute component={AdminDashboard} />} />
            <Route path="/admin/analytics" element={<LazyRoute component={AdminAnalyticsDashboard} />} />
            <Route path="/admin/users" element={<LazyRoute component={AdminUserManagement} />} />
            <Route path="/admin/gifts" element={<LazyRoute component={AdminGiftPricing} />} />
            <Route path="/admin/languages" element={<LazyRoute component={AdminLanguageGroups} />} />
            <Route path="/admin/chat-monitoring" element={<LazyRoute component={AdminChatMonitoring} />} />
            <Route path="/admin/finance" element={<LazyRoute component={AdminFinanceDashboard} />} />
            <Route path="/admin/finance-reports" element={<LazyRoute component={AdminFinanceReports} />} />
            <Route path="/admin/backups" element={<LazyRoute component={AdminBackupManagement} />} />
            <Route path="/admin/legal-documents" element={<LazyRoute component={AdminLegalDocuments} />} />
            <Route path="/admin/chat-pricing" element={<LazyRoute component={AdminChatPricing} />} />
            <Route path="/admin/performance" element={<LazyRoute component={AdminPerformanceMonitoring} />} />
            <Route path="/admin/settings" element={<LazyRoute component={AdminSettings} />} />
            <Route path="/admin/audit-logs" element={<LazyRoute component={AdminAuditLogs} />} />
            <Route path="/send-gift/:receiverId" element={<LazyRoute component={GiftSendingScreen} />} />
            <Route path="/shift-compliance" element={<LazyRoute component={ShiftComplianceScreen} />} />
            <Route path="/admin/moderation" element={<LazyRoute component={AdminModerationScreen} />} />
            <Route path="/admin/policy-alerts" element={<LazyRoute component={AdminPolicyAlerts} />} />
            <Route path="/admin/language-limits" element={<LazyRoute component={AdminLanguageLimits} />} />
            <Route path="/admin/transactions" element={<LazyRoute component={AdminTransactionHistory} />} />
            <Route path="/admin/kyc" element={<LazyRoute component={AdminKYCManagement} />} />
            <Route path="/install" element={<LazyRoute component={InstallApp} />} />
            {/* Translation test routes removed */}
            <Route path="*" element={<LazyRoute component={NotFound} />} />
          </Routes>
        </AutoLogoutWrapper>
      </Suspense>
    </BrowserRouter>
  </AppShell>
);

export default memo(App);
