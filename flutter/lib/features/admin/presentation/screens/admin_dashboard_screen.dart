import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/common_widgets.dart';

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
      ),
      drawer: const _AdminDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats Grid
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: const [
                _StatCard(icon: Icons.people, label: 'Total Users', value: '12,345', color: AppColors.info),
                _StatCard(icon: Icons.person, label: 'Active Today', value: '2,456', color: AppColors.success),
                _StatCard(icon: Icons.chat, label: 'Active Chats', value: '892', color: AppColors.primary),
                _StatCard(icon: Icons.currency_rupee, label: 'Revenue Today', value: '₹45,230', color: AppColors.warning),
              ],
            ),
            const SizedBox(height: 24),

            // Quick Actions
            Text('Quick Actions', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(label: const Text('View Reports'), onPressed: () {}),
                ActionChip(label: const Text('User Management'), onPressed: () {}),
                ActionChip(label: const Text('Content Moderation'), onPressed: () {}),
                ActionChip(label: const Text('System Settings'), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 24),

            // Recent Activity
            Text('Recent Activity', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Card(
              child: ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: 5,
                itemBuilder: (context, index) {
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primary.withOpacity(0.1),
                      child: const Icon(Icons.notifications, color: AppColors.primary),
                    ),
                    title: Text('Activity ${index + 1}'),
                    subtitle: const Text('2 hours ago'),
                    trailing: const Icon(Icons.chevron_right),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 24),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('+12%', style: TextStyle(color: color, fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _AdminDrawer extends StatelessWidget {
  const _AdminDrawer();

  static const _items = <_NavItem>[
    _NavItem('Dashboard', Icons.dashboard, AppRoutes.admin),
    _NavItem('User Management', Icons.people, AppRoutes.adminUsers),
    _NavItem('Analytics', Icons.bar_chart, AppRoutes.adminAnalytics),
    _NavItem('Chat Monitoring', Icons.chat, AppRoutes.adminChatMonitoring),
    _NavItem('Language Groups', Icons.language, AppRoutes.adminLanguages),
    _NavItem('Language Limits', Icons.translate, AppRoutes.adminLanguageLimits),
    _NavItem('KYC Management', Icons.verified_user, AppRoutes.adminKyc),
    _NavItem('User Lookup', Icons.search, AppRoutes.adminUserLookup),
    _NavItem('Moderation', Icons.shield, AppRoutes.adminModeration),
    _NavItem('Policy Alerts', Icons.warning_amber, AppRoutes.adminPolicyAlerts),
    _NavItem('Performance', Icons.speed, AppRoutes.adminPerformance),
    _NavItem('Legal Documents', Icons.description, AppRoutes.adminLegalDocuments),
    _NavItem('Backups', Icons.backup, AppRoutes.adminBackups),
    _NavItem('Audit Logs', Icons.assignment, AppRoutes.adminAuditLogs),
    _NavItem('Messaging', Icons.campaign, AppRoutes.adminMessaging),
    _NavItem('Finance', Icons.attach_money, AppRoutes.adminFinance),
    _NavItem('Payout Statements', Icons.receipt_long, AppRoutes.adminPayouts),
    _NavItem('Enable / Disable', Icons.toggle_on, AppRoutes.adminEnableDisable),
    _NavItem('Settings', Icons.settings, AppRoutes.adminSettings),
  ];

  @override
  Widget build(BuildContext context) {
    final currentPath = GoRouterState.of(context).uri.path;
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const CircleAvatar(radius: 30, child: Icon(Icons.admin_panel_settings)),
                const SizedBox(height: 8),
                Text('Admin Panel',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
              ],
            ),
          ),
          ..._items.map((item) {
            final selected = currentPath == item.path;
            return ListTile(
              leading: Icon(item.icon),
              title: Text(item.title),
              selected: selected,
              selectedTileColor: AppColors.primary.withOpacity(0.08),
              onTap: () {
                Navigator.pop(context);
                if (!selected) context.go(item.path);
              },
            );
          }),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Logout'),
            onTap: () async {
              await Supabase.instance.client.auth.signOut();
              if (context.mounted) context.go('/auth');
            },
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  final String title;
  final IconData icon;
  final String path;
  const _NavItem(this.title, this.icon, this.path);
}
