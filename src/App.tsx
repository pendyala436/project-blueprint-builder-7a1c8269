/**
 * Main Application Component - Performance Optimized
 * 
 * Features:
 * - Lazy loading for all routes
 * - Optimized React Query configuration
 * - Minimal initial bundle
 */

import { lazy, Suspense, memo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/components/I18nProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

// Eager load critical path
import AuthScreen from "./pages/AuthScreen";

// Lazy load non-critical components
const SecurityProvider = lazy(() => import("@/components/SecurityProvider"));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));

// Lazy load all routes
const ForgotPasswordScreen = lazy(() => import("./pages/ForgotPasswordScreen"));
const LanguageCountryScreen = lazy(() => import("./pages/LanguageCountryScreen"));
const BasicInfoScreen = lazy(() => import("./pages/BasicInfoScreen"));
const PasswordSetupScreen = lazy(() => import("./pages/PasswordSetupScreen"));
const PhotoUploadScreen = lazy(() => import("./pages/PhotoUploadScreen"));
const LocationSetupScreen = lazy(() => import("./pages/LocationSetupScreen"));
const LanguagePreferencesScreen = lazy(() => import("./pages/LanguagePreferencesScreen"));
const TermsAgreementScreen = lazy(() => import("./pages/TermsAgreementScreen"));
const AIProcessingScreen = lazy(() => import("./pages/AIProcessingScreen"));
const WelcomeTutorialScreen = lazy(() => import("./pages/WelcomeTutorialScreen"));
const RegistrationCompleteScreen = lazy(() => import("./pages/RegistrationCompleteScreen"));
const DashboardScreen = lazy(() => import("./pages/DashboardScreen"));
const OnlineUsersScreen = lazy(() => import("./pages/OnlineUsersScreen"));
const MatchingScreen = lazy(() => import("./pages/MatchingScreen"));
const MatchDiscoveryScreen = lazy(() => import("./pages/MatchDiscoveryScreen"));
const ProfileDetailScreen = lazy(() => import("./pages/ProfileDetailScreen"));
const ChatScreen = lazy(() => import("./pages/ChatScreen"));
const WalletScreen = lazy(() => import("./pages/WalletScreen"));
const TransactionHistoryScreen = lazy(() => import("./pages/TransactionHistoryScreen"));
const SettingsScreen = lazy(() => import("./pages/SettingsScreen"));
const ShiftManagementScreen = lazy(() => import("./pages/ShiftManagementScreen"));
const WomenDashboardScreen = lazy(() => import("./pages/WomenDashboardScreen"));
const WomenWalletScreen = lazy(() => import("./pages/WomenWalletScreen"));
const ApprovalPendingScreen = lazy(() => import("./pages/ApprovalPendingScreen"));
const AdminAnalyticsDashboard = lazy(() => import("./pages/AdminAnalyticsDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import("./pages/AdminUserManagement"));
const AdminGiftPricing = lazy(() => import("./pages/AdminGiftPricing"));
const AdminLanguageGroups = lazy(() => import("./pages/AdminLanguageGroups"));
const AdminChatMonitoring = lazy(() => import("./pages/AdminChatMonitoring"));
const AdminFinanceDashboard = lazy(() => import("./pages/AdminFinanceDashboard"));
const AdminFinanceReports = lazy(() => import("./pages/AdminFinanceReports"));
const AdminBackupManagement = lazy(() => import("./pages/AdminBackupManagement"));
const AdminLegalDocuments = lazy(() => import("./pages/AdminLegalDocuments"));
const AdminChatPricing = lazy(() => import("./pages/AdminChatPricing"));
const AdminPerformanceMonitoring = lazy(() => import("./pages/AdminPerformanceMonitoring"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminAuditLogs = lazy(() => import("./pages/AdminAuditLogs"));
const AdminModerationScreen = lazy(() => import("./pages/AdminModerationScreen"));
const GiftSendingScreen = lazy(() => import("./pages/GiftSendingScreen"));
const ShiftComplianceScreen = lazy(() => import("./pages/ShiftComplianceScreen"));
const AdminPolicyAlerts = lazy(() => import("./pages/AdminPolicyAlerts"));
const AdminLanguageLimits = lazy(() => import("./pages/AdminLanguageLimits"));
const PasswordResetScreen = lazy(() => import("./pages/PasswordResetScreen"));
const AdminTransactionHistory = lazy(() => import("./pages/AdminTransactionHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InstallApp = lazy(() => import("./pages/InstallApp"));

// Optimized React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      refetchOnMount: false,
    },
  },
});

// Minimal loading spinner
const RouteLoader = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

RouteLoader.displayName = 'RouteLoader';

// Wrap lazy components with Suspense
const LazyRoute = memo(({ component: Component }: { component: React.ComponentType }) => (
  <Suspense fallback={<RouteLoader />}>
    <Component />
  </Suspense>
));

LazyRoute.displayName = 'LazyRoute';

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Suspense fallback={null}>
          <SecurityProvider
            enableDevToolsDetection={true}
            enableKeyboardBlocking={true}
            enableConsoleProtection={false}
          >
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Suspense fallback={null}>
                <PWAInstallPrompt />
              </Suspense>
              <MemoryRouter initialEntries={["/"]}>
                <Routes>
                  {/* Auth route - eagerly loaded for fast initial render */}
                  <Route path="/" element={<AuthScreen />} />
                  
                  {/* All other routes - lazy loaded */}
                  <Route path="/forgot-password" element={<LazyRoute component={ForgotPasswordScreen} />} />
                  <Route path="/password-reset" element={<LazyRoute component={PasswordResetScreen} />} />
                  <Route path="/register" element={<LazyRoute component={LanguageCountryScreen} />} />
                  <Route path="/basic-info" element={<LazyRoute component={BasicInfoScreen} />} />
                  <Route path="/password-setup" element={<LazyRoute component={PasswordSetupScreen} />} />
                  <Route path="/photo-upload" element={<LazyRoute component={PhotoUploadScreen} />} />
                  <Route path="/location-setup" element={<LazyRoute component={LocationSetupScreen} />} />
                  <Route path="/language-preferences" element={<LazyRoute component={LanguagePreferencesScreen} />} />
                  <Route path="/terms-agreement" element={<LazyRoute component={TermsAgreementScreen} />} />
                  <Route path="/ai-processing" element={<LazyRoute component={AIProcessingScreen} />} />
                  <Route path="/welcome-tutorial" element={<LazyRoute component={WelcomeTutorialScreen} />} />
                  <Route path="/registration-complete" element={<LazyRoute component={RegistrationCompleteScreen} />} />
                  <Route path="/dashboard" element={<LazyRoute component={DashboardScreen} />} />
                  <Route path="/online-users" element={<LazyRoute component={OnlineUsersScreen} />} />
                  <Route path="/find-match" element={<LazyRoute component={MatchingScreen} />} />
                  <Route path="/match-discovery" element={<LazyRoute component={MatchDiscoveryScreen} />} />
                  <Route path="/profile/:userId" element={<LazyRoute component={ProfileDetailScreen} />} />
                  <Route path="/chat/:chatId" element={<LazyRoute component={ChatScreen} />} />
                  <Route path="/wallet" element={<LazyRoute component={WalletScreen} />} />
                  <Route path="/transaction-history" element={<LazyRoute component={TransactionHistoryScreen} />} />
                  <Route path="/settings" element={<LazyRoute component={SettingsScreen} />} />
                  <Route path="/shift-management" element={<LazyRoute component={ShiftManagementScreen} />} />
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
                  <Route path="/install" element={<LazyRoute component={InstallApp} />} />
                  <Route path="*" element={<LazyRoute component={NotFound} />} />
                </Routes>
              </MemoryRouter>
            </TooltipProvider>
          </SecurityProvider>
        </Suspense>
      </I18nProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default memo(App);
