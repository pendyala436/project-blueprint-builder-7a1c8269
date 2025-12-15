import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const CircleAvatar(radius: 30, child: Icon(Icons.admin_panel_settings)),
                const SizedBox(height: 8),
                Text('Admin Panel', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
              ],
            ),
          ),
          ListTile(leading: const Icon(Icons.dashboard), title: const Text('Dashboard'), onTap: () {}),
          ListTile(leading: const Icon(Icons.analytics), title: const Text('Analytics'), onTap: () {}),
          ListTile(leading: const Icon(Icons.people), title: const Text('Users'), onTap: () {}),
          ListTile(leading: const Icon(Icons.chat), title: const Text('Chat Monitoring'), onTap: () {}),
          ListTile(leading: const Icon(Icons.attach_money), title: const Text('Finance'), onTap: () {}),
          ListTile(leading: const Icon(Icons.card_giftcard), title: const Text('Gifts'), onTap: () {}),
          ListTile(leading: const Icon(Icons.language), title: const Text('Languages'), onTap: () {}),
          ListTile(leading: const Icon(Icons.report), title: const Text('Moderation'), onTap: () {}),
          const Divider(),
          ListTile(leading: const Icon(Icons.settings), title: const Text('Settings'), onTap: () {}),
          ListTile(leading: const Icon(Icons.logout), title: const Text('Logout'), onTap: () {}),
        ],
      ),
    );
  }
}
