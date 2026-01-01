import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';

// ============================================================================
// Admin Analytics Dashboard
// ============================================================================

class AdminAnalyticsDashboard extends ConsumerStatefulWidget {
  const AdminAnalyticsDashboard({super.key});

  @override
  ConsumerState<AdminAnalyticsDashboard> createState() => _AdminAnalyticsDashboardState();
}

class _AdminAnalyticsDashboardState extends ConsumerState<AdminAnalyticsDashboard> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  Map<String, dynamic> _metrics = {};

  @override
  void initState() {
    super.initState();
    _loadMetrics();
  }

  Future<void> _loadMetrics() async {
    try {
      final response = await _supabase
          .from('platform_metrics')
          .select()
          .order('metric_date', ascending: false)
          .limit(1)
          .maybeSingle();

      setState(() {
        _metrics = response ?? {};
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Analytics Dashboard')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadMetrics,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildMetricsGrid(),
                    const SizedBox(height: 24),
                    _buildChartPlaceholder('User Growth'),
                    const SizedBox(height: 24),
                    _buildChartPlaceholder('Revenue Overview'),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildMetricCard('Total Users', '${_metrics['total_users'] ?? 0}', Icons.people),
        _buildMetricCard('Active Users', '${_metrics['active_users'] ?? 0}', Icons.person),
        _buildMetricCard('Total Revenue', '₹${_metrics['admin_profit'] ?? 0}', Icons.currency_rupee),
        _buildMetricCard('Active Chats', '${_metrics['active_chats'] ?? 0}', Icons.chat),
      ],
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppColors.primary, size: 28),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            Text(title, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  Widget _buildChartPlaceholder(String title) {
    return Card(
      child: Container(
        height: 200,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const Expanded(
              child: Center(child: Text('Chart visualization\n(Use fl_chart package)', textAlign: TextAlign.center)),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Admin User Management
// ============================================================================

class AdminUserManagement extends ConsumerStatefulWidget {
  const AdminUserManagement({super.key});

  @override
  ConsumerState<AdminUserManagement> createState() => _AdminUserManagementState();
}

class _AdminUserManagementState extends ConsumerState<AdminUserManagement> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _users = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    try {
      final response = await _supabase
          .from('profiles')
          .select()
          .order('created_at', ascending: false)
          .limit(50);

      setState(() {
        _users = List<Map<String, dynamic>>.from(response);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredUsers = _users.where((u) {
      final name = (u['full_name'] ?? '').toString().toLowerCase();
      return name.contains(_searchQuery.toLowerCase());
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('User Management')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search users...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: filteredUsers.length,
                    itemBuilder: (context, index) {
                      final user = filteredUsers[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage: user['photo_url'] != null ? NetworkImage(user['photo_url']) : null,
                          child: user['photo_url'] == null ? Text((user['full_name'] ?? 'U')[0]) : null,
                        ),
                        title: Text(user['full_name'] ?? 'Unknown'),
                        subtitle: Text('${user['gender'] ?? ''} • ${user['country'] ?? ''}'),
                        trailing: Chip(
                          label: Text(user['account_status'] ?? 'active'),
                          backgroundColor: user['account_status'] == 'active'
                              ? Colors.green.withOpacity(0.1)
                              : Colors.red.withOpacity(0.1),
                        ),
                        onTap: () => _showUserActions(user),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showUserActions(Map<String, dynamic> user) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.visibility),
              title: const Text('View Profile'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.block),
              title: const Text('Suspend User'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.delete),
              title: const Text('Delete User'),
              textColor: Colors.red,
              iconColor: Colors.red,
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Admin Finance Dashboard
// ============================================================================

class AdminFinanceDashboard extends ConsumerStatefulWidget {
  const AdminFinanceDashboard({super.key});

  @override
  ConsumerState<AdminFinanceDashboard> createState() => _AdminFinanceDashboardState();
}

class _AdminFinanceDashboardState extends ConsumerState<AdminFinanceDashboard> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  Map<String, dynamic> _financeData = {};

  @override
  void initState() {
    super.initState();
    _loadFinanceData();
  }

  Future<void> _loadFinanceData() async {
    try {
      final response = await _supabase
          .from('platform_metrics')
          .select()
          .order('metric_date', ascending: false)
          .limit(1)
          .maybeSingle();

      setState(() {
        _financeData = response ?? {};
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Finance Dashboard')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildFinanceCard('Total Revenue', '₹${_financeData['admin_profit'] ?? 0}', Colors.green),
                  _buildFinanceCard('Men Recharges', '₹${_financeData['men_recharges'] ?? 0}', Colors.blue),
                  _buildFinanceCard('Women Earnings', '₹${_financeData['women_earnings'] ?? 0}', Colors.purple),
                  _buildFinanceCard('Gift Revenue', '₹${_financeData['gift_revenue'] ?? 0}', Colors.orange),
                  _buildFinanceCard('Video Revenue', '₹${_financeData['video_call_revenue'] ?? 0}', Colors.red),
                ],
              ),
            ),
    );
  }

  Widget _buildFinanceCard(String title, String value, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withOpacity(0.1), child: Icon(Icons.currency_rupee, color: color)),
        title: Text(title),
        trailing: Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
      ),
    );
  }
}

// ============================================================================
// Admin Moderation Screen
// ============================================================================

class AdminModerationScreen extends ConsumerStatefulWidget {
  const AdminModerationScreen({super.key});

  @override
  ConsumerState<AdminModerationScreen> createState() => _AdminModerationScreenState();
}

class _AdminModerationScreenState extends ConsumerState<AdminModerationScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _reports = [];

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
    try {
      final response = await _supabase
          .from('moderation_reports')
          .select()
          .eq('status', 'pending')
          .order('created_at', ascending: false)
          .limit(50);

      setState(() {
        _reports = List<Map<String, dynamic>>.from(response);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Content Moderation')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _reports.isEmpty
              ? const Center(child: Text('No pending reports'))
              : ListView.builder(
                  itemCount: _reports.length,
                  itemBuilder: (context, index) {
                    final report = _reports[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.red.withOpacity(0.1),
                          child: const Icon(Icons.flag, color: Colors.red),
                        ),
                        title: Text(report['report_type'] ?? 'Report'),
                        subtitle: Text(report['content'] ?? 'No details'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.check, color: Colors.green),
                              onPressed: () => _handleReport(report['id'], 'approved'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, color: Colors.red),
                              onPressed: () => _handleReport(report['id'], 'rejected'),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Future<void> _handleReport(String id, String action) async {
    try {
      await _supabase.from('moderation_reports').update({
        'status': action == 'approved' ? 'actioned' : 'dismissed',
        'action_taken': action,
        'reviewed_at': DateTime.now().toIso8601String(),
      }).eq('id', id);
      _loadReports();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }
}

// ============================================================================
// Admin Settings Screen
// ============================================================================

class AdminSettingsScreen extends ConsumerWidget {
  const AdminSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Settings')),
      body: ListView(
        children: [
          _buildSection(context, 'Pricing', [
            ListTile(
              leading: const Icon(Icons.chat_bubble),
              title: const Text('Chat Pricing'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.card_giftcard),
              title: const Text('Gift Pricing'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.video_call),
              title: const Text('Video Call Pricing'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ]),
          _buildSection(context, 'System', [
            ListTile(
              leading: const Icon(Icons.backup),
              title: const Text('Backup Management'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.history),
              title: const Text('Audit Logs'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.speed),
              title: const Text('Performance'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ]),
          _buildSection(context, 'Content', [
            ListTile(
              leading: const Icon(Icons.language),
              title: const Text('Language Groups'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.description),
              title: const Text('Legal Documents'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ]),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
        ...children,
      ],
    );
  }
}

// ============================================================================
// Admin Gift Pricing Screen
// ============================================================================

class AdminGiftPricingScreen extends StatelessWidget {
  const AdminGiftPricingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gift Pricing')),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildGiftItem('🌹', 'Rose', 10),
          _buildGiftItem('💎', 'Diamond', 100),
          _buildGiftItem('🎁', 'Gift Box', 50),
          _buildGiftItem('💐', 'Bouquet', 25),
          _buildGiftItem('🧸', 'Teddy Bear', 75),
        ],
      ),
    );
  }

  Widget _buildGiftItem(String emoji, String name, int price) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Text(emoji, style: const TextStyle(fontSize: 32)),
        title: Text(name),
        subtitle: Text('₹$price'),
        trailing: IconButton(icon: const Icon(Icons.edit), onPressed: () {}),
      ),
    );
  }
}

// ============================================================================
// Admin Language Groups Screen
// ============================================================================

class AdminLanguageGroupsScreen extends StatelessWidget {
  const AdminLanguageGroupsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Language Groups')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildLanguageGroup('English', 'en', 1500),
          _buildLanguageGroup('Hindi', 'hi', 2300),
          _buildLanguageGroup('Tamil', 'ta', 800),
          _buildLanguageGroup('Telugu', 'te', 650),
          _buildLanguageGroup('Bengali', 'bn', 450),
        ],
      ),
    );
  }

  Widget _buildLanguageGroup(String name, String code, int members) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(code.toUpperCase())),
        title: Text(name),
        subtitle: Text('$members members'),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

// ============================================================================
// Admin Chat Monitoring Screen
// ============================================================================

class AdminChatMonitoringScreen extends StatelessWidget {
  const AdminChatMonitoringScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat Monitoring')),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Active Chat Sessions'),
            SizedBox(height: 8),
            Text('0 active chats', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Admin Finance Reports Screen
// ============================================================================

class AdminFinanceReportsScreen extends StatelessWidget {
  const AdminFinanceReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Finance Reports')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildReportCard(context, 'Daily Revenue Report', Icons.today),
          _buildReportCard(context, 'Weekly Summary', Icons.date_range),
          _buildReportCard(context, 'Monthly Report', Icons.calendar_month),
          _buildReportCard(context, 'Payout History', Icons.payment),
          _buildReportCard(context, 'Transaction Logs', Icons.receipt_long),
        ],
      ),
    );
  }

  Widget _buildReportCard(BuildContext context, String title, IconData icon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: Theme.of(context).primaryColor),
        title: Text(title),
        trailing: const Icon(Icons.download),
        onTap: () {},
      ),
    );
  }
}

// ============================================================================
// Admin Backup Management Screen
// ============================================================================

class AdminBackupManagementScreen extends StatelessWidget {
  const AdminBackupManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Backup Management')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Last Backup', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    const Text('Never'),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.backup),
                        label: const Text('Create Backup Now'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('Backup History', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: Text('No backups available')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Admin Legal Documents Screen
// ============================================================================

class AdminLegalDocumentsScreen extends StatelessWidget {
  const AdminLegalDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Legal Documents')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildDocumentItem('Terms of Service', 'Last updated: Jan 2025'),
          _buildDocumentItem('Privacy Policy', 'Last updated: Jan 2025'),
          _buildDocumentItem('User Guidelines', 'Last updated: Jan 2025'),
          _buildDocumentItem('Content Policy', 'Last updated: Jan 2025'),
          _buildDocumentItem('GDPR Compliance', 'Last updated: Jan 2025'),
        ],
      ),
    );
  }

  Widget _buildDocumentItem(String title, String subtitle) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.description),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: IconButton(icon: const Icon(Icons.edit), onPressed: () {}),
      ),
    );
  }
}

// ============================================================================
// Admin Chat Pricing Screen
// ============================================================================

class AdminChatPricingScreen extends StatelessWidget {
  const AdminChatPricingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat Pricing')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Current Rates', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 16),
                    _buildPriceRow('Text Chat', '₹5/min'),
                    _buildPriceRow('Video Chat', '₹15/min'),
                    _buildPriceRow('Women Earnings', '60%'),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {},
                        child: const Text('Update Pricing'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

// ============================================================================
// Admin Performance Screen
// ============================================================================

class AdminPerformanceScreen extends StatelessWidget {
  const AdminPerformanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Performance Monitoring')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildMetricCard(context, 'Server Response Time', '45ms', Colors.green),
            _buildMetricCard(context, 'Database Queries/sec', '1,250', Colors.blue),
            _buildMetricCard(context, 'Active WebSocket Connections', '842', Colors.purple),
            _buildMetricCard(context, 'Error Rate', '0.02%', Colors.green),
            _buildMetricCard(context, 'Memory Usage', '68%', Colors.orange),
            _buildMetricCard(context, 'CPU Usage', '42%', Colors.blue),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(BuildContext context, String title, String value, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Admin Audit Logs Screen
// ============================================================================

class AdminAuditLogsScreen extends StatelessWidget {
  const AdminAuditLogsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit Logs'),
        actions: [
          IconButton(icon: const Icon(Icons.filter_list), onPressed: () {}),
          IconButton(icon: const Icon(Icons.download), onPressed: () {}),
        ],
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No audit logs available'),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Admin Policy Alerts Screen
// ============================================================================

class AdminPolicyAlertsScreen extends StatelessWidget {
  const AdminPolicyAlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Policy Alerts')),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.policy, size: 64, color: Colors.green),
            SizedBox(height: 16),
            Text('No policy violations'),
            SizedBox(height: 8),
            Text('All users are compliant', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Admin Language Limits Screen
// ============================================================================

class AdminLanguageLimitsScreen extends StatelessWidget {
  const AdminLanguageLimitsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Language Limits')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Global Settings', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  _buildLimitRow('Max languages per user', '5'),
                  _buildLimitRow('Min proficiency required', 'Basic'),
                  _buildLimitRow('Auto-translate enabled', 'Yes'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLimitRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

// ============================================================================
// Admin Transaction History Screen
// ============================================================================

class AdminTransactionHistoryScreen extends StatelessWidget {
  const AdminTransactionHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transaction History'),
        actions: [
          IconButton(icon: const Icon(Icons.filter_list), onPressed: () {}),
          IconButton(icon: const Icon(Icons.download), onPressed: () {}),
        ],
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No transactions yet'),
          ],
        ),
      ),
    );
  }
}
