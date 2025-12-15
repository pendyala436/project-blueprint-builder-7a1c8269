import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/models/wallet_model.dart';
import '../../shared/models/gift_model.dart';

/// Wallet Service Provider
final walletServiceProvider = Provider<WalletService>((ref) {
  return WalletService();
});

/// Wallet Service
/// 
/// Handles all wallet and transaction operations.
class WalletService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Get user's wallet
  Future<WalletModel?> getWallet(String userId) async {
    try {
      final response = await _client
          .from('wallets')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (response == null) return null;

      return WalletModel(
        id: response['id'],
        userId: response['user_id'],
        balance: (response['balance'] as num?)?.toDouble() ?? 0,
        currency: response['currency'] ?? 'INR',
        createdAt: response['created_at'] != null
            ? DateTime.parse(response['created_at'])
            : null,
        updatedAt: response['updated_at'] != null
            ? DateTime.parse(response['updated_at'])
            : null,
      );
    } catch (e) {
      return null;
    }
  }

  /// Get wallet transactions
  Future<List<WalletTransactionModel>> getTransactions(String userId, {int limit = 50}) async {
    try {
      final response = await _client
          .from('wallet_transactions')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit);

      return (response as List)
          .map((json) => WalletTransactionModel(
                id: json['id'],
                walletId: json['wallet_id'],
                userId: json['user_id'],
                type: json['type'],
                amount: (json['amount'] as num).toDouble(),
                description: json['description'],
                referenceId: json['reference_id'],
                status: json['status'] ?? 'completed',
                createdAt: json['created_at'] != null
                    ? DateTime.parse(json['created_at'])
                    : null,
              ))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Process wallet transaction (via database function)
  Future<TransactionResult> processTransaction({
    required String userId,
    required double amount,
    required String type,
    String? description,
  }) async {
    try {
      final response = await _client.rpc('process_wallet_transaction', params: {
        'p_user_id': userId,
        'p_amount': amount,
        'p_type': type,
        'p_description': description,
      });

      final data = response as Map<String, dynamic>;
      return TransactionResult(
        success: data['success'] ?? false,
        transactionId: data['transaction_id'],
        previousBalance: (data['previous_balance'] as num?)?.toDouble(),
        newBalance: (data['new_balance'] as num?)?.toDouble(),
        error: data['error'],
      );
    } catch (e) {
      return TransactionResult(success: false, error: e.toString());
    }
  }

  /// Process transfer between users
  Future<TransactionResult> processTransfer({
    required String fromUserId,
    required String toUserId,
    required double amount,
    String? description,
  }) async {
    try {
      final response = await _client.rpc('process_atomic_transfer', params: {
        'p_from_user_id': fromUserId,
        'p_to_user_id': toUserId,
        'p_amount': amount,
        'p_description': description,
      });

      final data = response as Map<String, dynamic>;
      return TransactionResult(
        success: data['success'] ?? false,
        transactionId: data['from_transaction_id'],
        previousBalance: (data['from_previous_balance'] as num?)?.toDouble(),
        newBalance: (data['from_new_balance'] as num?)?.toDouble(),
        error: data['error'],
      );
    } catch (e) {
      return TransactionResult(success: false, error: e.toString());
    }
  }

  /// Get available gifts
  Future<List<GiftModel>> getGifts() async {
    try {
      final response = await _client
          .from('gifts')
          .select()
          .eq('is_active', true)
          .order('sort_order', ascending: true);

      return (response as List)
          .map((json) => GiftModel(
                id: json['id'],
                name: json['name'],
                emoji: json['emoji'] ?? '🎁',
                price: (json['price'] as num?)?.toDouble() ?? 0,
                currency: json['currency'] ?? 'INR',
                category: json['category'] ?? 'general',
                description: json['description'],
                isActive: json['is_active'] ?? true,
                sortOrder: json['sort_order'] ?? 0,
              ))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Send gift
  Future<TransactionResult> sendGift({
    required String senderId,
    required String receiverId,
    required String giftId,
    String? message,
  }) async {
    try {
      final response = await _client.rpc('process_gift_transaction', params: {
        'p_sender_id': senderId,
        'p_receiver_id': receiverId,
        'p_gift_id': giftId,
        'p_message': message,
      });

      final data = response as Map<String, dynamic>;
      return TransactionResult(
        success: data['success'] ?? false,
        transactionId: data['gift_transaction_id'],
        previousBalance: (data['previous_balance'] as num?)?.toDouble(),
        newBalance: (data['new_balance'] as num?)?.toDouble(),
        error: data['error'],
      );
    } catch (e) {
      return TransactionResult(success: false, error: e.toString());
    }
  }

  /// Get women's earnings
  Future<List<WomenEarningsModel>> getWomenEarnings(String userId, {int limit = 50}) async {
    try {
      final response = await _client
          .from('women_earnings')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit);

      return (response as List)
          .map((json) => WomenEarningsModel(
                id: json['id'],
                userId: json['user_id'],
                amount: (json['amount'] as num).toDouble(),
                earningType: json['earning_type'],
                chatSessionId: json['chat_session_id'],
                description: json['description'],
                createdAt: json['created_at'] != null
                    ? DateTime.parse(json['created_at'])
                    : null,
              ))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Request withdrawal
  Future<TransactionResult> requestWithdrawal({
    required String userId,
    required double amount,
    String? paymentMethod,
    Map<String, dynamic>? paymentDetails,
  }) async {
    try {
      final response = await _client.rpc('process_withdrawal_request', params: {
        'p_user_id': userId,
        'p_amount': amount,
        'p_payment_method': paymentMethod,
        'p_payment_details': paymentDetails,
      });

      final data = response as Map<String, dynamic>;
      return TransactionResult(
        success: data['success'] ?? false,
        transactionId: data['withdrawal_id'],
        previousBalance: (data['previous_balance'] as num?)?.toDouble(),
        newBalance: (data['new_balance'] as num?)?.toDouble(),
        error: data['error'],
      );
    } catch (e) {
      return TransactionResult(success: false, error: e.toString());
    }
  }

  /// Subscribe to wallet changes
  RealtimeChannel subscribeToWallet(
    String userId,
    void Function(WalletModel wallet) onUpdate,
  ) {
    return _client.channel('wallet:$userId').onPostgresChanges(
      event: PostgresChangeEvent.update,
      schema: 'public',
      table: 'wallets',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'user_id',
        value: userId,
      ),
      callback: (payload) {
        final json = payload.newRecord;
        onUpdate(WalletModel(
          id: json['id'],
          userId: json['user_id'],
          balance: (json['balance'] as num).toDouble(),
          currency: json['currency'] ?? 'INR',
        ));
      },
    ).subscribe();
  }
}
