import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/profile_service.dart';
import '../../../../core/services/dashboard_service.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/common_widgets.dart';
import '../../../../shared/models/user_model.dart';
import 'women_home_tab.dart';
import 'women_chats_tab.dart';
import 'women_earnings_tab.dart';
import 'women_profile_tab.dart';

/// Women's Dashboard Screen - Synced with React WomenDashboardScreen
class WomenDashboardScreen extends ConsumerStatefulWidget {
  const WomenDashboardScreen({super.key});

  @override
  ConsumerState<WomenDashboardScreen> createState() => _WomenDashboardScreenState();
}

class _WomenDashboardScreenState extends ConsumerState<WomenDashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          WomenHomeTab(),
          WomenChatsTab(),
          WomenEarningsTab(),
          WomenProfileTab(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'Chats'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet), label: 'Earnings'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
