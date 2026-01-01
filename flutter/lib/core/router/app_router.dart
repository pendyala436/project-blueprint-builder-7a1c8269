import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/auth_screen.dart';
import '../../features/auth/presentation/screens/auth_screens.dart';
import '../../features/auth/presentation/screens/register/registration_screens.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/women_dashboard_screen.dart';
import '../../features/matching/presentation/screens/matching_screen.dart';
import '../../features/profile/presentation/screens/profile_detail_screen.dart';
import '../../features/chat/presentation/screens/chat_screen.dart';
import '../../features/wallet/presentation/screens/wallet_screen.dart';
import '../../features/gifts/presentation/screens/gift_sending_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/admin/presentation/screens/admin_dashboard_screen.dart';
import '../../features/admin/presentation/screens/admin_screens.dart';
import '../../shared/screens/placeholder_screens.dart';
import '../services/auth_service.dart';

/// App Route Names - Synced with React web app (src/App.tsx)
class AppRoutes {
  AppRoutes._();

  // Auth Routes
  static const String auth = '/';
  static const String forgotPassword = '/forgot-password';
  static const String passwordReset = '/reset-password';
  static const String passwordResetSuccess = '/password-reset-success';
  
  // Registration Routes
  static const String register = '/register';
  static const String basicInfo = '/basic-info';
  static const String personalDetails = '/personal-details';
  static const String passwordSetup = '/password-setup';
  static const String photoUpload = '/photo-upload';
  static const String locationSetup = '/location-setup';
  static const String languagePreferences = '/language-preferences';
  static const String termsAgreement = '/terms-agreement';
  static const String aiProcessing = '/ai-processing';
  static const String welcomeTutorial = '/welcome-tutorial';
  static const String registrationComplete = '/registration-complete';
  static const String approvalPending = '/approval-pending';
  
  // Dashboard Routes
  static const String dashboard = '/dashboard';
  static const String womenDashboard = '/women-dashboard';
  static const String onlineUsers = '/online-users';
  
  // Matching Routes
  static const String findMatch = '/find-match';
  static const String matchDiscovery = '/match-discovery';
  
  // Profile Routes
  static const String profile = '/profile/:userId';
  
  // Chat Routes (parallel chat windows on dashboard)
  static const String universalChat = '/universal-chat';
  
  // Wallet Routes
  static const String wallet = '/wallet';
  static const String womenWallet = '/women-wallet';
  static const String transactionHistory = '/transaction-history';
  static const String transactions = '/transactions';
  
  // Gift Routes
  static const String sendGift = '/send-gift/:receiverId';
  
  // Settings Routes
  static const String settings = '/settings';
  
  // Shift Routes (Women)
  static const String shiftManagement = '/shift-management';
  static const String shiftCompliance = '/shift-compliance';
  
  // Admin Routes
  static const String admin = '/admin';
  static const String adminAnalytics = '/admin/analytics';
  static const String adminUsers = '/admin/users';
  static const String adminGifts = '/admin/gifts';
  static const String adminLanguages = '/admin/languages';
  static const String adminChatMonitoring = '/admin/chat-monitoring';
  static const String adminFinance = '/admin/finance';
  static const String adminFinanceReports = '/admin/finance-reports';
  static const String adminBackups = '/admin/backups';
  static const String adminLegalDocuments = '/admin/legal-documents';
  static const String adminChatPricing = '/admin/chat-pricing';
  static const String adminPerformance = '/admin/performance';
  static const String adminSettings = '/admin/settings';
  static const String adminAuditLogs = '/admin/audit-logs';
  static const String adminModeration = '/admin/moderation';
  static const String adminPolicyAlerts = '/admin/policy-alerts';
  static const String adminLanguageLimits = '/admin/language-limits';
  static const String adminTransactions = '/admin/transactions';
  
  // PWA Install
  static const String install = '/install';
}

/// App Router Provider
final appRouterProvider = Provider<GoRouter>((ref) {
  final authService = ref.watch(authServiceProvider);
  
  return GoRouter(
    initialLocation: AppRoutes.auth,
    debugLogDiagnostics: true,
    redirect: (context, state) async {
      final isLoggedIn = await authService.isLoggedIn();
      final isAuthRoute = state.matchedLocation == AppRoutes.auth ||
          state.matchedLocation == AppRoutes.forgotPassword ||
          state.matchedLocation == AppRoutes.passwordReset ||
          state.matchedLocation == AppRoutes.passwordResetSuccess ||
          state.matchedLocation.startsWith('/register') ||
          state.matchedLocation == AppRoutes.basicInfo ||
          state.matchedLocation == AppRoutes.personalDetails ||
          state.matchedLocation == AppRoutes.passwordSetup ||
          state.matchedLocation == AppRoutes.photoUpload ||
          state.matchedLocation == AppRoutes.locationSetup ||
          state.matchedLocation == AppRoutes.languagePreferences ||
          state.matchedLocation == AppRoutes.termsAgreement ||
          state.matchedLocation == AppRoutes.aiProcessing ||
          state.matchedLocation == AppRoutes.registrationComplete ||
          state.matchedLocation == AppRoutes.install;

      if (!isLoggedIn && !isAuthRoute) {
        return AppRoutes.auth;
      }

      if (isLoggedIn && state.matchedLocation == AppRoutes.auth) {
        return AppRoutes.dashboard;
      }

      return null;
    },
    errorBuilder: (context, state) => const NotFoundScreen(),
    routes: [
      // Auth Routes
      GoRoute(
        path: AppRoutes.auth,
        builder: (context, state) => const AuthScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.passwordReset,
        builder: (context, state) => const PasswordResetScreen(),
      ),
      GoRoute(
        path: AppRoutes.passwordResetSuccess,
        builder: (context, state) => const PasswordResetSuccessScreen(),
      ),
      
      // Registration Routes
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const LanguageCountryScreen(),
      ),
      GoRoute(
        path: AppRoutes.basicInfo,
        builder: (context, state) => const BasicInfoScreen(),
      ),
      GoRoute(
        path: AppRoutes.personalDetails,
        builder: (context, state) => const PersonalDetailsScreen(),
      ),
      GoRoute(
        path: AppRoutes.passwordSetup,
        builder: (context, state) => const PasswordSetupScreen(),
      ),
      GoRoute(
        path: AppRoutes.photoUpload,
        builder: (context, state) => const PhotoUploadScreen(),
      ),
      GoRoute(
        path: AppRoutes.locationSetup,
        builder: (context, state) => const LocationSetupScreen(),
      ),
      GoRoute(
        path: AppRoutes.languagePreferences,
        builder: (context, state) => const LanguagePreferencesScreen(),
      ),
      GoRoute(
        path: AppRoutes.termsAgreement,
        builder: (context, state) => const TermsAgreementScreen(),
      ),
      GoRoute(
        path: AppRoutes.aiProcessing,
        builder: (context, state) => const AIProcessingScreen(),
      ),
      GoRoute(
        path: AppRoutes.registrationComplete,
        builder: (context, state) => const RegistrationCompleteScreen(),
      ),
      GoRoute(
        path: AppRoutes.welcomeTutorial,
        builder: (context, state) => const WelcomeTutorialScreen(),
      ),
      GoRoute(
        path: AppRoutes.approvalPending,
        builder: (context, state) => const ApprovalPendingScreen(),
      ),
      
      // Dashboard Routes
      GoRoute(
        path: AppRoutes.dashboard,
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: AppRoutes.womenDashboard,
        builder: (context, state) => const WomenDashboardScreen(),
      ),
      
      // Matching Routes
      GoRoute(
        path: AppRoutes.onlineUsers,
        builder: (context, state) => const OnlineUsersScreen(),
      ),
      GoRoute(
        path: AppRoutes.findMatch,
        builder: (context, state) => const MatchingScreen(),
      ),
      GoRoute(
        path: AppRoutes.matchDiscovery,
        builder: (context, state) => const MatchDiscoveryScreen(),
      ),
      
      // Profile Routes
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) => ProfileDetailScreen(
          userId: state.pathParameters['userId']!,
        ),
      ),
      
      // Chat Routes
      GoRoute(
        path: AppRoutes.universalChat,
        builder: (context, state) => const UniversalChatScreen(),
      ),
      
      // Wallet Routes
      GoRoute(
        path: AppRoutes.wallet,
        builder: (context, state) => const WalletScreen(),
      ),
      GoRoute(
        path: AppRoutes.womenWallet,
        builder: (context, state) => const WomenWalletScreen(),
      ),
      GoRoute(
        path: AppRoutes.transactionHistory,
        builder: (context, state) => const TransactionHistoryScreen(),
      ),
      GoRoute(
        path: AppRoutes.transactions,
        builder: (context, state) => const TransactionHistoryScreen(),
      ),
      
      // Gift Routes
      GoRoute(
        path: AppRoutes.sendGift,
        builder: (context, state) => GiftSendingScreen(
          receiverId: state.pathParameters['receiverId']!,
        ),
      ),
      
      // Settings Routes
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
      
      // Shift Routes (Women)
      GoRoute(
        path: AppRoutes.shiftManagement,
        builder: (context, state) => const ShiftManagementScreen(),
      ),
      GoRoute(
        path: AppRoutes.shiftCompliance,
        builder: (context, state) => const ShiftComplianceScreen(),
      ),
      
      // Admin Routes
      GoRoute(
        path: AppRoutes.admin,
        builder: (context, state) => const AdminDashboardScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminAnalytics,
        builder: (context, state) => const AdminAnalyticsDashboard(),
      ),
      GoRoute(
        path: AppRoutes.adminUsers,
        builder: (context, state) => const AdminUserManagement(),
      ),
      GoRoute(
        path: AppRoutes.adminGifts,
        builder: (context, state) => const AdminGiftPricingScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminLanguages,
        builder: (context, state) => const AdminLanguageGroupsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminChatMonitoring,
        builder: (context, state) => const AdminChatMonitoringScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminFinance,
        builder: (context, state) => const AdminFinanceDashboard(),
      ),
      GoRoute(
        path: AppRoutes.adminFinanceReports,
        builder: (context, state) => const AdminFinanceReportsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminBackups,
        builder: (context, state) => const AdminBackupManagementScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminLegalDocuments,
        builder: (context, state) => const AdminLegalDocumentsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminChatPricing,
        builder: (context, state) => const AdminChatPricingScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminPerformance,
        builder: (context, state) => const AdminPerformanceScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminSettings,
        builder: (context, state) => const AdminSettingsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminAuditLogs,
        builder: (context, state) => const AdminAuditLogsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminModeration,
        builder: (context, state) => const AdminModerationScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminPolicyAlerts,
        builder: (context, state) => const AdminPolicyAlertsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminLanguageLimits,
        builder: (context, state) => const AdminLanguageLimitsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminTransactions,
        builder: (context, state) => const AdminTransactionHistoryScreen(),
      ),
      
      // PWA Install
      GoRoute(
        path: AppRoutes.install,
        builder: (context, state) => const InstallAppScreen(),
      ),
    ],
  );
});
