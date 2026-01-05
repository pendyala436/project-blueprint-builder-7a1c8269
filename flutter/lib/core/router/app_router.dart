import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/auth_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/password_reset_screen.dart';
import '../../features/auth/presentation/screens/register/language_country_screen.dart';
import '../../features/auth/presentation/screens/register/basic_info_screen.dart';
import '../../features/auth/presentation/screens/register/password_setup_screen.dart';
import '../../features/auth/presentation/screens/register/photo_upload_screen.dart';
import '../../features/auth/presentation/screens/register/location_setup_screen.dart';
import '../../features/auth/presentation/screens/register/language_preferences_screen.dart';
import '../../features/auth/presentation/screens/register/terms_agreement_screen.dart';
import '../../features/auth/presentation/screens/register/ai_processing_screen.dart';
import '../../features/auth/presentation/screens/register/registration_complete_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/women_dashboard_screen.dart';
import '../../features/matching/presentation/screens/matching_screen.dart';
import '../../features/matching/presentation/screens/match_discovery_screen.dart';
import '../../features/matching/presentation/screens/online_users_screen.dart';
import '../../features/profile/presentation/screens/profile_detail_screen.dart';
import '../../features/chat/presentation/screens/chat_screen.dart';
import '../../features/wallet/presentation/screens/wallet_screen.dart';
import '../../features/wallet/presentation/screens/women_wallet_screen.dart';
import '../../features/wallet/presentation/screens/transaction_history_screen.dart';
import '../../features/gifts/presentation/screens/gift_sending_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/shifts/presentation/screens/shift_management_screen.dart';
import '../../features/shifts/presentation/screens/shift_compliance_screen.dart';
import '../../features/admin/presentation/screens/admin_dashboard_screen.dart';
import '../../features/admin/presentation/screens/admin_analytics_screen.dart';
import '../../features/admin/presentation/screens/admin_users_screen.dart';
import '../../features/admin/presentation/screens/admin_finance_screen.dart';
import '../../features/admin/presentation/screens/admin_moderation_screen.dart';
import '../../features/admin/presentation/screens/admin_settings_screen.dart';
import '../../shared/screens/not_found_screen.dart';
import '../../shared/screens/approval_pending_screen.dart';
import '../../shared/screens/welcome_tutorial_screen.dart';
import '../services/auth_service.dart';

/// App Route Names
class AppRoutes {
  AppRoutes._();

  static const String auth = '/';
  static const String forgotPassword = '/forgot-password';
  static const String passwordReset = '/password-reset';
  static const String register = '/register';
  static const String basicInfo = '/basic-info';
  static const String passwordSetup = '/password-setup';
  static const String photoUpload = '/photo-upload';
  static const String locationSetup = '/location-setup';
  static const String languagePreferences = '/language-preferences';
  static const String termsAgreement = '/terms-agreement';
  static const String aiProcessing = '/ai-processing';
  static const String registrationComplete = '/registration-complete';
  static const String welcomeTutorial = '/welcome-tutorial';
  static const String approvalPending = '/approval-pending';
  static const String dashboard = '/dashboard';
  static const String womenDashboard = '/women-dashboard';
  static const String onlineUsers = '/online-users';
  static const String findMatch = '/find-match';
  static const String matchDiscovery = '/match-discovery';
  static const String profile = '/profile/:userId';
  static const String chat = '/chat/:chatId';
  static const String wallet = '/wallet';
  static const String womenWallet = '/women-wallet';
  static const String transactionHistory = '/transaction-history';
  static const String sendGift = '/send-gift/:receiverId';
  static const String settings = '/settings';
  static const String shiftManagement = '/shift-management';
  static const String shiftCompliance = '/shift-compliance';
  static const String admin = '/admin';
  static const String adminAnalytics = '/admin/analytics';
  static const String adminUsers = '/admin/users';
  static const String adminFinance = '/admin/finance';
  static const String adminModeration = '/admin/moderation';
  static const String adminSettings = '/admin/settings';
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
          state.matchedLocation.startsWith('/register') ||
          state.matchedLocation == AppRoutes.basicInfo ||
          state.matchedLocation == AppRoutes.passwordSetup ||
          state.matchedLocation == AppRoutes.photoUpload ||
          state.matchedLocation == AppRoutes.locationSetup ||
          state.matchedLocation == AppRoutes.languagePreferences ||
          state.matchedLocation == AppRoutes.termsAgreement ||
          state.matchedLocation == AppRoutes.aiProcessing ||
          state.matchedLocation == AppRoutes.registrationComplete;

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
        path: AppRoutes.chat,
        builder: (context, state) => ChatScreen(
          chatId: state.pathParameters['chatId']!,
        ),
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
        builder: (context, state) => const AdminAnalyticsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminUsers,
        builder: (context, state) => const AdminUsersScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminFinance,
        builder: (context, state) => const AdminFinanceScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminModeration,
        builder: (context, state) => const AdminModerationScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminSettings,
        builder: (context, state) => const AdminSettingsScreen(),
      ),
    ],
  );
});
