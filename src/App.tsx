import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/components/I18nProvider";
import AuthScreen from "./pages/AuthScreen";
import ForgotPasswordScreen from "./pages/ForgotPasswordScreen";
import LanguageCountryScreen from "./pages/LanguageCountryScreen";
import BasicInfoScreen from "./pages/BasicInfoScreen";
import PasswordSetupScreen from "./pages/PasswordSetupScreen";
import PhotoUploadScreen from "./pages/PhotoUploadScreen";
import LocationSetupScreen from "./pages/LocationSetupScreen";
import LanguagePreferencesScreen from "./pages/LanguagePreferencesScreen";
import TermsAgreementScreen from "./pages/TermsAgreementScreen";
import AIProcessingScreen from "./pages/AIProcessingScreen";
import WelcomeTutorialScreen from "./pages/WelcomeTutorialScreen";
import RegistrationCompleteScreen from "./pages/RegistrationCompleteScreen";
import DashboardScreen from "./pages/DashboardScreen";
import OnlineUsersScreen from "./pages/OnlineUsersScreen";
import MatchingScreen from "./pages/MatchingScreen";
import MatchDiscoveryScreen from "./pages/MatchDiscoveryScreen";
import ProfileDetailScreen from "./pages/ProfileDetailScreen";
import ChatScreen from "./pages/ChatScreen";
import WalletScreen from "./pages/WalletScreen";
import TransactionHistoryScreen from "./pages/TransactionHistoryScreen";
import SettingsScreen from "./pages/SettingsScreen";
import ShiftManagementScreen from "./pages/ShiftManagementScreen";
import WomenDashboardScreen from "./pages/WomenDashboardScreen";
import WomenWalletScreen from "./pages/WomenWalletScreen";
import ApprovalPendingScreen from "./pages/ApprovalPendingScreen";
import AdminAnalyticsDashboard from "./pages/AdminAnalyticsDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminGiftPricing from "./pages/AdminGiftPricing";
import AdminLanguageGroups from "./pages/AdminLanguageGroups";
import AdminChatMonitoring from "./pages/AdminChatMonitoring";
import AdminFinanceDashboard from "./pages/AdminFinanceDashboard";
import AdminFinanceReports from "./pages/AdminFinanceReports";
import AdminBackupManagement from "./pages/AdminBackupManagement";
import AdminLegalDocuments from "./pages/AdminLegalDocuments";
import AdminChatPricing from "./pages/AdminChatPricing";
import AdminPerformanceMonitoring from "./pages/AdminPerformanceMonitoring";
import AdminSettings from "./pages/AdminSettings";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminModerationScreen from "./pages/AdminModerationScreen";

import GiftSendingScreen from "./pages/GiftSendingScreen";
import ShiftComplianceScreen from "./pages/ShiftComplianceScreen";
import AdminPolicyAlerts from "./pages/AdminPolicyAlerts";
import AdminLanguageLimits from "./pages/AdminLanguageLimits";
import PasswordResetScreen from "./pages/PasswordResetScreen";
import AdminTransactionHistory from "./pages/AdminTransactionHistory";
import NotFound from "./pages/NotFound";
import InstallApp from "./pages/InstallApp";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="/password-reset" element={<PasswordResetScreen />} />
            <Route path="/register" element={<LanguageCountryScreen />} />
            <Route path="/basic-info" element={<BasicInfoScreen />} />
            <Route path="/password-setup" element={<PasswordSetupScreen />} />
            <Route path="/photo-upload" element={<PhotoUploadScreen />} />
            <Route path="/location-setup" element={<LocationSetupScreen />} />
            <Route path="/language-preferences" element={<LanguagePreferencesScreen />} />
            <Route path="/terms-agreement" element={<TermsAgreementScreen />} />
            <Route path="/ai-processing" element={<AIProcessingScreen />} />
            <Route path="/welcome-tutorial" element={<WelcomeTutorialScreen />} />
            <Route path="/registration-complete" element={<RegistrationCompleteScreen />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/online-users" element={<OnlineUsersScreen />} />
            <Route path="/find-match" element={<MatchingScreen />} />
            <Route path="/match-discovery" element={<MatchDiscoveryScreen />} />
            <Route path="/profile/:userId" element={<ProfileDetailScreen />} />
            <Route path="/chat/:oderId" element={<ChatScreen />} />
            <Route path="/wallet" element={<WalletScreen />} />
            <Route path="/transaction-history" element={<TransactionHistoryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/shift-management" element={<ShiftManagementScreen />} />
            <Route path="/women-dashboard" element={<WomenDashboardScreen />} />
            <Route path="/women-wallet" element={<WomenWalletScreen />} />
            <Route path="/approval-pending" element={<ApprovalPendingScreen />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsDashboard />} />
            <Route path="/admin/users" element={<AdminUserManagement />} />
            <Route path="/admin/gifts" element={<AdminGiftPricing />} />
            <Route path="/admin/languages" element={<AdminLanguageGroups />} />
            <Route path="/admin/chat-monitoring" element={<AdminChatMonitoring />} />
            <Route path="/admin/finance" element={<AdminFinanceDashboard />} />
            <Route path="/admin/finance-reports" element={<AdminFinanceReports />} />
            <Route path="/admin/backups" element={<AdminBackupManagement />} />
            <Route path="/admin/legal-documents" element={<AdminLegalDocuments />} />
            <Route path="/admin/chat-pricing" element={<AdminChatPricing />} />
            <Route path="/admin/performance" element={<AdminPerformanceMonitoring />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/send-gift/:receiverId" element={<GiftSendingScreen />} />
            <Route path="/shift-compliance" element={<ShiftComplianceScreen />} />
            <Route path="/admin/moderation" element={<AdminModerationScreen />} />
            
            <Route path="/admin/policy-alerts" element={<AdminPolicyAlerts />} />
            <Route path="/admin/language-limits" element={<AdminLanguageLimits />} />
            <Route path="/admin/transactions" element={<AdminTransactionHistory />} />
            <Route path="/install" element={<InstallApp />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;