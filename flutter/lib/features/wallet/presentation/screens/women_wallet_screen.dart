import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/wallet_service.dart';

class WomenWalletScreen extends ConsumerStatefulWidget {
  const WomenWalletScreen({super.key});

  @override
  ConsumerState<WomenWalletScreen> createState() => _WomenWalletScreenState();
}

class _WomenWalletScreenState extends ConsumerState<WomenWalletScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  double _balance = 0;
  double _pendingWithdrawal = 0;
  double _todayEarnings = 0;
  double _weekEarnings = 0;
  double _monthEarnings = 0;
  List<Map<String, dynamic>> _recentEarnings = [];
  Map<String, dynamic>? _pricingConfig;

  @override
  void initState() {
    super.initState();
    _loadWalletData();
  }

  Future<void> _loadWalletData() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Load wallet balance
      final walletResponse = await _supabase
          .from('wallets')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      // Load pricing config
      final pricingResponse = await _supabase
          .from('chat_pricing')
          .select()
          .eq('is_active', true)
          .maybeSingle();

      // Load recent earnings
      final earningsResponse = await _supabase
          .from('wallet_transactions')
          .select()
          .eq('user_id', userId)
          .eq('type', 'chat_earning')
          .order('created_at', ascending: false)
          .limit(10);

      // Load pending withdrawals
      final withdrawalResponse = await _supabase
          .from('wallet_transactions')
          .select()
          .eq('user_id', userId)
          .eq('type', 'withdrawal')
          .eq('status', 'pending')
          .limit(10);

      final pendingAmount = withdrawalResponse.fold<double>(
        0,
        (sum, w) => sum + (w['amount'] ?? 0).toDouble(),
      );

      // Calculate earnings
      final now = DateTime.now();
      final startOfDay = DateTime(now.year, now.month, now.day);
      final startOfWeek = startOfDay.subtract(Duration(days: now.weekday - 1));
      final startOfMonth = DateTime(now.year, now.month, 1);

      final earningsList = List<Map<String, dynamic>>.from(earningsResponse);
      
      double todayEarn = 0;
      double weekEarn = 0;
      double monthEarn = 0;

      for (final earning in earningsList) {
        final date = DateTime.tryParse(earning['created_at'] ?? '');
        final amount = (earning['amount'] ?? 0).toDouble();
        
        if (date != null) {
          if (date.isAfter(startOfDay)) todayEarn += amount;
          if (date.isAfter(startOfWeek)) weekEarn += amount;
          if (date.isAfter(startOfMonth)) monthEarn += amount;
        }
      }

      setState(() {
        _balance = (walletResponse?['balance'] ?? 0).toDouble();
        _pendingWithdrawal = pendingAmount;
        _todayEarnings = todayEarn;
        _weekEarnings = weekEarn;
        _monthEarnings = monthEarn;
        _recentEarnings = earningsList;
        _pricingConfig = pricingResponse;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading wallet: $e')),
        );
      }
    }
  }

  Future<void> _requestWithdrawal() async {
    final minWithdrawal = (_pricingConfig?['min_withdrawal_balance'] ?? 500).toDouble();
    
    if (_balance < minWithdrawal) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Minimum withdrawal amount is ₹${minWithdrawal.toStringAsFixed(0)}'),
        ),
      );
      return;
    }

    final amountController = TextEditingController();
    final upiController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request Withdrawal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Available Balance: ₹${_balance.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: amountController,
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixText: '₹ ',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: upiController,
              decoration: const InputDecoration(
                labelText: 'UPI ID',
                hintText: 'example@upi',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Minimum withdrawal: ₹${minWithdrawal.toStringAsFixed(0)}',
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountController.text) ?? 0;
              
              if (amount < minWithdrawal) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Minimum withdrawal is ₹${minWithdrawal.toStringAsFixed(0)}'),
                  ),
                );
                return;
              }

              if (amount > _balance) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Insufficient balance')),
                );
                return;
              }

              if (upiController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter UPI ID')),
                );
                return;
              }

              try {
                final userId = _supabase.auth.currentUser?.id;
                await _supabase.from('wallet_transactions').insert({
                  'user_id': userId,
                  'type': 'withdrawal',
                  'amount': amount,
                  'status': 'pending',
                  'description': 'Withdrawal to ${upiController.text}',
                });

                Navigator.pop(context);
                _loadWalletData();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Withdrawal request submitted successfully'),
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error: $e')),
                );
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Earnings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadWalletData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadWalletData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Balance Card
                    _buildBalanceCard(),
                    const SizedBox(height: 20),

                    // Earnings Summary
                    _buildEarningsSummary(),
                    const SizedBox(height: 20),

                    // Earning Rate Info
                    _buildEarningRateInfo(),
                    const SizedBox(height: 20),

                    // Recent Earnings
                    _buildRecentEarnings(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildBalanceCard() {
    return Card(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Available Balance',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Text(
              '₹${_balance.toStringAsFixed(2)}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (_pendingWithdrawal > 0) ...[
              const SizedBox(height: 8),
              Text(
                'Pending Withdrawal: ₹${_pendingWithdrawal.toStringAsFixed(2)}',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _requestWithdrawal,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Withdraw Earnings'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningsSummary() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Earnings Summary',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildEarningCard(
                'Today',
                '₹${_todayEarnings.toStringAsFixed(0)}',
                Icons.today,
                Colors.green,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildEarningCard(
                'This Week',
                '₹${_weekEarnings.toStringAsFixed(0)}',
                Icons.date_range,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildEarningCard(
                'This Month',
                '₹${_monthEarnings.toStringAsFixed(0)}',
                Icons.calendar_month,
                Colors.purple,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEarningCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningRateInfo() {
    final chatRate = (_pricingConfig?['women_earning_rate'] ?? 0).toDouble();
    final videoRate = (_pricingConfig?['video_women_earning_rate'] ?? 0).toDouble();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your Earning Rates',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.blue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.chat, color: Colors.blue),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Chat', style: TextStyle(fontSize: 12)),
                          Text(
                            '₹${chatRate.toStringAsFixed(2)}/min',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.purple.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.video_call, color: Colors.purple),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Video', style: TextStyle(fontSize: 12)),
                          Text(
                            '₹${videoRate.toStringAsFixed(2)}/min',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentEarnings() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Earnings',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () {
                // Navigate to full transaction history
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_recentEarnings.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.monetization_on, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text(
                      'No earnings yet',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Start chatting to earn money!',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          Card(
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _recentEarnings.length > 5 ? 5 : _recentEarnings.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final earning = _recentEarnings[index];
                final date = DateTime.tryParse(earning['created_at'] ?? '');
                final amount = (earning['amount'] ?? 0).toDouble();

                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.green.withOpacity(0.1),
                    child: const Icon(Icons.add, color: Colors.green),
                  ),
                  title: Text(earning['description'] ?? 'Chat Earning'),
                  subtitle: date != null
                      ? Text(
                          DateFormat('MMM d, h:mm a').format(date),
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        )
                      : null,
                  trailing: Text(
                    '+₹${amount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
