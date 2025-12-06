import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import MatchDiscoveryScreen from "./pages/MatchDiscoveryScreen";
import ProfileDetailScreen from "./pages/ProfileDetailScreen";
import ChatScreen from "./pages/ChatScreen";
import WalletScreen from "./pages/WalletScreen";
import SettingsScreen from "./pages/SettingsScreen";
import ShiftManagementScreen from "./pages/ShiftManagementScreen";
import WomenDashboardScreen from "./pages/WomenDashboardScreen";
import AdminAnalyticsDashboard from "./pages/AdminAnalyticsDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminGiftPricing from "./pages/AdminGiftPricing";
import AdminLanguageGroups from "./pages/AdminLanguageGroups";
import AdminChatMonitoring from "./pages/AdminChatMonitoring";
import AdminFinanceDashboard from "./pages/AdminFinanceDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
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
          <Route path="/match-discovery" element={<MatchDiscoveryScreen />} />
          <Route path="/profile/:userId" element={<ProfileDetailScreen />} />
          <Route path="/chat/:oderId" element={<ChatScreen />} />
          <Route path="/wallet" element={<WalletScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/shift-management" element={<ShiftManagementScreen />} />
          <Route path="/women-dashboard" element={<WomenDashboardScreen />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsDashboard />} />
          <Route path="/admin/users" element={<AdminUserManagement />} />
          <Route path="/admin/gifts" element={<AdminGiftPricing />} />
          <Route path="/admin/languages" element={<AdminLanguageGroups />} />
          <Route path="/admin/chat-monitoring" element={<AdminChatMonitoring />} />
          <Route path="/admin/finance" element={<AdminFinanceDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
