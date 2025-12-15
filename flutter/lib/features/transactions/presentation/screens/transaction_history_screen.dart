import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';

class TransactionHistoryScreen extends ConsumerStatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  ConsumerState<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends ConsumerState<TransactionHistoryScreen>
    with SingleTickerProviderStateMixin {
  final _supabase = Supabase.instance.client;
  late TabController _tabController;
  bool _isLoading = true;
  List<Map<String, dynamic>> _allTransactions = [];
  List<Map<String, dynamic>> _deposits = [];
  List<Map<String, dynamic>> _withdrawals = [];
  List<Map<String, dynamic>> _chatCharges = [];
  List<Map<String, dynamic>> _giftTransactions = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadTransactions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTransactions() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Load wallet transactions
      final walletTransactions = await _supabase
          .from('wallet_transactions')
          .select()
          .or('user_id.eq.$userId,recipient_id.eq.$userId')
          .order('created_at', ascending: false)
          .limit(100);

      // Load gift transactions
      final giftTxns = await _supabase
          .from('gift_transactions')
          .select('*, gifts(*)')
          .or('sender_id.eq.$userId,receiver_id.eq.$userId')
          .order('created_at', ascending: false)
          .limit(50);

      final allTxns = List<Map<String, dynamic>>.from(walletTransactions);
      
      setState(() {
        _allTransactions = allTxns;
        _deposits = allTxns.where((t) => t['type'] == 'deposit' || t['type'] == 'add_money').toList();
        _withdrawals = allTxns.where((t) => t['type'] == 'withdrawal').toList();
        _chatCharges = allTxns.where((t) => t['type'] == 'chat_charge' || t['type'] == 'chat_earning').toList();
        _giftTransactions = List<Map<String, dynamic>>.from(giftTxns);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading transactions: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transaction History'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Deposits'),
            Tab(text: 'Withdrawals'),
            Tab(text: 'Chat'),
            Tab(text: 'Gifts'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildTransactionList(_allTransactions),
                _buildTransactionList(_deposits),
                _buildTransactionList(_withdrawals),
                _buildTransactionList(_chatCharges),
                _buildGiftTransactionList(_giftTransactions),
              ],
            ),
    );
  }

  Widget _buildTransactionList(List<Map<String, dynamic>> transactions) {
    if (transactions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No transactions yet',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTransactions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: transactions.length,
        itemBuilder: (context, index) {
          final txn = transactions[index];
          return _buildTransactionCard(txn);
        },
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> txn) {
    final type = txn['type'] as String? ?? 'unknown';
    final amount = (txn['amount'] ?? 0).toDouble();
    final date = DateTime.tryParse(txn['created_at'] ?? '');
    final description = txn['description'] as String?;
    final status = txn['status'] as String? ?? 'completed';

    final isCredit = type == 'deposit' || 
                     type == 'add_money' || 
                     type == 'chat_earning' ||
                     type == 'gift_received';

    IconData icon;
    Color iconColor;
    
    switch (type) {
      case 'deposit':
      case 'add_money':
        icon = Icons.add_circle;
        iconColor = Colors.green;
        break;
      case 'withdrawal':
        icon = Icons.remove_circle;
        iconColor = Colors.red;
        break;
      case 'chat_charge':
        icon = Icons.chat_bubble;
        iconColor = Colors.blue;
        break;
      case 'chat_earning':
        icon = Icons.chat_bubble;
        iconColor = Colors.green;
        break;
      case 'gift_sent':
        icon = Icons.card_giftcard;
        iconColor = Colors.purple;
        break;
      case 'gift_received':
        icon = Icons.card_giftcard;
        iconColor = Colors.pink;
        break;
      case 'video_call':
        icon = Icons.video_call;
        iconColor = Colors.orange;
        break;
      default:
        icon = Icons.receipt;
        iconColor = Colors.grey;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withOpacity(0.1),
          child: Icon(icon, color: iconColor),
        ),
        title: Text(
          _formatTransactionType(type),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (description != null && description.isNotEmpty)
              Text(
                description,
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            if (date != null)
              Text(
                DateFormat('MMM d, yyyy • h:mm a').format(date),
                style: TextStyle(color: Colors.grey[500], fontSize: 11),
              ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${isCredit ? '+' : '-'}₹${amount.toStringAsFixed(2)}',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isCredit ? Colors.green : Colors.red,
              ),
            ),
            if (status != 'completed')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: status == 'pending'
                      ? Colors.orange.withOpacity(0.1)
                      : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 9,
                    color: status == 'pending' ? Colors.orange : Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        ),
        onTap: () => _showTransactionDetails(txn),
      ),
    );
  }

  Widget _buildGiftTransactionList(List<Map<String, dynamic>> transactions) {
    if (transactions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.card_giftcard, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No gift transactions yet',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    final userId = _supabase.auth.currentUser?.id;

    return RefreshIndicator(
      onRefresh: _loadTransactions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: transactions.length,
        itemBuilder: (context, index) {
          final txn = transactions[index];
          final gift = txn['gifts'] as Map<String, dynamic>?;
          final isSent = txn['sender_id'] == userId;
          final date = DateTime.tryParse(txn['created_at'] ?? '');

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isSent
                    ? Colors.purple.withOpacity(0.1)
                    : Colors.pink.withOpacity(0.1),
                child: Text(
                  gift?['emoji'] ?? '🎁',
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              title: Text(
                gift?['name'] ?? 'Gift',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isSent ? 'Sent' : 'Received',
                    style: TextStyle(
                      color: isSent ? Colors.purple : Colors.pink,
                      fontSize: 12,
                    ),
                  ),
                  if (date != null)
                    Text(
                      DateFormat('MMM d, yyyy • h:mm a').format(date),
                      style: TextStyle(color: Colors.grey[500], fontSize: 11),
                    ),
                ],
              ),
              trailing: Text(
                '₹${(txn['price_paid'] ?? 0).toStringAsFixed(0)}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isSent ? Colors.purple : Colors.pink,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  String _formatTransactionType(String type) {
    switch (type) {
      case 'deposit':
      case 'add_money':
        return 'Money Added';
      case 'withdrawal':
        return 'Withdrawal';
      case 'chat_charge':
        return 'Chat Charge';
      case 'chat_earning':
        return 'Chat Earning';
      case 'gift_sent':
        return 'Gift Sent';
      case 'gift_received':
        return 'Gift Received';
      case 'video_call':
        return 'Video Call';
      case 'transfer':
        return 'Transfer';
      default:
        return type.replaceAll('_', ' ').toUpperCase();
    }
  }

  void _showTransactionDetails(Map<String, dynamic> txn) {
    final date = DateTime.tryParse(txn['created_at'] ?? '');
    
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Transaction Details',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 20),
            _buildDetailRow('Type', _formatTransactionType(txn['type'] ?? '')),
            _buildDetailRow('Amount', '₹${(txn['amount'] ?? 0).toStringAsFixed(2)}'),
            _buildDetailRow('Status', (txn['status'] ?? 'completed').toUpperCase()),
            if (date != null)
              _buildDetailRow('Date', DateFormat('MMM d, yyyy h:mm a').format(date)),
            if (txn['description'] != null)
              _buildDetailRow('Description', txn['description']),
            if (txn['id'] != null)
              _buildDetailRow('Transaction ID', txn['id'].toString().substring(0, 8)),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
