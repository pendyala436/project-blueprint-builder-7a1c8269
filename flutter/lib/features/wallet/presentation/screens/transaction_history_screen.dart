import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/services/wallet_service.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/models/wallet_model.dart';
import '../../../../shared/widgets/common_widgets.dart';
import '../../../../core/theme/app_colors.dart';

/// Transaction History Screen - Synced with React TransactionHistoryScreen
class TransactionHistoryScreen extends ConsumerStatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  ConsumerState<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends ConsumerState<TransactionHistoryScreen> {
  List<WalletTransactionModel> _transactions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    final userId = ref.read(authServiceProvider).currentUser?.id;
    if (userId == null) return;

    setState(() => _isLoading = true);
    final txns = await ref.read(walletServiceProvider).getTransactions(userId, limit: 100);
    if (mounted) setState(() { _transactions = txns; _isLoading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transaction History')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _transactions.isEmpty
              ? const EmptyState(icon: Icons.receipt_long, title: 'No transactions yet')
              : RefreshIndicator(
                  onRefresh: _loadTransactions,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _transactions.length,
                    itemBuilder: (context, index) {
                      final tx = _transactions[index];
                      final isCredit = tx.type == 'credit';
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isCredit ? AppColors.success.withOpacity(0.1) : AppColors.destructive.withOpacity(0.1),
                          child: Icon(
                            isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                            color: isCredit ? AppColors.success : AppColors.destructive,
                          ),
                        ),
                        title: Text(tx.description ?? tx.type),
                        subtitle: Text(tx.createdAt?.toString().substring(0, 16) ?? ''),
                        trailing: Text(
                          '${isCredit ? '+' : '-'}₹${tx.amount.toStringAsFixed(2)}',
                          style: TextStyle(
                            color: isCredit ? AppColors.success : AppColors.destructive,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
