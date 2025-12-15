import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/profile_service.dart';
import '../../../../core/services/chat_service.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/common_widgets.dart';

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
          _WomenHomeTab(),
          _ActiveChatsTab(),
          _EarningsTab(),
          _WomenProfileTab(),
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

class _WomenHomeTab extends ConsumerWidget {
  const _WomenHomeTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🐱 Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.schedule),
            onPressed: () => context.push(AppRoutes.shiftManagement),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push(AppRoutes.settings),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            _buildStatusCard(context),
            const SizedBox(height: 24),
            
            // Quick Stats
            _buildQuickStats(context),
            const SizedBox(height: 24),
            
            // Active Chats Section
            Text('Active Chats', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            const _ActiveChatsPreview(),
            const SizedBox(height: 24),
            
            // Shift Schedule
            Text('Today\'s Shift', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            _buildShiftCard(context),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(BuildContext context) {
    return Card(
      color: AppColors.success.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.success,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.check_circle, color: Colors.white),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('You are Online', style: Theme.of(context).textTheme.titleMedium),
                  Text('Ready to receive chats', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Switch(
              value: true,
              onChanged: (value) {},
              activeColor: AppColors.success,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStats(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _StatCard(icon: Icons.chat, label: 'Active Chats', value: '3')),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(icon: Icons.timer, label: 'Today\'s Hours', value: '4.5')),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(icon: Icons.currency_rupee, label: 'Today\'s Earnings', value: '₹850')),
      ],
    );
  }

  Widget _buildShiftCard(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.schedule, color: AppColors.primary),
        title: const Text('Morning Shift'),
        subtitle: const Text('9:00 AM - 5:00 PM'),
        trailing: TextButton(
          onPressed: () => context.push(AppRoutes.shiftManagement),
          child: const Text('Manage'),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatCard({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            Text(label, style: Theme.of(context).textTheme.labelSmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _ActiveChatsPreview extends ConsumerWidget {
  const _ActiveChatsPreview();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 3,
        itemBuilder: (context, index) {
          return ListTile(
            leading: const AppAvatar(name: 'User', isOnline: true),
            title: Text('User ${index + 1}'),
            subtitle: const Text('Active now'),
            trailing: const Text('₹5/min', style: TextStyle(color: AppColors.success)),
            onTap: () => context.push('/chat/chat_$index'),
          );
        },
      ),
    );
  }
}

class _ActiveChatsTab extends ConsumerWidget {
  const _ActiveChatsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Active Chats')),
      body: ListView.builder(
        itemCount: 5,
        itemBuilder: (context, index) {
          return ListTile(
            leading: const AppAvatar(name: 'User', isOnline: true),
            title: Text('User ${index + 1}'),
            subtitle: const Text('Last message preview...'),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text('2m ago'),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('₹25', style: TextStyle(color: Colors.white, fontSize: 12)),
                ),
              ],
            ),
            onTap: () => context.push('/chat/chat_$index'),
          );
        },
      ),
    );
  }
}

class _EarningsTab extends ConsumerWidget {
  const _EarningsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings'),
        actions: [
          TextButton(
            onPressed: () => context.push(AppRoutes.womenWallet),
            child: const Text('Wallet'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Balance Card
            Card(
              color: AppColors.primary,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Text('Total Earnings', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70)),
                    const SizedBox(height: 8),
                    Text('₹15,350', style: Theme.of(context).textTheme.displaySmall?.copyWith(color: Colors.white)),
                    const SizedBox(height: 16),
                    AppButton(
                      onPressed: () {},
                      isOutlined: true,
                      child: const Text('Withdraw', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Earnings breakdown
            Row(
              children: [
                Expanded(child: _EarningTypeCard(icon: Icons.chat, label: 'Chat', amount: '₹8,500')),
                const SizedBox(width: 12),
                Expanded(child: _EarningTypeCard(icon: Icons.videocam, label: 'Video', amount: '₹4,200')),
                const SizedBox(width: 12),
                Expanded(child: _EarningTypeCard(icon: Icons.card_giftcard, label: 'Gifts', amount: '₹2,650')),
              ],
            ),
            const SizedBox(height: 24),
            
            // Recent transactions
            Align(
              alignment: Alignment.centerLeft,
              child: Text('Recent Earnings', style: Theme.of(context).textTheme.titleMedium),
            ),
            const SizedBox(height: 12),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 5,
              itemBuilder: (context, index) {
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.success.withOpacity(0.1),
                    child: const Icon(Icons.arrow_downward, color: AppColors.success),
                  ),
                  title: Text('Chat with User ${index + 1}'),
                  subtitle: const Text('Today, 2:30 PM'),
                  trailing: const Text('+₹125', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _EarningTypeCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String amount;

  const _EarningTypeCard({required this.icon, required this.label, required this.amount});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(height: 8),
            Text(amount, style: Theme.of(context).textTheme.titleMedium),
            Text(label, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _WomenProfileTab extends ConsumerWidget {
  const _WomenProfileTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authService = ref.watch(authServiceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        children: [
          // Profile header
          Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const AppAvatar(name: 'User', radius: 48),
                const SizedBox(height: 16),
                Text('Your Name', style: Theme.of(context).textTheme.titleLarge),
                const Text('Premium Member'),
              ],
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.edit),
            title: const Text('Edit Profile'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.schedule),
            title: const Text('Shift Management'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.shiftManagement),
          ),
          ListTile(
            leading: const Icon(Icons.assessment),
            title: const Text('Performance'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.shiftCompliance),
          ),
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Settings'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.settings),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.destructive),
            title: const Text('Sign Out', style: TextStyle(color: AppColors.destructive)),
            onTap: () async {
              await authService.signOut();
              if (context.mounted) context.go(AppRoutes.auth);
            },
          ),
        ],
      ),
    );
  }
}
