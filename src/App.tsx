import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import SecurityProvider from "@/components/SecurityProvider";
import { AutoLogoutWrapper } from "@/components/AutoLogoutWrapper";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { UserActivityProvider } from "@/contexts/UserActivityContext";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Auth & Registration
const AuthScreen = lazy(() => import("@/pages/AuthScreen"));
const ForgotPasswordScreen = lazy(() => import("@/pages/ForgotPasswordScreen"));
const PasswordResetScreen = lazy(() => import("@/pages/PasswordResetScreen"));
const PasswordResetSuccessScreen = lazy(() => import("@/pages/PasswordResetSuccessScreen"));
const LanguageCountryScreen = lazy(() => import("@/pages/LanguageCountryScreen"));
const BasicInfoScreen = lazy(() => import("@/pages/BasicInfoScreen"));
const PersonalDetailsScreen = lazy(() => import("@/pages/PersonalDetailsScreen"));
const PhotoUploadScreen = lazy(() => import("@/pages/PhotoUploadScreen"));
const LocationSetupScreen = lazy(() => import("@/pages/LocationSetupScreen"));
const LanguagePreferencesScreen = lazy(() => import("@/pages/LanguagePreferencesScreen"));
const PasswordSetupScreen = lazy(() => import("@/pages/PasswordSetupScreen"));
const TermsAgreementScreen = lazy(() => import("@/pages/TermsAgreementScreen"));
const AIProcessingScreen = lazy(() => import("@/pages/AIProcessingScreen"));
const RegistrationCompleteScreen = lazy(() => import("@/pages/RegistrationCompleteScreen"));
const ApprovalPendingScreen = lazy(() => import("@/pages/ApprovalPendingScreen"));
const WelcomeTutorialScreen = lazy(() => import("@/pages/WelcomeTutorialScreen"));

// Dashboards
const DashboardScreen = lazy(() => import("@/pages/DashboardScreen"));
const WomenDashboardScreen = lazy(() => import("@/pages/WomenDashboardScreen"));

// Features
const ChatScreen = lazy(() => import("@/pages/ChatScreen"));
const MatchingScreen = lazy(() => import("@/pages/MatchingScreen"));
const MatchDiscoveryScreen = lazy(() => import("@/pages/MatchDiscoveryScreen"));
const OnlineUsersScreen = lazy(() => import("@/pages/OnlineUsersScreen"));
const ProfileDetailScreen = lazy(() => import("@/pages/ProfileDetailScreen"));
const GiftSendingScreen = lazy(() => import("@/pages/GiftSendingScreen"));
const WalletScreen = lazy(() => import("@/pages/WalletScreen"));
const WomenWalletScreen = lazy(() => import("@/pages/WomenWalletScreen"));
const SettingsScreen = lazy(() => import("@/pages/SettingsScreen"));
const InstallApp = lazy(() => import("@/pages/InstallApp"));

// Admin
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import("@/pages/AdminUserManagement"));
const AdminAnalyticsDashboard = lazy(() => import("@/pages/AdminAnalyticsDashboard"));
const AdminChatMonitoring = lazy(() => import("@/pages/AdminChatMonitoring"));
const AdminFinanceDashboard = lazy(() => import("@/pages/AdminFinanceDashboard"));
const AdminFinanceReports = lazy(() => import("@/pages/AdminFinanceReports"));
const AdminTransactionHistory = lazy(() => import("@/pages/AdminTransactionHistory"));
const AdminStatementsPage = lazy(() => import("@/pages/admin/AdminStatementsPage"));
const AdminChatPricing = lazy(() => import("@/pages/AdminChatPricing"));
const AdminGiftPricing = lazy(() => import("@/pages/AdminGiftPricing"));
const AdminLanguageGroups = lazy(() => import("@/pages/AdminLanguageGroups"));
const AdminLanguageLimits = lazy(() => import("@/pages/AdminLanguageLimits"));
const AdminKYCManagement = lazy(() => import("@/pages/AdminKYCManagement"));
const AdminUserLookup = lazy(() => import("@/pages/AdminUserLookup"));
const AdminModerationScreen = lazy(() => import("@/pages/AdminModerationScreen"));
const AdminPolicyAlerts = lazy(() => import("@/pages/AdminPolicyAlerts"));
const AdminPerformanceMonitoring = lazy(() => import("@/pages/AdminPerformanceMonitoring"));
const AdminLegalDocuments = lazy(() => import("@/pages/AdminLegalDocuments"));
const AdminBackupManagement = lazy(() => import("@/pages/AdminBackupManagement"));
const AdminAuditLogs = lazy(() => import("@/pages/AdminAuditLogs"));
const AdminMessaging = lazy(() => import("@/pages/AdminMessaging"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <SecurityProvider>
            <UserActivityProvider>
            <AutoLogoutWrapper>
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Auth */}
                  <Route path="/" element={<AuthScreen />} />
                  <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
                  <Route path="/reset-password" element={<PasswordResetScreen />} />
                  <Route path="/password-reset-success" element={<PasswordResetSuccessScreen />} />

                  {/* Registration */}
                  <Route path="/register" element={<LanguageCountryScreen />} />
                  <Route path="/basic-info" element={<BasicInfoScreen />} />
                  <Route path="/personal-details" element={<PersonalDetailsScreen />} />
                  <Route path="/photo-upload" element={<PhotoUploadScreen />} />
                  <Route path="/location-setup" element={<LocationSetupScreen />} />
                  <Route path="/language-preferences" element={<LanguagePreferencesScreen />} />
                  <Route path="/password-setup" element={<PasswordSetupScreen />} />
                  <Route path="/terms-agreement" element={<TermsAgreementScreen />} />
                  <Route path="/ai-processing" element={<AIProcessingScreen />} />
                  <Route path="/registration-complete" element={<RegistrationCompleteScreen />} />
                  <Route path="/approval-pending" element={<ApprovalPendingScreen />} />
                  <Route path="/welcome" element={<WelcomeTutorialScreen />} />

                  {/* Men Dashboard */}
                  <Route path="/dashboard" element={<ProtectedRoute requiredRole="male"><DashboardScreen /></ProtectedRoute>} />

                  {/* Women Dashboard */}
                  <Route path="/women-dashboard" element={<ProtectedRoute requiredRole="female"><WomenDashboardScreen /></ProtectedRoute>} />

                  {/* Shared Features */}
                  <Route path="/chat/:partnerId" element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
                  <Route path="/matching" element={<ProtectedRoute><MatchingScreen /></ProtectedRoute>} />
                  <Route path="/match-discovery" element={<ProtectedRoute><MatchDiscoveryScreen /></ProtectedRoute>} />
                  <Route path="/online-users" element={<ProtectedRoute><OnlineUsersScreen /></ProtectedRoute>} />
                  <Route path="/profile/:userId" element={<ProtectedRoute><ProfileDetailScreen /></ProtectedRoute>} />
                  <Route path="/send-gift/:receiverId" element={<ProtectedRoute><GiftSendingScreen /></ProtectedRoute>} />
                  <Route path="/wallet" element={<ProtectedRoute><WalletScreen /></ProtectedRoute>} />
                  <Route path="/women-wallet" element={<ProtectedRoute requiredRole="female"><WomenWalletScreen /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
                  <Route path="/install" element={<InstallApp />} />

                  {/* Admin — each page wrapped in its own ErrorBoundary */}
                  <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminUserManagement /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminAnalyticsDashboard /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/chat-monitoring" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminChatMonitoring /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/finance" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminFinanceDashboard /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/finance-reports" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminFinanceReports /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/transactions" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminTransactionHistory /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/statements" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminStatementsPage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/chat-pricing" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminChatPricing /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/gifts" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminGiftPricing /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/languages" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminLanguageGroups /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/language-limits" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminLanguageLimits /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/kyc" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminKYCManagement /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/user-lookup" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminUserLookup /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/moderation" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminModerationScreen /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/policy-alerts" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminPolicyAlerts /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/performance" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminPerformanceMonitoring /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/legal-documents" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminLegalDocuments /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/backups" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminBackupManagement /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/audit-logs" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminAuditLogs /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/messaging" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminMessaging /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary showHomeButton><AdminSettings /></ErrorBoundary></ProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Toaster />
              
              <NetworkStatusIndicator />
            </AutoLogoutWrapper>
          </SecurityProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
