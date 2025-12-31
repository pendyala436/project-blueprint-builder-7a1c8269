import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/optimized_supabase_service.dart';

// Provider for admin dashboard stats
final adminDashboardStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final supabase = ref.read(optimizedSupabaseServiceProvider);
  
  try {
    // Fetch total users count
    final maleCountResponse = await supabase.client
        .from('male_profiles')
        .select('id', const FetchOptions(count: CountOption.exact, head: true));
    
    final femaleCountResponse = await supabase.client
        .from('female_profiles')
        .select('id', const FetchOptions(count: CountOption.exact, head: true));
    
    final maleCount = maleCountResponse.count ?? 0;
    final femaleCount = femaleCountResponse.count ?? 0;
    final totalUsers = maleCount + femaleCount;
    
    // Fetch online users count
    final onlineResponse = await supabase.client
        .from('user_status')
        .select('id', const FetchOptions(count: CountOption.exact, head: true))
        .eq('is_online', true);
    final onlineCount = onlineResponse.count ?? 0;
    
    // Fetch active chats count
    final activeChatsResponse = await supabase.client
        .from('active_chat_sessions')
        .select('id', const FetchOptions(count: CountOption.exact, head: true))
        .eq('status', 'active');
    final activeChats = activeChatsResponse.count ?? 0;
    
    // Fetch today's earnings
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day).toIso8601String();
    
    final earningsResponse = await supabase.client
        .from('women_earnings')
        .select('amount')
        .gte('created_at', startOfDay);
    
    double todayEarnings = 0;
    if (earningsResponse != null) {
      for (var earning in earningsResponse as List) {
        todayEarnings += (earning['amount'] as num?)?.toDouble() ?? 0;
      }
    }
    
    // Fetch recent activity (audit logs or notifications)
    final recentActivityResponse = await supabase.client
        .from('audit_logs')
        .select('action, created_at, resource_type')
        .order('created_at', ascending: false)
        .limit(5);
    
    return {
      'totalUsers': totalUsers,
      'onlineUsers': onlineCount,
      'activeChats': activeChats,
      'todayEarnings': todayEarnings,
      'recentActivity': recentActivityResponse ?? [],
    };
  } catch (e) {
    debugPrint('Error fetching admin stats: $e');
    return {
      'totalUsers': 0,
      'onlineUsers': 0,
      'activeChats': 0,
      'todayEarnings': 0.0,
      'recentActivity': [],
    };
  }
});

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(adminDashboardStatsProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(adminDashboardStatsProvider),
          ),
        ],
      ),
      drawer: const _AdminDrawer(),
      body: statsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error loading dashboard: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(adminDashboardStatsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (stats) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(adminDashboardStatsProvider),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
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
                  children: [
                    _StatCard(
                      icon: Icons.people,
                      label: 'Total Users',
                      value: _formatNumber(stats['totalUsers'] ?? 0),
                      color: AppColors.info,
                    ),
                    _StatCard(
                      icon: Icons.person,
                      label: 'Online Now',
                      value: _formatNumber(stats['onlineUsers'] ?? 0),
                      color: AppColors.success,
                    ),
                    _StatCard(
                      icon: Icons.chat,
                      label: 'Active Chats',
                      value: _formatNumber(stats['activeChats'] ?? 0),
                      color: AppColors.primary,
                    ),
                    _StatCard(
                      icon: Icons.currency_rupee,
                      label: 'Revenue Today',
                      value: '₹${_formatNumber((stats['todayEarnings'] ?? 0).toInt())}',
                      color: AppColors.warning,
                    ),
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
                _buildRecentActivityList(context, stats['recentActivity'] as List),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }

  Widget _buildRecentActivityList(BuildContext context, List activities) {
    if (activities.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Center(
            child: Column(
              children: [
                Icon(Icons.inbox_outlined, size: 48, color: Colors.grey[400]),
                const SizedBox(height: 8),
                Text(
                  'No recent activity',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      child: ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: activities.length,
        itemBuilder: (context, index) {
          final activity = activities[index] as Map<String, dynamic>;
          final action = activity['action'] ?? 'Unknown action';
          final resourceType = activity['resource_type'] ?? '';
          final createdAt = activity['created_at'] != null
              ? _formatTimeAgo(DateTime.parse(activity['created_at']))
              : '';

          return ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.primary.withOpacity(0.1),
              child: Icon(
                _getIconForAction(action),
                color: AppColors.primary,
              ),
            ),
            title: Text(action),
            subtitle: Text('$resourceType • $createdAt'),
            trailing: const Icon(Icons.chevron_right),
          );
        },
      ),
    );
  }

  IconData _getIconForAction(String action) {
    if (action.contains('login') || action.contains('auth')) return Icons.login;
    if (action.contains('user')) return Icons.person;
    if (action.contains('chat')) return Icons.chat;
    if (action.contains('payment') || action.contains('wallet')) return Icons.payment;
    return Icons.notifications;
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
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
