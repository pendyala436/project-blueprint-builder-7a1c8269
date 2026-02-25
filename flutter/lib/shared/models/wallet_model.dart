/// Wallet Model
class WalletModel {
  final String id;
  final String userId;
  final double balance;
  final String currency;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const WalletModel({
    required this.id,
    required this.userId,
    this.balance = 0,
    this.currency = 'INR',
    this.createdAt,
    this.updatedAt,
  });
}

/// Wallet Transaction Model
class WalletTransactionModel {
  final String id;
  final String walletId;
  final String userId;
  final String type; // 'credit' or 'debit'
  final double amount;
  final String? description;
  final String? referenceId;
  final String status;
  final DateTime? createdAt;

  const WalletTransactionModel({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.type,
    required this.amount,
    this.description,
    this.referenceId,
    this.status = 'completed',
    this.createdAt,
  });
}

/// Women Earnings Model
class WomenEarningsModel {
  final String id;
  final String userId;
  final double amount;
  final String earningType; // 'chat', 'video_call', 'gift'
  final String? chatSessionId;
  final String? description;
  final DateTime? createdAt;

  const WomenEarningsModel({
    required this.id,
    required this.userId,
    required this.amount,
    required this.earningType,
    this.chatSessionId,
    this.description,
    this.createdAt,
  });
}

/// Withdrawal Request Model
class WithdrawalRequestModel {
  final String id;
  final String userId;
  final double amount;
  final String? paymentMethod;
  final Map<String, dynamic>? paymentDetails;
  final String status;
  final String? processedBy;
  final DateTime? processedAt;
  final String? notes;
  final DateTime? createdAt;

  const WithdrawalRequestModel({
    required this.id,
    required this.userId,
    required this.amount,
    this.paymentMethod,
    this.paymentDetails,
    this.status = 'pending',
    this.processedBy,
    this.processedAt,
    this.notes,
    this.createdAt,
  });
}

/// Transaction Result
class TransactionResult {
  final bool success;
  final String? transactionId;
  final double? previousBalance;
  final double? newBalance;
  final String? error;

  const TransactionResult({
    required this.success,
    this.transactionId,
    this.previousBalance,
    this.newBalance,
    this.error,
  });
}
