/**
 * ULTRA-OPTIMIZED App Component
 * Target: Sub-2ms cached response, minimal wrapper overhead
 * Translation/i18n removed - plain English only
 */

import { lazy, Suspense, memo, startTransition, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Critical components - no lazy for stability
import AuthScreen from "./pages/AuthScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";

// Defer non-critical imports
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const SecurityProvider = lazy(() => import("@/components/SecurityProvider"));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const NetworkStatusIndicator = lazy(() => import("@/components/NetworkStatusIndicator").then(m => ({ default: m.NetworkStatusIndicator })));
const AutoLogoutWrapper = lazy(() => import("@/components/AutoLogoutWrapper"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));

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
const AdminUserLookup = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminUserLookup"));
const AdminMessaging = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/AdminMessaging"));
const NotFound = lazy(() => import(/* webpackChunkName: "error" */ "./pages/NotFound"));
const InstallApp = lazy(() => import(/* webpackChunkName: "pwa" */ "./pages/InstallApp"));
// Translation test pages removed

// Ultra-optimized React Query - maximum caching, sub-2ms response for cached data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 60 * 60 * 1000, // 1 hour gc
      retry: 1, // Single retry for reliability
      retryDelay: 500,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: 'always',
      networkMode: 'offlineFirst',
      // Structural sharing for sub-2ms re-render checks
      structuralSharing: true,
      // Placeholder data to prevent loading flicker
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      retry: 1,
      retryDelay: 500,
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
const LazyRoute = memo(({ component: Component, requiredRole }: { component: React.ComponentType; requiredRole?: 'male' | 'female' | 'admin' | 'authenticated' }) => (
  <Suspense fallback={<RouteLoader />}>
    {requiredRole ? (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component />
      </ProtectedRoute>
    ) : (
      <Component />
    )}
  </Suspense>
));
LazyRoute.displayName = 'LazyRoute';

// Minimal shell - zero translation overhead
const AppShell = memo(({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={null}>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <NetworkStatusIndicator className="fixed bottom-4 left-4 z-50" />
          </Suspense>
          {children}
        </TooltipProvider>
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
            <Route path="/dashboard" element={<LazyRoute component={DashboardScreen} requiredRole="male" />} />
            <Route path="/online-users" element={<LazyRoute component={OnlineUsersScreen} requiredRole="male" />} />
            <Route path="/find-match" element={<LazyRoute component={MatchingScreen} requiredRole="male" />} />
            <Route path="/match-discovery" element={<LazyRoute component={MatchDiscoveryScreen} requiredRole="male" />} />
            <Route path="/profile/:userId" element={<LazyRoute component={ProfileDetailScreen} requiredRole="authenticated" />} />
            {/* Chat route removed - chats handled via parallel chat windows on dashboard */}
            <Route path="/wallet" element={<LazyRoute component={WalletScreen} requiredRole="authenticated" />} />
            <Route path="/transaction-history" element={<LazyRoute component={TransactionHistoryScreen} requiredRole="authenticated" />} />
            <Route path="/transactions" element={<LazyRoute component={TransactionHistoryScreen} requiredRole="authenticated" />} />
            <Route path="/settings" element={<LazyRoute component={SettingsScreen} requiredRole="authenticated" />} />
            
            <Route path="/women-dashboard" element={<LazyRoute component={WomenDashboardScreen} requiredRole="female" />} />
            <Route path="/women-wallet" element={<LazyRoute component={WomenWalletScreen} requiredRole="female" />} />
            <Route path="/approval-pending" element={<LazyRoute component={ApprovalPendingScreen} requiredRole="female" />} />
            <Route path="/admin" element={<LazyRoute component={AdminDashboard} requiredRole="admin" />} />
            <Route path="/admin/analytics" element={<LazyRoute component={AdminAnalyticsDashboard} requiredRole="admin" />} />
            <Route path="/admin/users" element={<LazyRoute component={AdminUserManagement} requiredRole="admin" />} />
            <Route path="/admin/gifts" element={<LazyRoute component={AdminGiftPricing} requiredRole="admin" />} />
            <Route path="/admin/languages" element={<LazyRoute component={AdminLanguageGroups} requiredRole="admin" />} />
            <Route path="/admin/chat-monitoring" element={<LazyRoute component={AdminChatMonitoring} requiredRole="admin" />} />
            <Route path="/admin/finance" element={<LazyRoute component={AdminFinanceDashboard} requiredRole="admin" />} />
            <Route path="/admin/finance-reports" element={<LazyRoute component={AdminFinanceReports} requiredRole="admin" />} />
            <Route path="/admin/backups" element={<LazyRoute component={AdminBackupManagement} requiredRole="admin" />} />
            <Route path="/admin/legal-documents" element={<LazyRoute component={AdminLegalDocuments} requiredRole="admin" />} />
            <Route path="/admin/chat-pricing" element={<LazyRoute component={AdminChatPricing} requiredRole="admin" />} />
            <Route path="/admin/performance" element={<LazyRoute component={AdminPerformanceMonitoring} requiredRole="admin" />} />
            <Route path="/admin/settings" element={<LazyRoute component={AdminSettings} requiredRole="admin" />} />
            <Route path="/admin/audit-logs" element={<LazyRoute component={AdminAuditLogs} requiredRole="admin" />} />
            <Route path="/send-gift/:receiverId" element={<LazyRoute component={GiftSendingScreen} requiredRole="authenticated" />} />
            <Route path="/shift-compliance" element={<LazyRoute component={ShiftComplianceScreen} requiredRole="female" />} />
            <Route path="/admin/moderation" element={<LazyRoute component={AdminModerationScreen} requiredRole="admin" />} />
            <Route path="/admin/policy-alerts" element={<LazyRoute component={AdminPolicyAlerts} requiredRole="admin" />} />
            <Route path="/admin/language-limits" element={<LazyRoute component={AdminLanguageLimits} requiredRole="admin" />} />
            <Route path="/admin/transactions" element={<LazyRoute component={AdminTransactionHistory} requiredRole="admin" />} />
            <Route path="/admin/kyc" element={<LazyRoute component={AdminKYCManagement} requiredRole="admin" />} />
            <Route path="/admin/user-lookup" element={<LazyRoute component={AdminUserLookup} requiredRole="admin" />} />
            <Route path="/admin/messaging" element={<LazyRoute component={AdminMessaging} requiredRole="admin" />} />
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
